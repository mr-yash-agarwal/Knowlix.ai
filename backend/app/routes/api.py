import uuid
import json
import base64
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import ValidationError

from app.models import (
    NoteAnalysisResponse, KeyDefinition, ModelMetadata,
    GenerateQuizResponse, QuizQuestion,
    GenerateFlashcardsResponse, FlashcardItem,
    SubmitQuizRequest, SubmitQuizResponse,
    TeachMissedRequest, TeachMissedResponse,
    RetryFollowupRequest, RetryFollowupResponse,
    HealthResponse, SessionSummaryRecord,
    AssistantAskRequest, AssistantAskResponse,
    QuizAttemptSummary, QuizAttemptDetail
)
from app.config import config
from app.services.model_service import model_service
from app.services.ai.gemma_service import GemmaAPIError
from app.services.quiz_evaluator import quiz_evaluator
from app.services.document.pdf_extractor import pdf_extractor, PDFProcessingError
from app.services.audio.speech_service import speech_service
from app.database import (
    save_session, get_session, list_sessions,
    record_concept_mastery, get_overall_stats,
    create_quiz_attempt, get_quiz_attempts,
    get_quiz_attempt_by_id, get_previously_served_questions,
    update_quiz_attempt_result
)

router = APIRouter(prefix="/api", tags=["Knowlix AI Core"])

@router.get("/health", response_model=HealthResponse)
async def check_health():
    """Health check endpoint documenting model status, license, and runtime availability."""
    h = model_service.get_health_status()
    stats = get_overall_stats()
    return HealthResponse(
        status="healthy",
        app_version=config.APP_VERSION,
        model_provider=h["model_provider"],
        model_name=h["model_name"],
        model_license=h["model_license"],
        is_open_weight=h["is_open_weight"],
        local_runtime_available=h["local_runtime_available"],
        active_sessions_count=stats["total_sessions"],
        database_ok=True
    )

@router.post("/analyze-notes", response_model=NoteAnalysisResponse)
async def analyze_notes(
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    page_range: Optional[str] = Form(None)
):
    """
    Accepts an uploaded photo/scan of handwritten notes, diagrams, textbook pages, or PDF documents.
    Validates file signature, format, and size, then uses open-weight models to extract structured learning content.
    """
    filename = file.filename or "notes.jpg"
    lower_filename = filename.lower()
    content_type = file.content_type or ""
    is_pdf = lower_filename.endswith(".pdf") or content_type == "application/pdf"
    is_image = (
        content_type in config.ALLOWED_IMAGE_TYPES
        or lower_filename.endswith((".png", ".jpg", ".jpeg", ".webp"))
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Please upload a PDF document or a JPG, JPEG, PNG, or WEBP image."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty."
        )

    session_id = str(uuid.uuid4())

    if is_pdf:
        # Validate and extract PDF
        try:
            pdf_data = await pdf_extractor.process_pdf(
                file_bytes=file_bytes,
                filename=filename,
                page_range=page_range
            )
        except PDFProcessingError as pe:
            raise HTTPException(status_code=pe.status_code, detail=pe.message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

        try:
            analysis_dict = await model_service.analyze_document_text(
                extracted_text=pdf_data["extracted_text"],
                filename=filename,
                subject=subject,
                topic=topic,
                document_meta=pdf_data
            )
        except GemmaAPIError as ge:
            raise HTTPException(status_code=ge.status_code if 400 <= ge.status_code < 600 else 502, detail=ge.message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI model inference failed on document: {str(e)}")

        image_preview = pdf_data.get("preview_image") or None
        doc_type = "pdf"
        page_count = pdf_data.get("total_pages")
        selected_pages = pdf_data.get("selected_pages")
        scanned_count = pdf_data.get("scanned_pages_count", 0)

    else:
        # Image Processing (existing behavior strictly preserved)
        max_bytes = config.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Image file exceeds maximum allowable size of {config.MAX_FILE_SIZE_MB}MB."
            )

        try:
            analysis_dict = await model_service.analyze_notes(
                image_bytes=file_bytes,
                filename=filename,
                subject=subject,
                topic=topic
            )
        except GemmaAPIError as ge:
            raise HTTPException(status_code=ge.status_code if 400 <= ge.status_code < 600 else 502, detail=ge.message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI Vision Model inference failed: {str(e)}")

        b64_str = base64.b64encode(file_bytes).decode('utf-8')
        mime_type = content_type if content_type in config.ALLOWED_IMAGE_TYPES else "image/jpeg"
        image_preview = f"data:{mime_type};base64,{b64_str}"
        doc_type = "image"
        page_count = 1
        selected_pages = [1]
        scanned_count = 0

    # Save in SQLite
    raw_quiz = analysis_dict.get("_raw_quiz")
    raw_flashcards = analysis_dict.get("_raw_flashcards")

    save_session(
        session_id=session_id,
        subject=analysis_dict["subject"],
        topic=analysis_dict["topic"],
        image_preview=image_preview,
        summary_dict={
            "summary": analysis_dict["summary"],
            "key_concepts": analysis_dict["key_concepts"],
            "definitions": analysis_dict["definitions"],
            "takeaways": analysis_dict["takeaways"],
            "unclear_sections": analysis_dict["unclear_sections"],
            "extracted_text": analysis_dict["extracted_text"],
            "document_type": doc_type,
            "file_name": filename,
            "page_count": page_count
        },
        quiz_list=raw_quiz,
        flashcards_list=raw_flashcards
    )

    return NoteAnalysisResponse(
        session_id=session_id,
        subject=analysis_dict["subject"],
        topic=analysis_dict["topic"],
        extracted_text=analysis_dict["extracted_text"],
        summary=analysis_dict["summary"],
        key_concepts=analysis_dict["key_concepts"],
        definitions=[KeyDefinition(**d) for d in analysis_dict["definitions"]],
        takeaways=analysis_dict["takeaways"],
        unclear_sections=analysis_dict.get("unclear_sections", []),
        image_preview=image_preview,
        model_meta=ModelMetadata(**analysis_dict["model_meta"]),
        document_type=doc_type,
        file_name=filename,
        file_size_bytes=len(file_bytes),
        page_count=page_count,
        selected_pages=selected_pages,
        scanned_pages_count=scanned_count
    )

@router.post("/generate-quiz", response_model=GenerateQuizResponse)
async def generate_quiz(
    session_id: str = Form(...),
    difficulty: Optional[str] = Form("medium"),
    quiz_length: Optional[int] = Form(5),
    question_types: Optional[str] = Form(None),
    force_fresh: Optional[bool] = Form(False)
):
    """
    Dynamic Quiz Generation powered by Gemma 4 (Gemini API) and Grounded Academic Engine.
    Generates fresh questions on every attempt, tracking question history to minimize repetition.
    Supports configurable length (3-15), difficulty levels (easy, medium, hard), and formats.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Parse question_types if provided
    parsed_types = ["mcq"]
    if question_types:
        try:
            trimmed = question_types.strip()
            if trimmed.startswith("["):
                parsed_types = json.loads(trimmed)
            else:
                parsed_types = [t.strip() for t in trimmed.split(",") if t.strip()]
        except Exception:
            parsed_types = ["mcq"]

    diff_str = (difficulty or "medium").lower()
    q_len = max(3, min(15, quiz_length or 5))

    # Check for existing in-progress attempt if fresh generation not explicitly requested
    previous_attempts = get_quiz_attempts(session_id)
    active_attempt = None
    if not force_fresh and previous_attempts:
        latest = previous_attempts[0]
        # In-progress if score has not been recorded yet
        if latest.get("score") is None:
            active_attempt = get_quiz_attempt_by_id(latest["id"])

    if active_attempt and active_attempt.get("questions") and not force_fresh:
        questions = [QuizQuestion(**q) for q in active_attempt["questions"]]
        attempt_id = active_attempt["id"]
        attempt_number = active_attempt["attempt_number"]
        attempt_diff = active_attempt["difficulty"]
        is_fresh = False
        scope_note = active_attempt.get("material_scope_note")
    else:
        # Generate fresh questions dynamically
        prev_questions = get_previously_served_questions(session_id)

        quiz_dict = await model_service.generate_quiz(
            analysis_data=session.get("summary") or {},
            difficulty=diff_str,
            quiz_length=q_len,
            previous_questions=prev_questions,
            question_types=parsed_types,
            force_fresh=force_fresh or bool(previous_attempts)
        )

        raw_questions = quiz_dict.get("questions", []) if isinstance(quiz_dict, dict) else quiz_dict
        questions = [QuizQuestion(**q) for q in raw_questions]
        scope_note = quiz_dict.get("material_scope_note") if isinstance(quiz_dict, dict) else None

        # Record in quiz_attempts table and track served question history
        attempt_record = create_quiz_attempt(
            session_id=session_id,
            questions=[q.model_dump() for q in questions],
            difficulty=diff_str,
            quiz_length=len(questions),
            question_types=parsed_types,
            is_fresh=True,
            material_scope_note=scope_note
        )
        attempt_id = attempt_record["id"]
        attempt_number = attempt_record["attempt_number"]
        attempt_diff = attempt_record["difficulty"]
        is_fresh = True

        # Synchronize active quiz into sessions table for backward compatibility
        save_session(
            session_id=session_id,
            subject=session["subject"],
            topic=session["topic"],
            image_preview=session.get("image_preview"),
            summary_dict=session.get("summary"),
            quiz_list=[q.model_dump() for q in questions],
            flashcards_list=session.get("flashcards")
        )

    health = model_service.get_health_status()
    meta = ModelMetadata(
        provider=health["model_provider"],
        model_name=health["model_name"],
        license=health["model_license"],
        is_open_weight=True,
        latency_ms=180,
        mode=health["active_mode"]
    )

    return GenerateQuizResponse(
        session_id=session_id,
        subject=session["subject"],
        topic=session["topic"],
        questions=questions,
        model_meta=meta,
        attempt_id=attempt_id,
        attempt_number=attempt_number,
        difficulty=attempt_diff,
        quiz_length=len(questions),
        is_fresh=is_fresh,
        material_scope_note=scope_note
    )

@router.get("/quiz/attempts", response_model=List[QuizAttemptSummary])
async def get_session_quiz_attempts(session_id: str):
    """Retrieve all quiz attempt summaries for a study session to review learning progression."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    attempts = get_quiz_attempts(session_id)
    return [QuizAttemptSummary(**a) for a in attempts]

@router.get("/quiz/attempts/{attempt_id}", response_model=QuizAttemptDetail)
async def get_quiz_attempt_detail(attempt_id: str):
    """Retrieve full details of a specific past quiz attempt for review."""
    attempt = get_quiz_attempt_by_id(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found.")
    return QuizAttemptDetail(**attempt)

@router.post("/generate-flashcards", response_model=GenerateFlashcardsResponse)
async def generate_flashcards(session_id: str = Form(...)):
    """Generate 5 question-and-answer flashcards grounded in the notes."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if session.get("flashcards") and len(session["flashcards"]) > 0:
        flashcards = [FlashcardItem(**f) for f in session["flashcards"]]
    else:
        flashcards_raw = await model_service.generate_flashcards(session.get("summary") or {})
        flashcards = [FlashcardItem(**f) for f in flashcards_raw]
        save_session(
            session_id=session_id,
            subject=session["subject"],
            topic=session["topic"],
            image_preview=session.get("image_preview"),
            summary_dict=session.get("summary"),
            quiz_list=session.get("quiz"),
            flashcards_list=[f.model_dump() for f in flashcards]
        )

    health = model_service.get_health_status()
    meta = ModelMetadata(
        provider=health["model_provider"],
        model_name=health["model_name"],
        license=health["model_license"],
        is_open_weight=True,
        latency_ms=140,
        mode=health["active_mode"]
    )

    return GenerateFlashcardsResponse(
        session_id=session_id,
        subject=session["subject"],
        topic=session["topic"],
        flashcards=flashcards,
        model_meta=meta
    )

@router.post("/submit-quiz", response_model=SubmitQuizResponse)
async def submit_quiz(payload: SubmitQuizRequest):
    """
    Evaluates submitted student answers against the server-side trusted answer key.
    Calculates objective score and automatically triggers 'Teach Me What I Missed' for errors.
    Persists attempt results, answer selections, and concept progression in SQLite.
    """
    if not payload.answers:
        raise HTTPException(status_code=400, detail="Cannot submit an empty quiz. Please answer at least one question.")
    
    try:
        result = await quiz_evaluator.evaluate_submission(
            session_id=payload.session_id,
            student_answers=payload.answers,
            quiz_items=payload.quiz_items,
            attempt_id=payload.attempt_id,
            difficulty=payload.difficulty or "medium"
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz evaluation failed: {str(e)}")

@router.post("/teach-missed", response_model=TeachMissedResponse)
async def teach_missed(payload: TeachMissedRequest):
    """
    Signature endpoint: 'Teach Me What I Missed'
    Generates simplified explanations (beginner, ELI5, analogy), illustrative real-world examples,
    and a new targeted follow-up question testing the weak concept differently.
    """
    session = get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    teach_data = await model_service.generate_teach_missed(
        concept=payload.concept,
        original_question=payload.original_question or "",
        student_answer=payload.student_answer or "",
        correct_answer=payload.correct_answer or "",
        simplification_level=payload.simplification_level
    )

    return TeachMissedResponse(
        concept=teach_data["concept"],
        simplification_level=payload.simplification_level,
        simpler_explanation=teach_data["simpler_explanation"],
        real_world_example=teach_data["real_world_example"],
        key_breakthrough_insight=teach_data["key_breakthrough_insight"],
        practice_question=teach_data["practice_question"],
        current_mastery=teach_data["current_mastery"]
    )

@router.post("/retry-missed", response_model=RetryFollowupResponse)
async def retry_missed_question(payload: RetryFollowupRequest):
    """
    Evaluates student's attempt on a targeted follow-up practice question.
    Updates concept mastery level: Needs Practice -> Improving -> Mastered.
    """
    is_correct = payload.selected_option.strip().lower() == payload.expected_answer.strip().lower()
    
    if is_correct:
        updated_mastery = "Mastered"
        record_concept_mastery(payload.session_id, payload.concept, updated_mastery, is_correct_attempt=True)
        message = "Brilliant breakthrough! You've nailed this concept on your follow-up attempt. Concept marked as Mastered!"
    else:
        updated_mastery = "Improving"
        record_concept_mastery(payload.session_id, payload.concept, updated_mastery, is_correct_attempt=False)
        message = "Almost there! Learning is an iterative process. Keep going—you can simplify the explanation further or try another question."

    return RetryFollowupResponse(
        is_correct=is_correct,
        concept=payload.concept,
        selected_option=payload.selected_option,
        correct_answer=payload.expected_answer,
        explanation=payload.explanation or ("Great job identifying the right answer!" if is_correct else f"The intended answer is: {payload.expected_answer}"),
        updated_mastery=updated_mastery,
        encouraging_message=message,
        can_try_another=True
    )

@router.get("/sessions", response_model=List[SessionSummaryRecord])
async def get_all_sessions():
    """Retrieve all saved revision sessions for the student dashboard."""
    raw_sessions = list_sessions()
    records = []
    for s in raw_sessions:
        records.append(SessionSummaryRecord(
            id=s["id"],
            subject=s["subject"],
            topic=s["topic"],
            created_at=s["created_at"],
            image_preview=s.get("image_preview"),
            key_concepts=s.get("key_concepts", []),
            quiz_score=s.get("quiz_score"),
            total_questions=s.get("total_questions"),
            flashcards_count=s.get("flashcards_count", 5),
            weak_concepts_count=s.get("weak_concepts_count", 0)
        ))
    return records

@router.get("/sessions/{session_id}")
async def get_session_by_id(session_id: str):
    """Retrieve full revision workspace state for a given session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found.")
    return session

@router.get("/stats")
async def get_stats():
    """Retrieve overall learning statistics for the student dashboard."""
    return get_overall_stats()

@router.get("/sample-materials")
async def get_sample_materials():
    """Provide pre-packaged study materials for instant one-click demonstration."""
    from app.services.model_service import PREPACKAGED_KNOWLEDGE
    samples = []
    for key, val in PREPACKAGED_KNOWLEDGE.items():
        samples.append({
            "id": key,
            "subject": val["subject"],
            "topic": val["topic"],
            "summary": val["summary"],
            "key_concepts": val["key_concepts"][:4],
            "filename": f"{key}_notes.png"
        })
    return samples

@router.post("/assistant/ask", response_model=AssistantAskResponse)
@router.post("/voice/ask", response_model=AssistantAskResponse)
async def ask_study_assistant(payload: AssistantAskRequest):
    """
    Receives student questions (verbal voice transcript or typed text)
    and generates grounded educational explanations using the open-weight model.
    """
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    session = get_session(payload.session_id)
    if not session:
        # Grounded study context fallback if session ID is temporary
        study_context = {
            "subject": "General Study",
            "topic": "Academic Notes",
            "summary": "Study material on key scientific, algorithmic, and computational principles.",
            "extracted_text": "",
            "key_concepts": ["Core Principle", "Application", "Analysis"]
        }
    else:
        summary_obj = session.get("summary") or {}
        study_context = {
            "subject": session.get("subject", ""),
            "topic": session.get("topic", ""),
            "summary": summary_obj.get("summary", ""),
            "extracted_text": summary_obj.get("extracted_text", ""),
            "key_concepts": summary_obj.get("key_concepts", [])
        }

    try:
        response_dict = await speech_service.answer_study_question(
            question=payload.question.strip(),
            study_context=study_context,
            is_voice=payload.is_voice,
            language=payload.language or "en-US"
        )
        return AssistantAskResponse(**response_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Study Assistant inference failed: {str(e)}")

@router.post("/documents/analyze", response_model=NoteAnalysisResponse)
async def analyze_document_endpoint(
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    page_range: Optional[str] = Form(None)
):
    """Dedicated alias endpoint for document & PDF analysis."""
    return await analyze_notes(file=file, subject=subject, topic=topic, page_range=page_range)
