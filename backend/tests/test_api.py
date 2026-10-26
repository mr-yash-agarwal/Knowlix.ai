import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

def create_test_image_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_provider" in data
    assert data["is_open_weight"] is True
    assert "model_license" in data

def test_empty_image_upload_rejected():
    files = {"file": ("empty.png", b"", "image/png")}
    response = client.post("/api/analyze-notes", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_invalid_mime_type_rejected():
    files = {"file": ("malicious.exe", b"not-an-image", "application/x-msdownload")}
    response = client.post("/api/analyze-notes", files=files)
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["detail"].lower()

def test_full_analysis_and_quiz_workflow():
    # 1. Upload valid image
    img_bytes = create_test_image_bytes()
    files = {"file": ("photosynthesis_test.png", img_bytes, "image/png")}
    data = {"subject": "Biology", "topic": "Photosynthesis"}
    
    res = client.post("/api/analyze-notes", files=files, data=data)
    assert res.status_code == 200
    analysis = res.json()
    assert "session_id" in analysis
    assert len(analysis["key_concepts"]) >= 3
    assert len(analysis["definitions"]) >= 2
    session_id = analysis["session_id"]

    # 2. Generate Quiz
    quiz_res = client.post("/api/generate-quiz", data={"session_id": session_id})
    assert quiz_res.status_code == 200
    quiz_data = quiz_res.json()
    assert len(quiz_data["questions"]) == 5
    first_q = quiz_data["questions"][0]
    second_q = quiz_data["questions"][1]

    # 3. Submit quiz with intentional wrong answer
    # Choose correct for Q1, incorrect for Q2
    submission = {
        "session_id": session_id,
        "answers": [
            {"question_id": first_q["id"], "selected_option": first_q["correct_answer"]},
            {"question_id": second_q["id"], "selected_option": "Totally Wrong Option"}
        ],
        "quiz_items": quiz_data["questions"]
    }
    submit_res = client.post("/api/submit-quiz", json=submission)
    assert submit_res.status_code == 200
    eval_data = submit_res.json()
    assert eval_data["total_questions"] == 5
    assert eval_data["correct_count"] == 1
    assert len(eval_data["missed_concepts"]) == 1
    missed = eval_data["missed_concepts"][0]
    assert missed["student_answer"] == "Totally Wrong Option"
    assert missed["practice_question"] is not None

    # 4. Signature feature: Teach Me What I Missed
    teach_res = client.post("/api/teach-missed", json={
        "session_id": session_id,
        "concept": missed["concept"],
        "simplification_level": "eli5"
    })
    assert teach_res.status_code == 200
    teach_data = teach_res.json()
    assert teach_data["concept"] == missed["concept"]
    assert len(teach_data["simpler_explanation"]) > 20
    assert len(teach_data["real_world_example"]) > 10

    # 5. Retry follow-up question
    retry_res = client.post("/api/retry-missed", json={
        "session_id": session_id,
        "concept": missed["concept"],
        "question_id": teach_data["practice_question"]["id"],
        "selected_option": teach_data["practice_question"]["correct_answer"],
        "expected_answer": teach_data["practice_question"]["correct_answer"]
    })
    assert retry_res.status_code == 200
    retry_data = retry_res.json()
    assert retry_data["is_correct"] is True
    assert retry_data["updated_mastery"] == "Mastered"

def create_test_pdf_bytes():
    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), "PHOTOSYNTHESIS & PLANT PHYSIOLOGY\nLight-dependent reactions occur in thylakoid membranes.\nPhotolysis of water produces oxygen, electrons, and protons.\nATP Synthase drives photophosphorylation via proton motive force.")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_pdf_upload_and_analysis_workflow():
    pdf_bytes = create_test_pdf_bytes()
    files = {"file": ("biology_lecture.pdf", pdf_bytes, "application/pdf")}
    data = {"subject": "Biology", "topic": "Photosynthesis", "page_range": "1"}
    
    res = client.post("/api/analyze-notes", files=files, data=data)
    assert res.status_code == 200
    analysis = res.json()
    assert "session_id" in analysis
    assert analysis["document_type"] == "pdf"
    assert analysis["page_count"] >= 1
    assert len(analysis["key_concepts"]) >= 3
    assert len(analysis["definitions"]) >= 1
    assert "image_preview" in analysis

def test_pdf_invalid_signature_rejected():
    files = {"file": ("corrupted.pdf", b"ThisIsNotAPdfHeader12345", "application/pdf")}
    res = client.post("/api/analyze-notes", files=files)
    assert res.status_code == 400
    assert "invalid pdf" in res.json()["detail"].lower()

def test_assistant_ask_text_and_voice():
    # Ask the study assistant a question
    payload = {
        "session_id": "test-session-123",
        "question": "What is the primary role of water photolysis in photosynthesis?",
        "is_voice": True,
        "language": "en-US"
    }
    res = client.post("/api/assistant/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert data["is_voice"] is True
    assert "model_used" in data

