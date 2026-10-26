import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dynamic_quiz_attempts_workflow():
    # 1. Start by analyzing a preset note
    samples_res = client.get("/api/sample-materials")
    assert samples_res.status_code == 200

    # Upload test note
    from tests.test_api import create_test_image_bytes
    img = create_test_image_bytes()
    analysis_res = client.post(
        "/api/analyze-notes",
        files={"file": ("thermo_test.png", img, "image/png")},
        data={"subject": "Physics", "topic": "Thermodynamics"}
    )
    assert analysis_res.status_code == 200
    session_id = analysis_res.json()["session_id"]

    # 2. First Quiz Attempt (Foundational/Easy, 5 questions)
    q1_res = client.post("/api/generate-quiz", data={
        "session_id": session_id,
        "difficulty": "easy",
        "quiz_length": 5,
        "force_fresh": "true"
    })
    assert q1_res.status_code == 200
    d1 = q1_res.json()
    assert len(d1["questions"]) == 5
    assert d1["attempt_number"] == 1
    assert d1["is_fresh"] is True
    attempt1_id = d1["attempt_id"]
    q1_texts = [q["question"] for q in d1["questions"]]

    # Submit Attempt 1
    first_q = d1["questions"][0]
    submit1_res = client.post("/api/submit-quiz", json={
        "session_id": session_id,
        "attempt_id": attempt1_id,
        "difficulty": "easy",
        "answers": [
            {"question_id": first_q["id"], "selected_option": first_q["correct_answer"]}
        ],
        "quiz_items": d1["questions"]
    })
    assert submit1_res.status_code == 200
    s1 = submit1_res.json()
    assert s1["attempt_id"] == attempt1_id
    assert s1["correct_count"] == 1

    # 3. Second Quiz Attempt (Challenging/Hard, 5 questions, fresh questions requested)
    q2_res = client.post("/api/generate-quiz", data={
        "session_id": session_id,
        "difficulty": "hard",
        "quiz_length": 5,
        "force_fresh": "true"
    })
    assert q2_res.status_code == 200
    d2 = q2_res.json()
    assert len(d2["questions"]) == 5
    assert d2["attempt_number"] == 2
    assert d2["is_fresh"] is True
    attempt2_id = d2["attempt_id"]
    q2_texts = [q["question"] for q in d2["questions"]]

    # Verify that Attempt 2 does NOT repeat questions from Attempt 1!
    overlap = set(q1_texts).intersection(set(q2_texts))
    assert len(overlap) == 0, f"Expected 0 repeated questions across attempts, found: {overlap}"

    # 4. Check Attempt History endpoint
    history_res = client.get(f"/api/quiz/attempts?session_id={session_id}")
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) >= 2
    # Verify descending order by attempt number
    assert history[0]["attempt_number"] == 2
    assert history[1]["attempt_number"] == 1
    assert history[1]["score"] == 1

    # 5. Check Attempt Detail endpoint
    detail_res = client.get(f"/api/quiz/attempts/{attempt1_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == attempt1_id
    assert len(detail["questions"]) == 5
    assert detail["score"] == 1
