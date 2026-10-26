import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.config import config
from app.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()

def test_health_check_gemma_model():
    """Verify that health check reports the verified Gemma 4 model identifier."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert config.GEMMA_MODEL_NAME in data["model_name"]
    assert data["is_open_weight"] is True

def test_auth_workflow_registration_and_login():
    """Test user registration, secure password hashing, and token issuance."""
    test_email = "scholar.test@knowlix.ai"
    test_pass = "SecurePass2026!"
    
    # 1. Register student
    reg_res = client.post("/api/auth/register", json={
        "name": "Jane Scholar",
        "email": test_email,
        "password": test_pass
    })
    # If already registered from previous run, login instead
    if reg_res.status_code == 200:
        auth_data = reg_res.json()
        assert "access_token" in auth_data
        assert auth_data["user"]["role"] == "student"
        token = auth_data["access_token"]
    else:
        assert reg_res.status_code == 409
        # 2. Login
        login_res = client.post("/api/auth/login", json={
            "email": test_email,
            "password": test_pass
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    # 3. Access protected /me route
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["email"] == test_email
    assert user_info["role"] == "student"

def test_admin_login():
    """Test login for pre-seeded administrator."""
    res = client.post("/api/auth/login", json={
        "email": "admin@knowlix.ai",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "admin"
    assert "access_token" in data

def test_student_contribution_moderation_queue_and_public_visibility():
    """
    Critical security test:
    1. Student uploads a note.
    2. Note status is 'pending'.
    3. Note is NOT visible on public /api/explore/notes.
    4. Student cannot access /api/admin/notes (403 Forbidden).
    5. Admin reviews and approves the note.
    6. Note becomes visible on public /api/explore/notes.
    """
    # 1. Login as Student
    s_login = client.post("/api/auth/login", json={
        "email": "student@knowlix.ai",
        "password": "StudentPass123!"
    })
    assert s_login.status_code == 200
    s_token = s_login.json()["access_token"]

    # 2. Student contributes a study note (text-based PDF)
    fake_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    upload_res = client.post(
        "/api/explore/notes/contribute",
        data={
            "title": "Machine Learning Neural Network Fundamentals",
            "subject": "Computer Science",
            "category": "Artificial Intelligence",
            "description": "Backpropagation gradient descent notes.",
            "tags": "[\"Deep Learning\", \"Neural Networks\"]"
        },
        files={
            "file": ("nn_notes.pdf", io.BytesIO(fake_pdf), "application/pdf")
        },
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert upload_res.status_code == 200
    note_data = upload_res.json()
    note_id = note_data["id"]
    # Student submission must be 'pending' review
    assert note_data["status"] == "pending"

    # 3. Check public explore: pending note must NOT appear
    public_res = client.get("/api/explore/notes?search=Neural Network")
    assert public_res.status_code == 200
    matched = [n for n in public_res.json()["notes"] if n["id"] == note_id]
    assert len(matched) == 0, "Security violation: Pending note was visible in public collection!"

    # 4. Student tries to access admin moderation endpoint: must receive 403 Forbidden
    hack_res = client.get("/api/admin/notes", headers={"Authorization": f"Bearer {s_token}"})
    assert hack_res.status_code == 403

    # 5. Admin logs in
    a_login = client.post("/api/auth/login", json={
        "email": "admin@knowlix.ai",
        "password": "AdminPass123!"
    })
    a_token = a_login.json()["access_token"]

    # 6. Admin inspects queue and approves note
    admin_queue = client.get("/api/admin/notes?status=pending", headers={"Authorization": f"Bearer {a_token}"})
    assert admin_queue.status_code == 200
    assert any(n["id"] == note_id for n in admin_queue.json())

    approve_res = client.post(
        f"/api/admin/notes/{note_id}/moderate",
        json={"action": "approve"},
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "published"

    # 7. Now note MUST appear in public explore collection
    public_after = client.get("/api/explore/notes?search=Neural Network")
    assert public_after.status_code == 200
    matched_after = [n for n in public_after.json()["notes"] if n["id"] == note_id]
    assert len(matched_after) == 1
    assert matched_after[0]["title"] == "Machine Learning Neural Network Fundamentals"

def test_admin_folder_management():
    """Test creating, organizing, and managing note folders."""
    a_login = client.post("/api/auth/login", json={
        "email": "admin@knowlix.ai",
        "password": "AdminPass123!"
    })
    a_token = a_login.json()["access_token"]

    # 1. Create Folder
    create_f = client.post(
        "/api/admin/folders",
        json={
            "name": "Robotics & Embedded Systems",
            "description": "Microcontrollers and kinematics.",
            "color": "sky"
        },
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert create_f.status_code == 200
    f_data = create_f.json()
    f_id = f_data["id"]
    assert f_data["name"] == "Robotics & Embedded Systems"

    # 2. Public folders list contains new folder
    pub_folders = client.get("/api/explore/folders")
    assert pub_folders.status_code == 200
    assert any(f["id"] == f_id for f in pub_folders.json())

    # 3. Delete folder
    del_f = client.delete(f"/api/admin/folders/{f_id}", headers={"Authorization": f"Bearer {a_token}"})
    assert del_f.status_code == 200
