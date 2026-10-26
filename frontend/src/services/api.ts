import {
  NoteAnalysis,
  QuizQuestion,
  FlashcardItem,
  SubmitQuizResponse,
  GenerateQuizResponse,
  QuizAttemptSummary,
  QuizAttemptDetail,
  HealthStatus,
  OverallStats,
  SampleMaterial,
  AssistantAskResponse,
  User,
  Folder,
  CommunityNote,
  ExploreNotesResponse
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('knowlix_token');
}

export function authHeader(token?: string | null): Record<string, string> {
  const tok = token || getStoredToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function uploadAndAnalyzeNotes(
  file: File,
  subject?: string,
  topic?: string,
  pageRange?: string
): Promise<NoteAnalysis> {
  const formData = new FormData();
  formData.append('file', file);
  if (subject) formData.append('subject', subject);
  if (topic) formData.append('topic', topic);
  if (pageRange) formData.append('page_range', pageRange);

  const res = await fetch(`${API_BASE}/analyze-notes`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to analyze material' }));
    throw new Error(errorData.detail || 'Failed to analyze material');
  }

  return res.json();
}

export async function generateQuiz(
  sessionId: string,
  options?: {
    difficulty?: 'easy' | 'medium' | 'hard' | string;
    quiz_length?: number;
    question_types?: string[];
    force_fresh?: boolean;
  }
): Promise<GenerateQuizResponse> {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  if (options?.difficulty) formData.append('difficulty', options.difficulty);
  if (options?.quiz_length) formData.append('quiz_length', options.quiz_length.toString());
  if (options?.question_types && options.question_types.length > 0) {
    formData.append('question_types', JSON.stringify(options.question_types));
  }
  if (options?.force_fresh) formData.append('force_fresh', 'true');

  const res = await fetch(`${API_BASE}/generate-quiz`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate dynamic quiz' }));
    throw new Error(err.detail || 'Failed to generate dynamic quiz');
  }

  return res.json();
}

export async function fetchQuizAttempts(sessionId: string): Promise<QuizAttemptSummary[]> {
  const res = await fetch(`${API_BASE}/quiz/attempts?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch quiz attempts' }));
    throw new Error(err.detail || 'Failed to fetch quiz attempts');
  }
  return res.json();
}

export async function fetchQuizAttemptDetail(attemptId: string): Promise<QuizAttemptDetail> {
  const res = await fetch(`${API_BASE}/quiz/attempts/${encodeURIComponent(attemptId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch quiz attempt details' }));
    throw new Error(err.detail || 'Failed to fetch quiz attempt details');
  }
  return res.json();
}

export async function generateFlashcards(sessionId: string): Promise<{ flashcards: FlashcardItem[] }> {
  const formData = new FormData();
  formData.append('session_id', sessionId);

  const res = await fetch(`${API_BASE}/generate-flashcards`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate flashcards' }));
    throw new Error(err.detail || 'Failed to generate flashcards');
  }

  return res.json();
}

export async function submitQuizAnswers(
  sessionId: string,
  answers: { question_id: number; selected_option: string }[],
  quizItems?: QuizQuestion[],
  attemptId?: string,
  difficulty?: string
): Promise<SubmitQuizResponse> {
  const res = await fetch(`${API_BASE}/submit-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      answers,
      quiz_items: quizItems,
      attempt_id: attemptId,
      difficulty: difficulty || 'medium',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to evaluate quiz' }));
    throw new Error(err.detail || 'Failed to evaluate quiz');
  }

  return res.json();
}

export async function getTeachMissedDetails(
  sessionId: string,
  concept: string,
  simplificationLevel: 'beginner' | 'eli5' | 'analogy' = 'beginner',
  originalQuestion?: string,
  studentAnswer?: string,
  correctAnswer?: string
) {
  const res = await fetch(`${API_BASE}/teach-missed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      concept,
      simplification_level: simplificationLevel,
      original_question: originalQuestion,
      student_answer: studentAnswer,
      correct_answer: correctAnswer,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate explanation' }));
    throw new Error(err.detail || 'Failed to generate explanation');
  }

  return res.json();
}

export async function submitRetryFollowup(
  sessionId: string,
  concept: string,
  questionId: string,
  selectedOption: string,
  expectedAnswer: string,
  explanation?: string
) {
  const res = await fetch(`${API_BASE}/retry-missed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      concept,
      question_id: questionId,
      selected_option: selectedOption,
      expected_answer: expectedAnswer,
      explanation,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to evaluate retry' }));
    throw new Error(err.detail || 'Failed to evaluate retry');
  }

  return res.json();
}

export async function fetchAllSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchSessionById(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function fetchStats(): Promise<OverallStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch statistics');
  return res.json();
}

export async function fetchSampleMaterials(): Promise<SampleMaterial[]> {
  const res = await fetch(`${API_BASE}/sample-materials`);
  if (!res.ok) throw new Error('Failed to fetch sample materials');
  return res.json();
}

export async function askStudyAssistant(
  sessionId: string,
  question: string,
  isVoice: boolean = false,
  language: string = 'en-US'
): Promise<AssistantAskResponse> {
  const res = await fetch(`${API_BASE}/assistant/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      is_voice: isVoice,
      language,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to get answer from study assistant' }));
    throw new Error(err.detail || 'Failed to get answer from study assistant');
  }

  return res.json();
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
export async function registerUser(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  const data = await res.json();
  const userWithToken: User = { ...data.user, token: data.access_token };
  localStorage.setItem('knowlix_token', data.access_token);
  localStorage.setItem('knowlix_user', JSON.stringify(userWithToken));
  return { access_token: data.access_token, user: userWithToken };
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Invalid email or password');
  }
  const data = await res.json();
  const userWithToken: User = { ...data.user, token: data.access_token };
  localStorage.setItem('knowlix_token', data.access_token);
  localStorage.setItem('knowlix_user', JSON.stringify(userWithToken));
  return { access_token: data.access_token, user: userWithToken };
}

export async function fetchMe(token?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to retrieve user profile');
  return res.json();
}

// -------------------------------------------------------------
// Community Notes & Explore Endpoints
// -------------------------------------------------------------
export async function fetchExploreNotes(params?: {
  category?: string;
  folder_id?: string;
  search?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}): Promise<ExploreNotesResponse> {
  const q = new URLSearchParams();
  if (params?.category) q.append('category', params.category);
  if (params?.folder_id) q.append('folder_id', params.folder_id);
  if (params?.search) q.append('search', params.search);
  if (params?.sort_by) q.append('sort_by', params.sort_by);
  if (params?.page) q.append('page', String(params.page));
  if (params?.limit) q.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/explore/notes?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load explore notes');
  return res.json();
}

export async function fetchExploreFolders(): Promise<Folder[]> {
  const res = await fetch(`${API_BASE}/explore/folders`);
  if (!res.ok) throw new Error('Failed to load folders');
  return res.json();
}

export async function fetchNoteDetail(noteId: string, token?: string): Promise<CommunityNote> {
  const res = await fetch(`${API_BASE}/explore/notes/${noteId}`, {
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to retrieve note detail');
  return res.json();
}

export async function contributeNote(formData: FormData, token?: string): Promise<CommunityNote> {
  const res = await fetch(`${API_BASE}/explore/notes/contribute`, {
    method: 'POST',
    headers: { ...authHeader(token) },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to contribute note' }));
    throw new Error(err.detail || 'Failed to contribute note');
  }
  return res.json();
}

export async function fetchMySubmittedNotes(token?: string): Promise<CommunityNote[]> {
  const res = await fetch(`${API_BASE}/explore/my-notes`, {
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to fetch submitted notes');
  return res.json();
}

export async function recordNoteDownload(noteId: string, token?: string) {
  const res = await fetch(`${API_BASE}/explore/notes/${noteId}/download`, {
    method: 'POST',
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to download note');
  return res.json();
}

// -------------------------------------------------------------
// Administrator Moderation & Folders Endpoints
// -------------------------------------------------------------
export async function fetchAdminNotes(status: string = 'all', token?: string): Promise<CommunityNote[]> {
  const res = await fetch(`${API_BASE}/admin/notes?status=${status}`, {
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to fetch admin moderation queue');
  return res.json();
}

export async function moderateAdminNote(
  noteId: string,
  action: 'approve' | 'reject' | 'publish' | 'unpublish',
  rejectionReason?: string,
  folderId?: string,
  token?: string
): Promise<CommunityNote> {
  const res = await fetch(`${API_BASE}/admin/notes/${noteId}/moderate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify({
      action,
      rejection_reason: rejectionReason,
      folder_id: folderId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Moderation action failed' }));
    throw new Error(err.detail || 'Moderation action failed');
  }
  return res.json();
}

export async function assignAdminFolder(noteId: string, folderId: string | null, token?: string): Promise<CommunityNote> {
  const res = await fetch(`${API_BASE}/admin/notes/${noteId}/assign-folder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify({ folder_id: folderId }),
  });
  if (!res.ok) throw new Error('Failed to assign folder');
  return res.json();
}

export async function deleteAdminNote(noteId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/notes/${noteId}`, {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error('Failed to delete note');
}

export async function createAdminFolder(name: string, description: string, color: string, token?: string): Promise<Folder> {
  const res = await fetch(`${API_BASE}/admin/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify({ name, description, color }),
  });
  if (!res.ok) throw new Error('Failed to create folder');
  return res.json();
}

export async function updateAdminFolder(
  folderId: string,
  name?: string,
  description?: string,
  color?: string,
  token?: string
): Promise<Folder> {
  const res = await fetch(`${API_BASE}/admin/folders/${folderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify({ name, description, color }),
  });
  if (!res.ok) throw new Error('Failed to update folder');
  return res.json();
}

export async function deleteAdminFolder(folderId: string, force: boolean = false, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/folders/${folderId}?force=${force}`, {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete folder' }));
    throw new Error(err.detail || 'Failed to delete folder');
  }
}
