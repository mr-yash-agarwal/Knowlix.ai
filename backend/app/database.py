import sqlite3
import json
import os
import hashlib
import secrets
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.config import config

def get_db_connection():
    db_path = config.DATABASE_PATH
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Password Hashing Helpers using PBKDF2-HMAC-SHA256 (NIST compliant, zero extra dependencies)
def hash_password(password: str, salt_hex: Optional[str] = None) -> tuple[str, str]:
    if not salt_hex:
        salt = secrets.token_bytes(16)
        salt_hex = salt.hex()
    else:
        salt = bytes.fromhex(salt_hex)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return key.hex(), salt_hex

def verify_password(plain_password: str, password_hash: str, salt_hex: str) -> bool:
    computed_hash, _ = hash_password(plain_password, salt_hex)
    return hmac_compare(computed_hash, password_hash)

def hmac_compare(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Sessions table (Preserved)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        created_at TEXT NOT NULL,
        image_preview TEXT,
        summary_json TEXT,
        quiz_json TEXT,
        flashcards_json TEXT,
        quiz_score INTEGER,
        total_questions INTEGER,
        flashcards_reviewed INTEGER DEFAULT 0
    )
    ''')
    
    # 2. Concept mastery tracking table (Preserved)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS concept_mastery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        concept TEXT NOT NULL,
        mastery_status TEXT NOT NULL, -- 'Needs Practice', 'Improving', 'Mastered'
        attempts_count INTEGER DEFAULT 1,
        correct_count INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(session_id, concept)
    )
    ''')

    # 3. Users table (Students and Administrators)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'admin'
        created_at TEXT NOT NULL
    )
    ''')

    # 4. Folders table (Organizing public educational resources)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT 'indigo',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    ''')

    # 5. Community Notes table (Public & Student Contributed Notes)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS community_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        tags_json TEXT DEFAULT '[]',
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_data TEXT,
        preview_image TEXT,
        extracted_summary TEXT,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'published' | 'rejected' | 'archived'
        folder_id TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        rejection_reason TEXT,
        views_count INTEGER DEFAULT 0,
        downloads_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users (id)
    )
    ''')

    # 6. Dynamic Quiz Attempts table (Tracks each fresh quiz attempt, difficulty, and scores)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT,
        attempt_number INTEGER NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'medium',
        quiz_length INTEGER NOT NULL DEFAULT 5,
        question_types_json TEXT DEFAULT '["mcq"]',
        score INTEGER,
        total_questions INTEGER,
        score_percentage INTEGER,
        is_perfect INTEGER DEFAULT 0,
        questions_json TEXT NOT NULL,
        student_answers_json TEXT,
        review_json TEXT,
        is_fresh INTEGER DEFAULT 1,
        material_scope_note TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    ''')

    # 7. Served Question History table (Prevents repeating questions across consecutive attempts)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS question_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        attempt_id TEXT,
        question_text TEXT NOT NULL,
        concept TEXT,
        difficulty TEXT,
        served_at TEXT NOT NULL
    )
    ''')

    # Indexes for high performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notes_status ON community_notes(status);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notes_folder ON community_notes(folder_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notes_author ON community_notes(author_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_attempts_session ON quiz_attempts(session_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_qhistory_session ON question_history(session_id);')

    conn.commit()

    # Seed Initial Default Data if empty
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Seed default Admin and Student
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        admin_hash, admin_salt = hash_password("AdminPass123!")
        cursor.execute('''
        INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ("usr-admin-default", "Knowlix Admin", "admin@knowlix.ai", admin_hash, admin_salt, "admin", now_iso))

        student_hash, student_salt = hash_password("StudentPass123!")
        cursor.execute('''
        INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ("usr-student-demo", "Scholar Demo", "student@knowlix.ai", student_hash, student_salt, "student", now_iso))

    # Seed Default Folders
    cursor.execute('SELECT COUNT(*) FROM folders')
    if cursor.fetchone()[0] == 0:
        default_folders = [
            ("f-cs", "Computer Science & Algorithms", "Data structures, algorithms, runtime analysis, and software principles.", "indigo"),
            ("f-bio", "Biology & Life Sciences", "Plant physiology, molecular biology, genetics, and biochemical pathways.", "emerald"),
            ("f-phys", "Physics & Thermodynamics", "Heat engines, entropy, thermodynamics laws, and mechanics.", "amber"),
            ("f-web", "Web & Cloud Engineering", "Distributed systems, web frameworks, network protocols, and APIs.", "sky"),
            ("f-exam", "Exam Preparation & Quick Revision", "High-yield summary formulas, definitions, and cheat sheets.", "violet"),
        ]
        for fid, fname, fdesc, fcolor in default_folders:
            cursor.execute('''
            INSERT INTO folders (id, name, description, color, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (fid, fname, fdesc, fcolor, "usr-admin-default", now_iso, now_iso))

    # Seed initial published sample notes if empty
    cursor.execute('SELECT COUNT(*) FROM community_notes')
    if cursor.fetchone()[0] == 0:
        initial_notes = [
            (
                "note-bio-1",
                "Photosynthesis & Photophosphorylation Master Guide",
                "Complete lecture notes detailing Photosystem II photolysis, thylakoid proton gradients, ATP synthase chemiosmosis, and RuBisCO carbon fixation.",
                "Biology / Plant Physiology",
                "Plant Physiology",
                json.dumps(["Photosynthesis", "RuBisCO", "Thylakoid", "Light Reactions"]),
                "photosynthesis_lecture.pdf",
                "application/pdf",
                2867,
                None,
                "/samples/photosynthesis_notes.png",
                "Photosynthesis converts solar photons into chemical energy in thylakoid membranes, generating ATP and NADPH for the Calvin cycle.",
                "usr-admin-default",
                "Knowlix Admin",
                "published",
                "f-bio",
                "usr-admin-default",
                now_iso,
                142,
                38
            ),
            (
                "note-cs-1",
                "Binary Search Trees & Asymptotic Runtime Complexity",
                "Structured cheat sheet on BST invariants, Inorder/Preorder/Postorder tree traversals, and logarithmic vs linear degradation.",
                "Computer Science",
                "Data Structures",
                json.dumps(["BST", "Algorithms", "Binary Trees", "Complexity"]),
                "binary_trees_chapter.pdf",
                "application/pdf",
                1723,
                None,
                "/samples/binary_trees_notes.png",
                "Binary Search Trees maintain strict ordering properties where left < root < right. Inorder traversal yields sorted sequence.",
                "usr-admin-default",
                "Knowlix Admin",
                "published",
                "f-cs",
                "usr-admin-default",
                now_iso,
                210,
                54
            ),
            (
                "note-phys-1",
                "Thermodynamics First Law & Carnot Engine Limitations",
                "Handwritten and diagram notes deriving Delta U = Q - W, isothermal vs adiabatic expansion, and theoretical Carnot efficiency limits.",
                "Physics",
                "Thermodynamics",
                json.dumps(["Thermodynamics", "Carnot", "Heat Engine", "Physics"]),
                "thermodynamics_notes.png",
                "image/png",
                49603,
                None,
                "/samples/thermodynamics_notes.png",
                "Internal energy changes equal heat added minus work done by system. Maximum theoretical Carnot efficiency is bounded by temperature reservoirs.",
                "usr-admin-default",
                "Knowlix Admin",
                "published",
                "f-phys",
                "usr-admin-default",
                now_iso,
                95,
                19
            ),
        ]
        for nid, title, desc, subj, cat, tags, fname, ftype, fsize, fdata, prev, summ, auth_id, auth_name, stat, fold_id, rev_by, rev_at, views, downs in initial_notes:
            cursor.execute('''
            INSERT INTO community_notes (
                id, title, description, subject, category, tags_json, file_name, file_type, file_size,
                file_data, preview_image, extracted_summary, author_id, author_name, status, folder_id,
                reviewed_by, reviewed_at, views_count, downloads_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                nid, title, desc, subj, cat, tags, fname, ftype, fsize, fdata, prev, summ,
                auth_id, auth_name, stat, fold_id, rev_by, rev_at, views, downs, now_iso, now_iso
            ))

    conn.commit()
    conn.close()

# Auto-initialize database on load
init_db()

# -------------------------------------------------------------
# User CRUD & Authentication Persistence
# -------------------------------------------------------------
def create_user(name: str, email: str, password: str, role: str = "student") -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = f"usr-{secrets.token_hex(8)}"
    p_hash, salt = hash_password(password)

    cursor.execute('''
    INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, name.strip(), email.strip().lower(), p_hash, salt, role, now_iso))
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "role": role,
        "created_at": now_iso
    }

def authenticate_user(email: str, password: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    if verify_password(password, row["password_hash"], row["salt"]):
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "created_at": row["created_at"]
        }
    return None

def get_user_by_id(user_id: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, email, role, created_at FROM users WHERE email = ?', (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# -------------------------------------------------------------
# Folder CRUD Operations
# -------------------------------------------------------------
def create_folder(name: str, description: str, color: str, created_by: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    folder_id = f"f-{secrets.token_hex(6)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute('''
    INSERT INTO folders (id, name, description, color, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (folder_id, name.strip(), description.strip(), color, created_by, now_iso, now_iso))
    conn.commit()
    conn.close()

    return {
        "id": folder_id,
        "name": name.strip(),
        "description": description.strip(),
        "color": color,
        "created_by": created_by,
        "created_at": now_iso,
        "notes_count": 0
    }

def list_folders() -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT f.*, COUNT(n.id) as notes_count
    FROM folders f
    LEFT JOIN community_notes n ON f.id = n.folder_id AND n.status = 'published'
    GROUP BY f.id
    ORDER BY f.name ASC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_folder(folder_id: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT f.*, COUNT(n.id) as notes_count
    FROM folders f
    LEFT JOIN community_notes n ON f.id = n.folder_id AND n.status = 'published'
    WHERE f.id = ?
    GROUP BY f.id
    ''', (folder_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_folder(folder_id: str, name: Optional[str] = None, description: Optional[str] = None, color: Optional[str] = None) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute('SELECT * FROM folders WHERE id = ?', (folder_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return None

    new_name = name.strip() if name is not None else existing["name"]
    new_desc = description.strip() if description is not None else existing["description"]
    new_color = color if color is not None else existing["color"]

    cursor.execute('''
    UPDATE folders SET name = ?, description = ?, color = ?, updated_at = ?
    WHERE id = ?
    ''', (new_name, new_desc, new_color, now_iso, folder_id))
    conn.commit()
    conn.close()

    return get_folder(folder_id)

def delete_folder(folder_id: str, force: bool = False) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM community_notes WHERE folder_id = ?', (folder_id,))
    count = cursor.fetchone()[0]

    if count > 0 and not force:
        # Prevent accidental deletion when folder contains notes
        conn.close()
        return False

    # Unlink any existing notes from this folder
    cursor.execute('UPDATE community_notes SET folder_id = NULL WHERE folder_id = ?', (folder_id,))
    cursor.execute('DELETE FROM folders WHERE id = ?', (folder_id,))
    conn.commit()
    conn.close()
    return True

# -------------------------------------------------------------
# Community Notes CRUD & Moderation Operations
# -------------------------------------------------------------
def create_community_note(
    title: str,
    subject: str,
    category: str,
    file_name: str,
    file_type: str,
    file_size: int,
    author_id: str,
    author_name: str,
    description: Optional[str] = "",
    tags: Optional[List[str]] = None,
    file_data: Optional[str] = None,
    preview_image: Optional[str] = None,
    extracted_summary: Optional[str] = None,
    folder_id: Optional[str] = None,
    is_admin: bool = False
) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    note_id = f"note-{secrets.token_hex(8)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    status = "published" if is_admin else "pending"

    tags_list = tags or []
    tags_json = json.dumps(tags_list)

    cursor.execute('''
    INSERT INTO community_notes (
        id, title, description, subject, category, tags_json, file_name, file_type, file_size,
        file_data, preview_image, extracted_summary, author_id, author_name, status, folder_id,
        reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        note_id, title.strip(), description.strip() if description else None,
        subject.strip(), category.strip(), tags_json, file_name, file_type, file_size,
        file_data, preview_image, extracted_summary, author_id, author_name, status, folder_id,
        author_id if is_admin else None,
        now_iso if is_admin else None,
        now_iso, now_iso
    ))
    conn.commit()
    conn.close()

    return get_community_note_by_id(note_id)

def get_community_note_by_id(note_id: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT n.*, f.name as folder_name
    FROM community_notes n
    LEFT JOIN folders f ON n.folder_id = f.id
    WHERE n.id = ?
    ''', (note_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["tags"] = json.loads(d["tags_json"]) if d.get("tags_json") else []
    return d

def list_public_explore_notes(
    category: Optional[str] = None,
    folder_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "newest",
    page: int = 1,
    limit: int = 20
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    query = '''
    SELECT n.*, f.name as folder_name
    FROM community_notes n
    LEFT JOIN folders f ON n.folder_id = f.id
    WHERE n.status = 'published'
    '''
    params: List[Any] = []

    if category and category.strip():
        query += " AND LOWER(n.category) = LOWER(?)"
        params.append(category.strip())

    if folder_id and folder_id.strip():
        query += " AND n.folder_id = ?"
        params.append(folder_id.strip())

    if search and search.strip():
        search_pattern = f"%{search.strip().lower()}%"
        query += " AND (LOWER(n.title) LIKE ? OR LOWER(n.description) LIKE ? OR LOWER(n.subject) LIKE ? OR LOWER(n.tags_json) LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    # Count total
    count_query = f"SELECT COUNT(*) FROM ({query})"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]

    # Sorting
    if sort_by == "popular":
        query += " ORDER BY n.views_count DESC, n.downloads_count DESC, n.created_at DESC"
    elif sort_by == "title":
        query += " ORDER BY n.title ASC"
    else:
        query += " ORDER BY n.created_at DESC"

    # Pagination
    offset = max(0, (page - 1) * limit)
    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    notes = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags_json"]) if d.get("tags_json") else []
        notes.append(d)

    # Categories list
    cursor.execute("SELECT DISTINCT category FROM community_notes WHERE status = 'published' ORDER BY category ASC")
    cats = [c[0] for c in cursor.fetchall() if c[0]]

    conn.close()
    return {
        "notes": notes,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "categories": cats
    }

def list_student_notes(author_id: str) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT n.*, f.name as folder_name
    FROM community_notes n
    LEFT JOIN folders f ON n.folder_id = f.id
    WHERE n.author_id = ?
    ORDER BY n.created_at DESC
    ''', (author_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags_json"]) if d.get("tags_json") else []
        results.append(d)
    return results

def list_admin_notes(status_filter: Optional[str] = None) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if status_filter and status_filter.strip().lower() != "all":
        cursor.execute('''
        SELECT n.*, f.name as folder_name
        FROM community_notes n
        LEFT JOIN folders f ON n.folder_id = f.id
        WHERE n.status = ?
        ORDER BY n.created_at DESC
        ''', (status_filter.strip().lower(),))
    else:
        cursor.execute('''
        SELECT n.*, f.name as folder_name
        FROM community_notes n
        LEFT JOIN folders f ON n.folder_id = f.id
        ORDER BY n.created_at DESC
        ''')
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags_json"]) if d.get("tags_json") else []
        results.append(d)
    return results

def moderate_community_note(
    note_id: str,
    action: str,  # 'approve' | 'reject' | 'publish' | 'unpublish'
    reviewed_by: str,
    rejection_reason: Optional[str] = None,
    folder_id: Optional[str] = None
) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute('SELECT * FROM community_notes WHERE id = ?', (note_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return None

    if action in ["approve", "publish"]:
        new_status = "published"
    elif action == "reject":
        new_status = "rejected"
    elif action == "unpublish":
        new_status = "archived"
    else:
        new_status = existing["status"]

    target_folder = folder_id if folder_id is not None else existing["folder_id"]

    cursor.execute('''
    UPDATE community_notes
    SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?, folder_id = ?, updated_at = ?
    WHERE id = ?
    ''', (new_status, reviewed_by, now_iso, rejection_reason, target_folder, now_iso, note_id))
    conn.commit()
    conn.close()

    return get_community_note_by_id(note_id)

def assign_note_folder(note_id: str, folder_id: Optional[str]) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute('''
    UPDATE community_notes SET folder_id = ?, updated_at = ? WHERE id = ?
    ''', (folder_id, now_iso, note_id))
    conn.commit()
    conn.close()
    return True

def delete_community_note(note_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM community_notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()
    return True

def increment_note_metric(note_id: str, metric: str = "views") -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    if metric == "views":
        cursor.execute('UPDATE community_notes SET views_count = views_count + 1 WHERE id = ?', (note_id,))
    elif metric == "downloads":
        cursor.execute('UPDATE community_notes SET downloads_count = downloads_count + 1 WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Existing Session & Mastery Logic (Strictly Preserved)
# -------------------------------------------------------------
def save_session(session_id: str, subject: str, topic: str, image_preview: Optional[str],
                 summary_dict: dict, quiz_list: list = None, flashcards_list: list = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    cursor.execute('''
    INSERT INTO sessions (id, subject, topic, created_at, image_preview, summary_json, quiz_json, flashcards_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        subject = excluded.subject,
        topic = excluded.topic,
        image_preview = coalesce(excluded.image_preview, sessions.image_preview),
        summary_json = coalesce(excluded.summary_json, sessions.summary_json),
        quiz_json = coalesce(excluded.quiz_json, sessions.quiz_json),
        flashcards_json = coalesce(excluded.flashcards_json, sessions.flashcards_json)
    ''', (
        session_id,
        subject,
        topic,
        now_iso,
        image_preview,
        json.dumps(summary_dict) if summary_dict else None,
        json.dumps(quiz_list) if quiz_list else None,
        json.dumps(flashcards_list) if flashcards_list else None
    ))
    conn.commit()
    conn.close()

def get_session(session_id: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM sessions WHERE id = ?', (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "subject": row["subject"],
        "topic": row["topic"],
        "created_at": row["created_at"],
        "image_preview": row["image_preview"],
        "summary": json.loads(row["summary_json"]) if row["summary_json"] else None,
        "quiz": json.loads(row["quiz_json"]) if row["quiz_json"] else None,
        "flashcards": json.loads(row["flashcards_json"]) if row["flashcards_json"] else None,
        "quiz_score": row["quiz_score"],
        "total_questions": row["total_questions"],
        "flashcards_reviewed": row["flashcards_reviewed"] or 0
    }

def list_sessions() -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM sessions ORDER BY created_at DESC')
    rows = cursor.fetchall()
    
    results = []
    for r in rows:
        session_id = r["id"]
        cursor.execute(
            "SELECT COUNT(*) FROM concept_mastery WHERE session_id = ? AND mastery_status IN ('Needs Practice', 'Improving')",
            (session_id,)
        )
        weak_count = cursor.fetchone()[0]
        
        summary_data = json.loads(r["summary_json"]) if r["summary_json"] else {}
        key_concepts = summary_data.get("key_concepts", []) if isinstance(summary_data, dict) else []
        
        results.append({
            "id": r["id"],
            "subject": r["subject"],
            "topic": r["topic"],
            "created_at": r["created_at"],
            "image_preview": r["image_preview"],
            "key_concepts": key_concepts[:4],
            "quiz_score": r["quiz_score"],
            "total_questions": r["total_questions"],
            "flashcards_count": len(json.loads(r["flashcards_json"])) if r["flashcards_json"] else 5,
            "weak_concepts_count": weak_count
        })
    conn.close()
    return results

def update_quiz_result(session_id: str, score: int, total_questions: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    UPDATE sessions SET quiz_score = ?, total_questions = ? WHERE id = ?
    ''', (score, total_questions, session_id))
    conn.commit()
    conn.close()

def record_concept_mastery(session_id: str, concept: str, status: str, is_correct_attempt: bool = False):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    cursor.execute('SELECT attempts_count, correct_count FROM concept_mastery WHERE session_id = ? AND concept = ?', (session_id, concept))
    existing = cursor.fetchone()
    if existing:
        new_attempts = existing["attempts_count"] + 1
        new_correct = existing["correct_count"] + (1 if is_correct_attempt else 0)
        cursor.execute('''
        UPDATE concept_mastery 
        SET mastery_status = ?, attempts_count = ?, correct_count = ?, updated_at = ?
        WHERE session_id = ? AND concept = ?
        ''', (status, new_attempts, new_correct, now_iso, session_id, concept))
    else:
        cursor.execute('''
        INSERT INTO concept_mastery (session_id, concept, mastery_status, attempts_count, correct_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (session_id, concept, status, 1, 1 if is_correct_attempt else 0, now_iso))
    conn.commit()
    conn.close()

def get_session_concept_mastery(session_id: str) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM concept_mastery WHERE session_id = ?', (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_overall_stats() -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM sessions')
    total_sessions = cursor.fetchone()[0]
    
    cursor.execute('SELECT AVG(CAST(quiz_score AS FLOAT) / total_questions * 100) FROM sessions WHERE quiz_score IS NOT NULL AND total_questions > 0')
    avg_score_raw = cursor.fetchone()[0]
    avg_score = round(avg_score_raw, 1) if avg_score_raw is not None else 0.0
    
    cursor.execute('SELECT SUM(flashcards_reviewed) FROM sessions')
    flashcards_reviewed = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM concept_mastery WHERE mastery_status IN ('Needs Practice', 'Improving')")
    weak_concepts = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM concept_mastery WHERE mastery_status = 'Mastered'")
    mastered_concepts = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM community_notes WHERE status = 'published'")
    published_notes = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM quiz_attempts')
    total_attempts = cursor.fetchone()[0]

    conn.close()
    return {
        "total_sessions": total_sessions,
        "total_quiz_attempts": total_attempts,
        "avg_quiz_score": avg_score,
        "flashcards_reviewed": flashcards_reviewed,
        "weak_concepts": weak_concepts,
        "mastered_concepts": mastered_concepts,
        "published_notes_count": published_notes
    }

# -------------------------------------------------------------
# Dynamic Quiz Attempts & Question History Tracking
# -------------------------------------------------------------
def create_quiz_attempt(
    session_id: str,
    questions: list,
    difficulty: str = "medium",
    quiz_length: int = 5,
    question_types: list = None,
    is_fresh: bool = True,
    material_scope_note: Optional[str] = None,
    user_id: Optional[str] = None
) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    attempt_id = f"att-{secrets.token_hex(8)}"

    # Determine attempt number for this session
    cursor.execute('SELECT COUNT(*) FROM quiz_attempts WHERE session_id = ?', (session_id,))
    existing_count = cursor.fetchone()[0]
    attempt_number = existing_count + 1

    q_types_json = json.dumps(question_types or ["mcq"])
    questions_json = json.dumps(questions)

    cursor.execute('''
    INSERT INTO quiz_attempts (
        id, session_id, user_id, attempt_number, difficulty, quiz_length,
        question_types_json, questions_json, is_fresh, material_scope_note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        attempt_id, session_id, user_id, attempt_number, difficulty, quiz_length,
        q_types_json, questions_json, 1 if is_fresh else 0, material_scope_note, now_iso
    ))
    conn.commit()

    # Record question history to prevent repetition across future attempts
    for q in questions:
        q_text = q.get("question", "") if isinstance(q, dict) else getattr(q, "question", "")
        q_concept = q.get("concept", "") if isinstance(q, dict) else getattr(q, "concept", "")
        q_diff = q.get("difficulty", difficulty) if isinstance(q, dict) else getattr(q, "difficulty", difficulty)
        if q_text:
            cursor.execute('''
            INSERT INTO question_history (session_id, attempt_id, question_text, concept, difficulty, served_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (session_id, attempt_id, q_text.strip(), q_concept, q_diff, now_iso))

    conn.commit()
    conn.close()

    return {
        "id": attempt_id,
        "session_id": session_id,
        "attempt_number": attempt_number,
        "difficulty": difficulty,
        "quiz_length": quiz_length,
        "question_types": question_types or ["mcq"],
        "questions": questions,
        "is_fresh": is_fresh,
        "material_scope_note": material_scope_note,
        "created_at": now_iso
    }

def get_previously_served_questions(session_id: str) -> List[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT question_text FROM question_history WHERE session_id = ?', (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [r["question_text"] for r in rows if r["question_text"]]

def get_quiz_attempts(session_id: str) -> List[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT * FROM quiz_attempts
    WHERE session_id = ?
    ORDER BY attempt_number DESC
    ''', (session_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "session_id": r["session_id"],
            "attempt_number": r["attempt_number"],
            "difficulty": r["difficulty"],
            "quiz_length": r["quiz_length"],
            "question_types": json.loads(r["question_types_json"]) if r["question_types_json"] else ["mcq"],
            "score": r["score"],
            "total_questions": r["total_questions"],
            "score_percentage": r["score_percentage"],
            "is_perfect": bool(r["is_perfect"]),
            "is_fresh": bool(r["is_fresh"]),
            "material_scope_note": r["material_scope_note"],
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
        })
    return results

def get_quiz_attempt_by_id(attempt_id: str) -> Optional[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM quiz_attempts WHERE id = ?', (attempt_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None

    return {
        "id": r["id"],
        "session_id": r["session_id"],
        "attempt_number": r["attempt_number"],
        "difficulty": r["difficulty"],
        "quiz_length": r["quiz_length"],
        "question_types": json.loads(r["question_types_json"]) if r["question_types_json"] else ["mcq"],
        "score": r["score"],
        "total_questions": r["total_questions"],
        "score_percentage": r["score_percentage"],
        "is_perfect": bool(r["is_perfect"]),
        "questions": json.loads(r["questions_json"]) if r["questions_json"] else [],
        "student_answers": json.loads(r["student_answers_json"]) if r["student_answers_json"] else {},
        "review": json.loads(r["review_json"]) if r["review_json"] else None,
        "is_fresh": bool(r["is_fresh"]),
        "material_scope_note": r["material_scope_note"],
        "created_at": r["created_at"],
        "completed_at": r["completed_at"],
    }

def update_quiz_attempt_result(
    attempt_id: str,
    score: int,
    total_questions: int,
    score_percentage: int,
    is_perfect: bool,
    student_answers: list,
    review_data: dict
) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute('''
    UPDATE quiz_attempts
    SET score = ?, total_questions = ?, score_percentage = ?, is_perfect = ?,
        student_answers_json = ?, review_json = ?, completed_at = ?
    WHERE id = ?
    ''', (
        score, total_questions, score_percentage, 1 if is_perfect else 0,
        json.dumps(student_answers), json.dumps(review_data), now_iso, attempt_id
    ))
    conn.commit()
    conn.close()

