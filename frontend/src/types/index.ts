export interface KeyDefinition {
  term: string;
  definition: string;
  importance?: string;
}

export interface ModelMetadata {
  provider: string;
  model_name: string;
  license: string;
  is_open_weight: boolean;
  latency_ms?: number;
  mode: string;
}

export interface NoteAnalysis {
  session_id: string;
  subject: string;
  topic: string;
  extracted_text: string;
  summary: string;
  key_concepts: string[];
  definitions: KeyDefinition[];
  takeaways: string[];
  unclear_sections: string[];
  image_preview?: string;
  model_meta: ModelMetadata;
  document_type?: 'image' | 'pdf';
  file_name?: string;
  file_size_bytes?: number;
  page_count?: number;
  selected_pages?: number[];
  scanned_pages_count?: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  concept: string;
  source_evidence: string;
  question_type?: 'mcq' | 'true_false' | 'scenario';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GenerateQuizResponse {
  session_id: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
  model_meta: ModelMetadata;
  attempt_id?: string;
  attempt_number?: number;
  difficulty?: string;
  quiz_length?: number;
  is_fresh?: boolean;
  material_scope_note?: string;
}

export interface QuizAttemptSummary {
  id: string;
  session_id: string;
  attempt_number: number;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  quiz_length: number;
  question_types: string[];
  score?: number | null;
  total_questions?: number | null;
  score_percentage?: number | null;
  is_perfect: boolean;
  is_fresh: boolean;
  material_scope_note?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface QuizAttemptDetail extends QuizAttemptSummary {
  questions: QuizQuestion[];
  student_answers?: { question_id: number; selected_option: string }[] | null;
  review?: {
    score_percentage: number;
    is_perfect: boolean;
    correct_count: number;
    total_questions: number;
    concept_breakdown: ConceptMasteryOverview[];
    missed_concepts: MissedConceptReport[];
    encouragement_note: string;
  } | null;
}

export interface FlashcardItem {
  id: number;
  question: string;
  answer: string;
  concept: string;
  mastery_hint?: string;
  is_known?: boolean;
}

export interface FollowupQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  concept: string;
}

export interface MissedConceptReport {
  concept: string;
  original_question_id: number;
  original_question: string;
  student_answer: string;
  correct_answer: string;
  why_incorrect: string;
  simple_explanation: string;
  real_world_example: string;
  practice_question: FollowupQuestion;
  mastery_status: 'Needs Practice' | 'Improving' | 'Mastered';
  attempts_count: number;
}

export interface ConceptMasteryOverview {
  concept: string;
  status: string;
  accuracy_percentage: number;
}

export interface SubmitQuizResponse {
  session_id: string;
  attempt_id?: string;
  attempt_number?: number;
  difficulty?: string;
  is_fresh?: boolean;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  is_perfect: boolean;
  concept_breakdown: ConceptMasteryOverview[];
  missed_concepts: MissedConceptReport[];
  encouragement_note: string;
}

export interface SessionRecord {
  id: string;
  subject: string;
  topic: string;
  created_at: string;
  image_preview?: string;
  key_concepts: string[];
  quiz_score?: number;
  total_questions?: number;
  flashcards_count: number;
  weak_concepts_count: number;
}

export interface HealthStatus {
  status: string;
  app_version: string;
  model_provider: string;
  model_name: string;
  model_license: string;
  is_open_weight: boolean;
  local_runtime_available: boolean;
  active_sessions_count: number;
  database_ok: boolean;
}

export interface OverallStats {
  total_sessions: number;
  avg_quiz_score: number;
  flashcards_reviewed: number;
  weak_concepts: number;
  mastered_concepts: number;
}

export interface SampleMaterial {
  id: string;
  subject: string;
  topic: string;
  summary: string;
  key_concepts: string[];
  filename: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isVoice?: boolean;
  timestamp: string;
  citations?: string[];
  relatedConcepts?: string[];
}

export interface AssistantAskResponse {
  answer: string;
  source_citations: string[];
  related_concepts: string[];
  is_voice: boolean;
  language: string;
  model_used: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'student' | 'admin';
  token?: string;
  avatar?: string;
  streakDays?: number;
  totalStudyHours?: number;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  color: string;
  created_by: string;
  created_at: string;
  notes_count: number;
}

export interface CommunityNote {
  id: string;
  title: string;
  description?: string;
  subject: string;
  category: string;
  tags: string[];
  file_name: string;
  file_type: string;
  file_size: number;
  file_data?: string;
  preview_image?: string;
  extracted_summary?: string;
  author_id: string;
  author_name: string;
  status: 'pending' | 'approved' | 'published' | 'rejected' | 'archived';
  folder_id?: string;
  folder_name?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExploreNotesResponse {
  notes: CommunityNote[];
  total_count: number;
  page: number;
  limit: number;
  categories: string[];
  folders: Folder[];
}

