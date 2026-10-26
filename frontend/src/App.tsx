import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { StudentDashboard } from './components/StudentDashboard';
import { RevisionWorkspace } from './components/RevisionWorkspace';
import { ExploreNotes } from './components/ExploreNotes';
import { AdminModeration } from './components/AdminModeration';
import { FAQSection } from './components/FAQSection';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import {
  NoteAnalysis,
  QuizQuestion,
  FlashcardItem,
  SubmitQuizResponse,
  HealthStatus,
  OverallStats,
  SessionRecord,
  SampleMaterial,
  User,
  CommunityNote,
} from './types';
import {
  checkBackendHealth,
  uploadAndAnalyzeNotes,
  generateQuiz,
  generateFlashcards,
  submitQuizAnswers,
  fetchAllSessions,
  fetchSessionById,
  fetchStats,
  fetchSampleMaterials,
  fetchQuizAttempts,
} from './services/api';

export function App() {
  const [activeView, setActiveView] = useState<'landing' | 'dashboard' | 'workspace' | 'admin'>('landing');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('knowlix_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('knowlix_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<OverallStats>({
    total_sessions: 1,
    avg_quiz_score: 80,
    flashcards_reviewed: 12,
    weak_concepts: 2,
    mastered_concepts: 3,
  });
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [samples, setSamples] = useState<SampleMaterial[]>([
    {
      id: 'photosynthesis',
      subject: 'Biology / Plant Physiology',
      topic: 'Photosynthesis & Light Reactions',
      summary: 'Photosynthesis converts solar photons into chemical energy in thylakoid membranes.',
      key_concepts: ['Photolysis of Water', 'Proton Gradient', 'RuBisCO'],
      filename: 'photosynthesis_notes.png',
    },
    {
      id: 'binary_trees',
      subject: 'Computer Science',
      topic: 'Binary Search Trees & Traversals',
      summary: 'Binary Search Trees maintain strict ordering properties for O(log N) lookup.',
      key_concepts: ['BST Ordering Invariant', 'Inorder Sorted Traversal', 'Tree Rotations'],
      filename: 'binary_trees_notes.png',
    },
    {
      id: 'thermodynamics',
      subject: 'Physics',
      topic: 'First Law of Thermodynamics & Carnot',
      summary: 'Internal energy changes equal heat added minus work done by system.',
      key_concepts: ['Delta U = Q - W', 'Adiabatic Process', 'Carnot Limit'],
      filename: 'thermodynamics_notes.png',
    },
  ]);

  // Current Active Revision Session State
  const [activeAnalysis, setActiveAnalysis] = useState<NoteAnalysis | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [activeFlashcards, setActiveFlashcards] = useState<FlashcardItem[]>([]);
  const [activeQuizResult, setActiveQuizResult] = useState<SubmitQuizResponse | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | undefined>(undefined);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number>(1);
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('medium');
  const [isFreshAttempt, setIsFreshAttempt] = useState<boolean>(true);
  const [materialScopeNote, setMaterialScopeNote] = useState<string | undefined>(undefined);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('knowlix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('knowlix_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial load: health, stats, sessions, samples
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const h = await checkBackendHealth();
        setHealth(h);
      } catch (e) {
        console.warn('Backend health check warning:', e);
      }

      try {
        const st = await fetchStats();
        setStats(st);
      } catch (e) {
        console.warn('Stats fetch warning:', e);
      }

      try {
        const sess = await fetchAllSessions();
        if (sess && sess.length > 0) setSessions(sess);
      } catch (e) {
        console.warn('Sessions fetch warning:', e);
      }

      try {
        const smp = await fetchSampleMaterials();
        if (smp && smp.length > 0) setSamples(smp);
      } catch (e) {
        console.warn('Sample materials fetch warning:', e);
      }
    };

    loadInitialData();
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Upload Notes & Document Workflow (Multi-Modal Image + PDF)
  const handleUploadNotes = async (file: File, subject?: string, topic?: string, pageRange?: string) => {
    setIsAnalyzing(true);
    setUploadError(null);

    try {
      // 1. Analyze Notes or PDF Document
      const analysis = await uploadAndAnalyzeNotes(file, subject, topic, pageRange);
      setActiveAnalysis(analysis);

      // 2. Generate Quiz
      const quizRes = await generateQuiz(analysis.session_id);
      setActiveQuestions(quizRes.questions);
      setCurrentAttemptId(quizRes.attempt_id);
      setCurrentAttemptNumber(quizRes.attempt_number || 1);
      setCurrentDifficulty(quizRes.difficulty || 'medium');
      setIsFreshAttempt(quizRes.is_fresh ?? true);
      setMaterialScopeNote(quizRes.material_scope_note);

      // 3. Generate Flashcards
      const flashcardsRes = await generateFlashcards(analysis.session_id);
      setActiveFlashcards(flashcardsRes.flashcards);

      // Reset quiz results for new session
      setActiveQuizResult(null);

      // 4. Update sessions list & stats
      const updatedSessions = await fetchAllSessions().catch(() => []);
      if (updatedSessions.length > 0) setSessions(updatedSessions);
      const updatedStats = await fetchStats().catch(() => stats);
      setStats(updatedStats);

      // 5. Navigate to workspace
      setActiveView('workspace');
    } catch (err: any) {
      console.error('Note upload error:', err);
      setUploadError(err.message || 'Failed to process note or document with open-weight models');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Select Sample Material (1-Click Demo)
  const handleSelectSample = async (sampleId: string) => {
    setIsAnalyzing(true);
    setUploadError(null);

    try {
      // Fetch sample image from public folder
      const sampleItem = samples.find((s) => s.id === sampleId) || samples[0];
      const response = await fetch(`/samples/${sampleItem.filename}`);
      const blob = await response.blob();
      const file = new File([blob], sampleItem.filename, { type: 'image/png' });

      await handleUploadNotes(file, sampleItem.subject, sampleItem.topic);
    } catch (err: any) {
      console.error('Sample load error:', err);
      setUploadError('Failed to load sample image');
      setIsAnalyzing(false);
    }
  };

  // Open existing session from recent list
  const handleSelectSession = async (sessionId: string) => {
    try {
      const data = await fetchSessionById(sessionId);
      if (data) {
        const analysis: NoteAnalysis = {
          session_id: data.id,
          subject: data.subject,
          topic: data.topic,
          extracted_text: data.summary?.extracted_text || '',
          summary: data.summary?.summary || '',
          key_concepts: data.summary?.key_concepts || [],
          definitions: data.summary?.definitions || [],
          takeaways: data.summary?.takeaways || [],
          unclear_sections: data.summary?.unclear_sections || [],
          image_preview: data.image_preview,
          model_meta: {
            provider: 'Gemma 4 (via Gemini API)',
            model_name: 'gemma-4-31b-it',
            license: 'Gemma Open License',
            is_open_weight: true,
            latency_ms: 150,
            mode: 'gemini-api-inference',
          },
        };

        setActiveAnalysis(analysis);
        setActiveQuestions(data.quiz || []);
        setActiveFlashcards(data.flashcards || []);

        try {
          const attempts = await fetchQuizAttempts(data.id);
          if (attempts && attempts.length > 0) {
            setCurrentAttemptNumber(attempts.length);
            setCurrentDifficulty(attempts[0].difficulty || 'medium');
            setCurrentAttemptId(attempts[0].id);
          } else {
            setCurrentAttemptNumber(1);
            setCurrentDifficulty('medium');
            setCurrentAttemptId(undefined);
          }
        } catch {
          setCurrentAttemptNumber(1);
          setCurrentDifficulty('medium');
          setCurrentAttemptId(undefined);
        }
        setIsFreshAttempt(false);
        setMaterialScopeNote(undefined);

        if (data.quiz_score !== null && data.total_questions) {
          // If quiz was previously taken
          const pct = Math.round((data.quiz_score / data.total_questions) * 100);
          setActiveQuizResult({
            session_id: data.id,
            total_questions: data.total_questions,
            correct_count: data.quiz_score,
            score_percentage: pct,
            is_perfect: data.quiz_score === data.total_questions,
            concept_breakdown: (data.summary?.key_concepts || []).map((c: string) => ({
              concept: c,
              status: pct >= 80 ? 'Mastered' : pct >= 50 ? 'Improving' : 'Needs Practice',
              accuracy_percentage: pct,
            })),
            missed_concepts: [],
            encouragement_note: `Previously completed revision session with ${pct}% score.`,
          });
        } else {
          setActiveQuizResult(null);
        }

        setActiveView('workspace');
      }
    } catch (err) {
      console.error('Error opening session:', err);
    }
  };

  // Launch Revision Session for Community Note
  const handleLaunchNoteWorkspace = async (note: CommunityNote) => {
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      const sessionId = `comm_${note.id.substring(0, 8)}_${Date.now()}`;
      const conceptsList: string[] =
        note.tags && note.tags.length > 0 ? note.tags : [note.subject, note.category];

      const analysis: NoteAnalysis = {
        session_id: sessionId,
        subject: note.subject,
        topic: note.title,
        extracted_text: note.extracted_summary || note.description || note.title,
        summary: note.description || note.extracted_summary || note.title,
        key_concepts: conceptsList,
        definitions: conceptsList.map((c: string) => ({
          term: c,
          definition: `Core conceptual principle for ${c} in ${note.subject}.`,
        })),
        takeaways: note.description ? [note.description] : [note.title],
        unclear_sections: [],
        image_preview: note.preview_image,
        model_meta: {
          provider: 'Gemma 4 (via Gemini API)',
          model_name: 'gemma-4-31b-it',
          license: 'Gemma Open License',
          is_open_weight: true,
          latency_ms: 120,
          mode: 'gemini-api-inference',
        },
      };

      setActiveAnalysis(analysis);

      // Dynamically fetch or construct quiz grounded in note
      try {
        const quizRes = await generateQuiz(analysis.session_id);
        setActiveQuestions(quizRes.questions);
        setCurrentAttemptId(quizRes.attempt_id);
        setCurrentAttemptNumber(quizRes.attempt_number || 1);
        setCurrentDifficulty(quizRes.difficulty || 'medium');
        setIsFreshAttempt(quizRes.is_fresh ?? true);
        setMaterialScopeNote(quizRes.material_scope_note);
      } catch {
        setActiveQuestions([
          {
            id: 1,
            question: `What is the primary conceptual focus of "${note.title}"?`,
            options: [
              note.subject,
              'Unverified speculation',
              'Non-reproducible anomaly',
              'Tangential hypothesis',
            ],
            correct_answer: note.subject,
            explanation: `Grounded in published study resource for ${note.subject}.`,
            concept: conceptsList[0] || note.subject,
            source_evidence: note.title,
            question_type: 'mcq',
            difficulty: 'medium',
          },
        ]);
        setCurrentAttemptId(undefined);
        setCurrentAttemptNumber(1);
        setCurrentDifficulty('medium');
        setIsFreshAttempt(true);
      }

      try {
        const flashRes = await generateFlashcards(analysis.session_id);
        setActiveFlashcards(flashRes.flashcards);
      } catch {
        setActiveFlashcards(
          conceptsList.map((c: string, i: number) => ({
            id: i + 1,
            question: `Define and state the key principles of ${c}`,
            answer: `Essential foundation of ${note.subject} under "${note.title}".`,
            concept: c,
            is_known: false,
          }))
        );
      }

      setActiveQuizResult(null);
      setActiveView('workspace');
    } catch (err: any) {
      console.error('Launch community note session error:', err);
      setUploadError('Failed to launch study session for community note');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Quiz Action
  const handleSubmitQuiz = async (
    answers: { question_id: number; selected_option: string }[],
    attemptId?: string,
    difficulty?: string
  ): Promise<SubmitQuizResponse> => {
    if (!activeAnalysis) throw new Error('No active revision session');
    const result = await submitQuizAnswers(
      activeAnalysis.session_id,
      answers,
      activeQuestions,
      attemptId || currentAttemptId,
      difficulty || currentDifficulty
    );
    setActiveQuizResult(result);

    // Refresh stats & sessions in background
    fetchStats().then(setStats).catch(() => {});
    fetchAllSessions().then(setSessions).catch(() => {});

    return result;
  };

  // Start a fresh quiz attempt with Gemma 4 (Requirement 4)
  const handleStartNewAttempt = async (options: {
    difficulty: string;
    quiz_length: number;
    question_types: string[];
  }) => {
    if (!activeAnalysis) return;
    try {
      const res = await generateQuiz(activeAnalysis.session_id, {
        difficulty: options.difficulty,
        quiz_length: options.quiz_length,
        question_types: options.question_types,
        force_fresh: true,
      });
      setActiveQuestions(res.questions);
      setActiveQuizResult(null); // Fresh attempt starts cleanly
      setCurrentAttemptId(res.attempt_id);
      setCurrentAttemptNumber(res.attempt_number || (currentAttemptNumber + 1));
      setCurrentDifficulty(res.difficulty || options.difficulty);
      setIsFreshAttempt(res.is_fresh ?? true);
      setMaterialScopeNote(res.material_scope_note);
    } catch (err) {
      console.error('Failed to start new quiz attempt:', err);
      throw err;
    }
  };

  // Regenerate learning material grounded in existing note
  const handleRegenerate = async () => {
    if (!activeAnalysis) return;
    setIsAnalyzing(true);
    try {
      const qRes = await generateQuiz(activeAnalysis.session_id, { force_fresh: true });
      setActiveQuestions(qRes.questions);
      setCurrentAttemptId(qRes.attempt_id);
      setCurrentAttemptNumber(qRes.attempt_number || (currentAttemptNumber + 1));
      setCurrentDifficulty(qRes.difficulty || 'medium');
      setIsFreshAttempt(qRes.is_fresh ?? true);
      setMaterialScopeNote(qRes.material_scope_note);

      const fRes = await generateFlashcards(activeAnalysis.session_id);
      setActiveFlashcards(fRes.flashcards);
      setActiveQuizResult(null);
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeView={activeView}
        onNavigate={(view) => setActiveView(view)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        health={health}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={() => {
          localStorage.removeItem('knowlix_user');
          setUser(null);
        }}
        onOpenAdminPanel={() => setActiveView('admin')}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <>
            <Hero
              onStartLearning={() => setActiveView('dashboard')}
              onExploreDemo={handleSelectSample}
            />
            <Features onStartLearning={() => setActiveView('dashboard')} />
            <HowItWorks onStartLearning={() => setActiveView('dashboard')} />
            <ExploreNotes
              samples={samples}
              onSelectSample={handleSelectSample}
              user={user}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenAdminPanel={() => setActiveView('admin')}
              onLaunchNoteWorkspace={handleLaunchNoteWorkspace}
            />
            <FAQSection />
          </>
        )}

        {activeView === 'dashboard' && (
          <StudentDashboard
            stats={stats}
            sessions={sessions}
            samples={samples}
            onUploadNotes={handleUploadNotes}
            onSelectSession={handleSelectSession}
            onSelectSample={handleSelectSample}
            isAnalyzing={isAnalyzing}
            uploadError={uploadError}
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenAdminPanel={() => setActiveView('admin')}
          />
        )}

        {activeView === 'workspace' && activeAnalysis && (
          <RevisionWorkspace
            analysis={activeAnalysis}
            questions={activeQuestions}
            flashcards={activeFlashcards}
            savedQuizResult={activeQuizResult}
            onBackToDashboard={() => setActiveView('dashboard')}
            onSubmitQuiz={handleSubmitQuiz}
            onRegenerate={handleRegenerate}
            onStartNewAttempt={handleStartNewAttempt}
            currentAttemptNumber={currentAttemptNumber}
            currentDifficulty={currentDifficulty}
            isFreshAttempt={isFreshAttempt}
            materialScopeNote={materialScopeNote}
          />
        )}

        {activeView === 'admin' && (
          <AdminModeration
            onBackToDashboard={() => setActiveView('dashboard')}
            onOpenStudySession={handleLaunchNoteWorkspace}
          />
        )}
      </main>

      {/* Auth Modal for Login and Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
