import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  HelpCircle,
  Layers,
  Brain,
  Target,
  ArrowLeft,
  ImageIcon,
  RefreshCw,
  Sparkles,
  Cpu,
  X,
  ExternalLink,
  Bot,
  Mic,
} from 'lucide-react';
import {
  NoteAnalysis,
  QuizQuestion,
  FlashcardItem,
  SubmitQuizResponse,
  MissedConceptReport,
} from '../types';
import { SummaryView } from './SummaryView';
import { QuizView } from './QuizView';
import { FlashcardsView } from './FlashcardsView';
import { TeachMeMissed } from './TeachMeMissed';
import { WeakTopicsView } from './WeakTopicsView';
import { AIStudyAssistant } from './AIStudyAssistant';

interface RevisionWorkspaceProps {
  analysis: NoteAnalysis;
  questions: QuizQuestion[];
  flashcards: FlashcardItem[];
  savedQuizResult: SubmitQuizResponse | null;
  onBackToDashboard: () => void;
  onSubmitQuiz: (answers: { question_id: number; selected_option: string }[], attemptId?: string, difficulty?: string) => Promise<SubmitQuizResponse>;
  onRegenerate: () => void;
  onStartNewAttempt?: (options: { difficulty: string; quiz_length: number; question_types: string[] }) => Promise<void>;
  currentAttemptNumber?: number;
  currentDifficulty?: string;
  isFreshAttempt?: boolean;
  materialScopeNote?: string;
}

export const RevisionWorkspace: React.FC<RevisionWorkspaceProps> = ({
  analysis,
  questions,
  flashcards,
  savedQuizResult,
  onBackToDashboard,
  onSubmitQuiz,
  onRegenerate,
  onStartNewAttempt,
  currentAttemptNumber = 1,
  currentDifficulty = 'medium',
  isFreshAttempt = true,
  materialScopeNote,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'flashcards' | 'teach' | 'weak' | 'assistant'>('summary');
  const [targetConceptForTeach, setTargetConceptForTeach] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // If student has taken quiz and missed questions, compute them for Teach Me What I Missed
  const missedReports: MissedConceptReport[] = savedQuizResult?.missed_concepts || [];
  const isPerfect = savedQuizResult?.is_perfect || false;

  const handleOpenTeachMissed = (conceptName?: string) => {
    setTargetConceptForTeach(conceptName || null);
    setActiveTab('teach');
  };

  const handlePracticeWeakConcept = (conceptName: string) => {
    setTargetConceptForTeach(conceptName);
    setActiveTab('teach');
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'quiz', label: 'Quiz (5 MCQs)', icon: HelpCircle, badge: savedQuizResult ? `${savedQuizResult.score_percentage}%` : undefined },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, badge: `${flashcards.length}` },
    { id: 'teach', label: 'Teach Me What I Missed ✨', icon: Brain, badge: missedReports.length > 0 ? `${missedReports.length}` : undefined, highlight: true },
    { id: 'weak', label: 'Weak Topics', icon: Target },
    { id: 'assistant', label: 'AI Study Assistant', icon: Bot, badge: 'Voice' },
  ];

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Workspace Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {analysis.subject}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Session ID: {analysis.session_id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {analysis.topic}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Source Image button */}
          {analysis.image_preview && (
            <button
              onClick={() => setShowImageModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>View Source Notes Photo</span>
            </button>
          )}

          {/* Regenerate learning material button */}
          <button
            onClick={onRegenerate}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            title="Regenerate questions and flashcards grounded in this material"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Regenerate Learning Material</span>
          </button>
        </div>
      </div>

      {/* Model Attribution Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-2 gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          <span>Inference Model: <strong className="text-slate-700 dark:text-slate-300">{analysis.model_meta.model_name}</strong></span>
          <span>•</span>
          <span>License: <strong className="text-slate-700 dark:text-slate-300">{analysis.model_meta.license}</strong></span>
        </div>
        <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
          Grounded In Source Notes • Hallucination Filter Active
        </div>
      </div>

      {/* Workspace Tabs Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    tab.highlight
                      ? 'bg-rose-500 text-white'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Workspace Tab Content */}
      <div className="pt-2">
        {activeTab === 'summary' && (
          <SummaryView
            analysis={analysis}
            onGoToQuiz={() => setActiveTab('quiz')}
            onGoToFlashcards={() => setActiveTab('flashcards')}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            questions={questions}
            sessionId={analysis.session_id}
            onSubmitQuiz={onSubmitQuiz}
            onOpenTeachMissed={handleOpenTeachMissed}
            savedQuizResult={savedQuizResult}
            onStartNewAttempt={onStartNewAttempt}
            currentAttemptNumber={currentAttemptNumber}
            currentDifficulty={currentDifficulty}
            isFreshAttempt={isFreshAttempt}
            materialScopeNote={materialScopeNote}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            initialFlashcards={flashcards}
            sessionId={analysis.session_id}
          />
        )}

        {activeTab === 'teach' && (
          <TeachMeMissed
            sessionId={analysis.session_id}
            missedReports={missedReports}
            isPerfectScore={isPerfect}
            onReturnToQuiz={() => setActiveTab('quiz')}
            targetConcept={targetConceptForTeach}
          />
        )}

        {activeTab === 'weak' && (
          <WeakTopicsView
            concepts={analysis.key_concepts}
            breakdown={savedQuizResult?.concept_breakdown || []}
            onPracticeConcept={handlePracticeWeakConcept}
          />
        )}

        {activeTab === 'assistant' && (
          <AIStudyAssistant
            sessionId={analysis.session_id}
            topicTitle={analysis.topic}
            subjectTitle={analysis.subject}
            initialContextSummary={analysis.summary}
          />
        )}
      </div>

      {/* Source Notes Modal */}
      <AnimatePresence>
        {showImageModal && analysis.image_preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>Original Uploaded Study Material • {analysis.topic}</span>
                </span>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950/90 max-h-[80vh]">
                <img
                  src={analysis.image_preview}
                  alt="Original handwritten note"
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
