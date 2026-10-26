from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class KeyDefinition(BaseModel):
    term: str
    definition: str
    importance: Optional[str] = "High"

class ModelMetadata(BaseModel):
    provider: str
    model_name: str
    license: str
    is_open_weight: bool = True
    latency_ms: Optional[int] = 0
    mode: str = "open-weight-inference"

class NoteAnalysisResponse(BaseModel):
    session_id: str
    subject: str
    topic: str
    extracted_text: str
    summary: str
    key_concepts: List[str]
    definitions: List[KeyDefinition]
    takeaways: List[str]
    unclear_sections: List[str] = Field(default_factory=list)
    image_preview: Optional[str] = None
    model_meta: ModelMetadata
    document_type: Optional[str] = "image"  # "image" | "pdf"
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    page_count: Optional[int] = None
    selected_pages: Optional[List[int]] = None
    scanned_pages_count: Optional[int] = 0

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    concept: str
    source_evidence: str
    question_type: Optional[str] = "mcq"  # 'mcq' | 'true_false' | 'scenario'
    difficulty: Optional[str] = "medium"  # 'easy' | 'medium' | 'hard'

class GenerateQuizRequest(BaseModel):
    session_id: str
    difficulty: Optional[str] = "medium"
    quiz_length: Optional[int] = 5
    question_types: Optional[List[str]] = Field(default_factory=lambda: ["mcq"])
    force_fresh: Optional[bool] = False

class GenerateQuizResponse(BaseModel):
    session_id: str
    subject: str
    topic: str
    questions: List[QuizQuestion]
    model_meta: ModelMetadata
    attempt_id: Optional[str] = None
    attempt_number: Optional[int] = 1
    difficulty: Optional[str] = "medium"
    quiz_length: Optional[int] = 5
    is_fresh: Optional[bool] = True
    material_scope_note: Optional[str] = None

class QuizAttemptSummary(BaseModel):
    id: str
    session_id: str
    attempt_number: int
    difficulty: str
    quiz_length: int
    question_types: List[str] = Field(default_factory=lambda: ["mcq"])
    score: Optional[int] = None
    total_questions: Optional[int] = None
    score_percentage: Optional[int] = None
    is_perfect: bool = False
    is_fresh: bool = True
    material_scope_note: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

class QuizAttemptDetail(QuizAttemptSummary):
    questions: List[QuizQuestion] = Field(default_factory=list)
    student_answers: Optional[List[Dict[str, Any]]] = None
    review: Optional[Dict[str, Any]] = None

class FlashcardItem(BaseModel):
    id: int
    question: str
    answer: str
    concept: str
    mastery_hint: Optional[str] = None
    is_known: bool = False

class GenerateFlashcardsResponse(BaseModel):
    session_id: str
    subject: str
    topic: str
    flashcards: List[FlashcardItem]
    model_meta: ModelMetadata

class StudentAnswerSubmission(BaseModel):
    question_id: int
    selected_option: str

class SubmitQuizRequest(BaseModel):
    session_id: str
    answers: List[StudentAnswerSubmission]
    # Client passes question IDs, but backend evaluates against session state or provided validated quiz items
    quiz_items: Optional[List[QuizQuestion]] = None
    attempt_id: Optional[str] = None
    difficulty: Optional[str] = "medium"

class FollowupQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    concept: str

class MissedConceptReport(BaseModel):
    concept: str
    original_question_id: int
    original_question: str
    student_answer: str
    correct_answer: str
    why_incorrect: str
    simple_explanation: str
    real_world_example: str
    practice_question: FollowupQuestion
    mastery_status: str = "Needs Practice"  # Needs Practice | Improving | Mastered
    attempts_count: int = 1

class ConceptMasteryOverview(BaseModel):
    concept: str
    status: str
    accuracy_percentage: int

class SubmitQuizResponse(BaseModel):
    session_id: str
    attempt_id: Optional[str] = None
    attempt_number: Optional[int] = 1
    difficulty: Optional[str] = "medium"
    is_fresh: Optional[bool] = True
    total_questions: int
    correct_count: int
    score_percentage: int
    is_perfect: bool
    concept_breakdown: List[ConceptMasteryOverview]
    missed_concepts: List[MissedConceptReport]
    encouragement_note: str

class TeachMissedRequest(BaseModel):
    session_id: str
    concept: str
    simplification_level: str = "beginner"  # beginner | eli5 | analogy | deeper
    original_question: Optional[str] = None
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None

class TeachMissedResponse(BaseModel):
    concept: str
    simplification_level: str
    simpler_explanation: str
    real_world_example: str
    key_breakthrough_insight: str
    practice_question: FollowupQuestion
    current_mastery: str

class RetryFollowupRequest(BaseModel):
    session_id: str
    concept: str
    question_id: str
    selected_option: str
    expected_answer: str
    explanation: Optional[str] = None

class RetryFollowupResponse(BaseModel):
    is_correct: bool
    concept: str
    selected_option: str
    correct_answer: str
    explanation: str
    updated_mastery: str  # Needs Practice | Improving | Mastered
    encouraging_message: str
    can_try_another: bool = True

class SessionSummaryRecord(BaseModel):
    id: str
    subject: str
    topic: str
    created_at: str
    image_preview: Optional[str] = None
    key_concepts: List[str] = Field(default_factory=list)
    quiz_score: Optional[int] = None
    total_questions: Optional[int] = None
    flashcards_count: Optional[int] = None
    weak_concepts_count: int = 0

class AssistantAskRequest(BaseModel):
    session_id: str
    question: str
    is_voice: bool = False
    language: Optional[str] = "en-US"
    selected_text: Optional[str] = None

class AssistantAskResponse(BaseModel):
    answer: str
    source_citations: List[str] = Field(default_factory=list)
    related_concepts: List[str] = Field(default_factory=list)
    is_voice: bool = False
    language: str = "en-US"
    model_used: str

class HealthResponse(BaseModel):
    status: str
    app_version: str
    model_provider: str
    model_name: str
    model_license: str
    is_open_weight: bool
    local_runtime_available: bool
    active_sessions_count: int
    database_ok: bool

# Authentication & User Models
class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: str  # 'student' | 'admin'
    created_at: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# Folder Models
class FolderCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "indigo"

class FolderUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class FolderResponse(BaseModel):
    id: str
    name: str
    description: str
    color: str
    created_by: str
    created_at: str
    notes_count: int = 0

# Community Note Models
class CommunityNoteSummary(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    subject: str
    category: str
    tags: List[str] = Field(default_factory=list)
    file_name: str
    file_type: str
    file_size: int
    preview_image: Optional[str] = None
    extracted_summary: Optional[str] = None
    author_id: str
    author_name: str
    status: str  # 'pending' | 'approved' | 'published' | 'rejected' | 'archived'
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    views_count: int = 0
    downloads_count: int = 0
    created_at: str
    updated_at: str

class CommunityNoteDetail(CommunityNoteSummary):
    file_data: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class NoteModerateRequest(BaseModel):
    action: str  # 'approve' | 'reject' | 'publish' | 'unpublish'
    rejection_reason: Optional[str] = None
    folder_id: Optional[str] = None

class AssignFolderRequest(BaseModel):
    folder_id: Optional[str] = None

class ExploreNotesResponse(BaseModel):
    notes: List[CommunityNoteSummary]
    total_count: int
    page: int
    limit: int
    categories: List[str]
    folders: List[FolderResponse]

