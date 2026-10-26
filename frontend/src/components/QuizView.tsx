import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trophy,
  Brain,
  RotateCcw,
  Check,
  FileCheck,
  Layers,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  RotateCw,
  History,
  SlidersHorizontal,
  X,
  ChevronRight,
  Clock,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, SubmitQuizResponse, QuizAttemptSummary, QuizAttemptDetail } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AudioListenButton } from './AudioListenButton';
import { fetchQuizAttempts, fetchQuizAttemptDetail } from '../services/api';

interface QuizViewProps {
  questions: QuizQuestion[];
  sessionId: string;
  onSubmitQuiz: (answers: { question_id: number; selected_option: string }[], attemptId?: string, difficulty?: string) => Promise<SubmitQuizResponse>;
  onOpenTeachMissed: (conceptName?: string) => void;
  savedQuizResult: SubmitQuizResponse | null;
  onStartNewAttempt?: (options: { difficulty: string; quiz_length: number; question_types: string[] }) => Promise<void>;
  currentAttemptNumber?: number;
  currentDifficulty?: string;
  isFreshAttempt?: boolean;
  materialScopeNote?: string;
}

export const QuizView: React.FC<QuizViewProps> = ({
  questions,
  sessionId,
  onSubmitQuiz,
  onOpenTeachMissed,
  savedQuizResult,
  onStartNewAttempt,
  currentAttemptNumber = 1,
  currentDifficulty = 'medium',
  isFreshAttempt = true,
  materialScopeNote,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<SubmitQuizResponse | null>(savedQuizResult);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [isVoiceQuizMode, setIsVoiceQuizMode] = useState(false);
  const [voiceSpokenStatus, setVoiceSpokenStatus] = useState<string | null>(null);

  // Attempt History & Configuration Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState<QuizAttemptSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingPastAttempt, setViewingPastAttempt] = useState<QuizAttemptDetail | null>(null);

  // Config options for new attempt
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>((currentDifficulty as any) || 'medium');
  const [selectedLength, setSelectedLength] = useState<number>(Math.max(3, questions.length || 5));
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'scenario']);
  const [isGeneratingNewAttempt, setIsGeneratingNewAttempt] = useState(false);

  const tts = useSpeechSynthesis();
  const speech = useSpeechRecognition('en-US');

  const currentQ = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Sync saved quiz result when prop updates
  useEffect(() => {
    setQuizResult(savedQuizResult);
  }, [savedQuizResult]);

  // Load history list when modal opens
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const attempts = await fetchQuizAttempts(sessionId);
      setAttemptHistory(attempts);
    } catch (e) {
      console.warn('Failed to load quiz attempt history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryModalOpen(true);
    loadHistory();
  };

  const handleInspectPastAttempt = async (attemptId: string) => {
    try {
      const detail = await fetchQuizAttemptDetail(attemptId);
      setViewingPastAttempt(detail);
    } catch (e) {
      console.error('Failed to load attempt detail:', e);
    }
  };

  // Build audio text for reading current question and options
  const buildQuestionSpeechText = (q: QuizQuestion, index: number) => {
    if (!q) return '';
    const optionsText = (q.options || [])
      .map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt}`)
      .join('. ');
    return `Question ${index + 1}: ${q.question}. ${optionsText}`;
  };

  // When switching questions in voice quiz mode, read aloud
  useEffect(() => {
    if (isVoiceQuizMode && currentQ && !quizResult) {
      const speechText = buildQuestionSpeechText(currentQ, currentIndex);
      tts.speak(speechText, `quiz-q-${currentQ.id}`);
    }
  }, [currentIndex, isVoiceQuizMode]);

  // Handle recognized spoken answer
  useEffect(() => {
    if (speech.transcript && isVoiceQuizMode && currentQ && !quizResult) {
      const text = speech.transcript.trim().toLowerCase();
      let matchedOption: string | null = null;

      const letters = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < currentQ.options.length; i++) {
        const letter = letters[i];
        const optText = currentQ.options[i].toLowerCase();

        if (
          text.includes(`option ${letter}`) ||
          text.includes(`choice ${letter}`) ||
          text.includes(`answer ${letter}`) ||
          text === letter ||
          text.startsWith(`${letter} `) ||
          text.endsWith(` ${letter}`) ||
          (optText.length > 5 && text.includes(optText))
        ) {
          matchedOption = currentQ.options[i];
          break;
        }
      }

      if (matchedOption) {
        handleSelectOption(matchedOption);
        setVoiceSpokenStatus(`Selected: ${matchedOption}`);
        speech.stopListening();
        speech.resetTranscript();
      } else {
        setVoiceSpokenStatus(`Heard: "${speech.transcript}". Say e.g. "Option A" or click directly.`);
      }
    }
  }, [speech.transcript]);

  const handleSelectOption = (option: string) => {
    if (quizResult || !currentQ) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: option,
    }));
  };

  const handleNext = () => {
    setVoiceSpokenStatus(null);
    speech.resetTranscript();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setVoiceSpokenStatus(null);
    speech.resetTranscript();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRepeatQuestion = () => {
    if (currentQ) {
      tts.speak(buildQuestionSpeechText(currentQ, currentIndex), `quiz-q-${currentQ.id}`);
    }
  };

  const handleSubmit = async () => {
    if (answeredCount === 0) return;
    tts.stop();
    speech.stopListening();
    setIsSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option: selectedAnswers[q.id] || '',
      }));
      const res = await onSubmitQuiz(payload, undefined, selectedDifficulty);
      setQuizResult(res);

      if (res.score_percentage >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Launch a fresh new quiz attempt
  const handleConfirmNewAttempt = async () => {
    setIsGeneratingNewAttempt(true);
    tts.stop();
    speech.stopListening();
    try {
      if (onStartNewAttempt) {
        await onStartNewAttempt({
          difficulty: selectedDifficulty,
          quiz_length: selectedLength,
          question_types: selectedTypes,
        });
      }
      setSelectedAnswers({});
      setQuizResult(null);
      setShowReviewScreen(false);
      setCurrentIndex(0);
      setVoiceSpokenStatus(null);
      setIsConfigModalOpen(false);
    } catch (e) {
      console.error('Failed to start new attempt:', e);
    } finally {
      setIsGeneratingNewAttempt(false);
    }
  };

  const handleQuickRetake = async () => {
    // Quick retake launches a new attempt with same config
    if (onStartNewAttempt) {
      setIsGeneratingNewAttempt(true);
      try {
        await onStartNewAttempt({
          difficulty: selectedDifficulty,
          quiz_length: selectedLength,
          question_types: selectedTypes,
        });
        setSelectedAnswers({});
        setQuizResult(null);
        setShowReviewScreen(false);
        setCurrentIndex(0);
        setVoiceSpokenStatus(null);
      } catch (e) {
        console.error('Quick retake error:', e);
      } finally {
        setIsGeneratingNewAttempt(false);
      }
    } else {
      setSelectedAnswers({});
      setQuizResult(null);
      setShowReviewScreen(false);
      setCurrentIndex(0);
    }
  };

  // 1. Review Screen for Past Attempt (from History)
  if (viewingPastAttempt) {
    const rev = viewingPastAttempt.review;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setViewingPastAttempt(null)}
            className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Attempt History</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Attempt #{viewingPastAttempt.attempt_number}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Score: {viewingPastAttempt.score_percentage}% ({viewingPastAttempt.score}/{viewingPastAttempt.total_questions})
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {viewingPastAttempt.questions.map((q, idx) => {
            const studentAnsObj = (viewingPastAttempt.student_answers || []).find((a) => a.question_id === q.id);
            const studentChoice = studentAnsObj ? studentAnsObj.selected_option : '';
            const isCorrect = studentChoice?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition bg-white dark:bg-slate-900 ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900'
                    : 'border-rose-200 dark:border-rose-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      Question {idx + 1} • {q.concept}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {q.question_type || 'MCQ'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">
                  {q.question}
                </h4>

                <div className="space-y-1.5 text-xs sm:text-sm mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-500">Your Selection: </span>
                    <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      {studentChoice || '(No response)'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">Verified Answer: </span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-bold">
                        {q.correct_answer}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Review Screen for Current Attempt
  if (quizResult && showReviewScreen) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setShowReviewScreen(false)}
            className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Result Overview</span>
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            Score: {quizResult.score_percentage}% ({quizResult.correct_count}/{quizResult.total_questions})
          </span>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const studentChoice = selectedAnswers[q.id];
            const isCorrect = studentChoice?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition bg-white dark:bg-slate-900 ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900'
                    : 'border-rose-200 dark:border-rose-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      Question {idx + 1} • {q.concept}
                    </span>
                    <AudioListenButton
                      tts={tts}
                      textToSpeak={`Question ${idx + 1}: ${q.question}. You answered: ${studentChoice || 'no answer'}. ${isCorrect ? 'That is correct!' : `The correct answer is: ${q.correct_answer}.`} Explanation: ${q.explanation}`}
                      itemId={`review-q-${q.id}`}
                      label="Listen"
                      size="sm"
                      variant="ghost"
                    />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">
                  {q.question}
                </h4>

                <div className="space-y-1.5 text-xs sm:text-sm mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-500">Your Selection: </span>
                    <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      {studentChoice || '(No answer provided)'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">Correct Answer: </span>
                      <span className="text-emerald-900 dark:text-emerald-100 font-bold">
                        {q.correct_answer}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                  {q.explanation}
                </p>

                {q.source_evidence && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Source citation: &ldquo;{q.source_evidence}&rdquo;
                  </p>
                )}

                {!isCorrect && (
                  <div className="mt-3 pt-2 flex justify-end">
                    <button
                      onClick={() => onOpenTeachMissed(q.concept)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Learn &amp; Practice {q.concept} →</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Post-Submission Results Card
  if (quizResult && !showReviewScreen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl space-y-6 text-center"
      >
        <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Trophy className="w-10 h-10" />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
            <span>Attempt #{quizResult.attempt_number || currentAttemptNumber}</span>
            <span>•</span>
            <span className="capitalize">{quizResult.difficulty || currentDifficulty}</span>
            <span>•</span>
            <span>Verified Server Key</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
            {quizResult.score_percentage}% Score
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            You answered {quizResult.correct_count} of {quizResult.total_questions} questions correctly
          </p>
        </div>

        {/* Encouragement note */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-left">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
              {quizResult.encouragement_note}
            </p>
          </div>
        </div>

        {/* Concept breakdown tags */}
        <div className="text-left space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Concept-by-Concept Accuracy
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quizResult.concept_breakdown.map((cb) => (
              <div
                key={cb.concept}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                  {cb.concept}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    cb.status === 'Mastered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : cb.status === 'Improving'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {cb.accuracy_percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* New Attempt Button (Fresh Questions guaranteed) */}
          <button
            onClick={handleQuickRetake}
            disabled={isGeneratingNewAttempt}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isGeneratingNewAttempt ? 'Generating Fresh Quiz...' : 'Take New Quiz Attempt ✨'}</span>
          </button>

          {quizResult.missed_concepts.length > 0 ? (
            <button
              onClick={() => onOpenTeachMissed()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-500 shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4 text-amber-300" />
              <span>Teach Me What I Missed ({quizResult.missed_concepts.length})</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenTeachMissed()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Mastery Challenge Round!</span>
            </button>
          )}

          <button
            onClick={() => setShowReviewScreen(true)}
            className="w-full sm:w-auto px-4 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Review Answers
          </button>

          <button
            onClick={handleOpenHistory}
            className="w-full sm:w-auto px-4 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
            title="View past attempts"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // 4. Active Question View
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Dynamic Attempt Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs">
            Attempt #{currentAttemptNumber}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {selectedDifficulty}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Gemma 4 Dynamic • Fresh Questions</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Configure new attempt */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            title="Configure a new quiz attempt with custom difficulty and length"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Configure Attempt</span>
          </button>

          {/* View attempt history */}
          <button
            type="button"
            onClick={handleOpenHistory}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            title="View past attempts and progression"
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Scope Note Notice (if note is brief or syllabus covered) */}
      {materialScopeNote && (
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{materialScopeNote}</span>
        </div>
      )}

      {/* Voice Mode Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Answering Mode:</span>
          <span className="text-[11px] text-slate-500">
            {isVoiceQuizMode ? 'Listen to questions and speak choices' : 'Standard click-to-answer'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsVoiceQuizMode(false);
              tts.stop();
              speech.stopListening();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
              !isVoiceQuizMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Standard Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              setIsVoiceQuizMode(true);
              if (currentQ) {
                tts.speak(buildQuestionSpeechText(currentQ, currentIndex), `quiz-q-${currentQ.id}`);
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              isVoiceQuizMode
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Voice Quiz Mode 🎙️</span>
          </button>
        </div>
      </div>

      {/* Voice Quiz Active Controls */}
      {isVoiceQuizMode && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/90 to-violet-900/90 text-white border border-indigo-700/50 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300">Voice Quiz Audio Active</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRepeatQuestion}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
                title="Repeat question aloud"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Repeat Question</span>
              </button>

              <button
                type="button"
                onClick={speech.isListening ? speech.stopListening : speech.startListening}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  speech.isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                {speech.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{speech.isListening ? 'Listening (Speak A, B, C, D)...' : 'Speak Answer (Mic)'}</span>
              </button>
            </div>
          </div>

          {voiceSpokenStatus && (
            <div className="p-2.5 rounded-xl bg-white/10 text-xs text-indigo-100 flex items-center justify-between">
              <span>{voiceSpokenStatus}</span>
              <button
                type="button"
                onClick={() => setVoiceSpokenStatus(null)}
                className="text-[10px] text-indigo-300 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress & Question Navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{answeredCount} of {totalQuestions} Answered</span>
        </div>

        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          {questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setVoiceSpokenStatus(null);
                }}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
                    : isAnswered
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
          className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                {currentQ.concept}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {currentQ.question_type || 'Multiple Choice'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AudioListenButton
                tts={tts}
                textToSpeak={buildQuestionSpeechText(currentQ, currentIndex)}
                itemId={`q-audio-${currentQ.id}`}
                label="Listen Question"
                size="sm"
                variant="subtle"
              />
              <span className="text-xs text-slate-400 font-mono">1 pt</span>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
            {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === option;
              const letter = String.fromCharCode(65 + optIdx);

              return (
                <button
                  key={option}
                  onClick={() => handleSelectOption(option)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-white shadow-xs'
                      : 'border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {letter}
                  </div>
                  <span className="leading-relaxed flex-1">{option}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentIndex === 0
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              {currentIndex < totalQuestions - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || answeredCount === 0}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition flex items-center gap-1.5 cursor-pointer ${
                  isSubmitting || answeredCount === 0
                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit Quiz'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal: Configure New Quiz Attempt */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
            >
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Fresh Gemma 4 Questions Every Attempt</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Configure Quiz Attempt #{currentAttemptNumber + 1}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose length, difficulty, and format. Questions already asked in previous attempts will be excluded.
                </p>
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'easy', label: 'Foundational', desc: 'Direct definitions & facts' },
                    { id: 'medium', label: 'Standard', desc: 'Core mechanisms & reasoning' },
                    { id: 'hard', label: 'Advanced', desc: 'Scenarios & edge cases' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(d.id as any)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        selectedDifficulty === d.id
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-950 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Length */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setSelectedLength(len)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        selectedLength === len
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {len} Questions
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Formats */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Question Formats
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes('mcq')}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTypes([...selectedTypes, 'mcq']);
                        else if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter((t) => t !== 'mcq'));
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Multiple Choice</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes('true_false')}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTypes([...selectedTypes, 'true_false']);
                        else if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter((t) => t !== 'true_false'));
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">True / False</span>
                  </label>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNewAttempt}
                  disabled={isGeneratingNewAttempt}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isGeneratingNewAttempt ? 'Generating...' : 'Start Fresh Attempt'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Attempt History Drawer */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl max-h-[85vh] flex flex-col p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Quiz Attempt History
                    </h3>
                    <p className="text-xs text-slate-500">
                      Track score progression across consecutive attempts
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* History List */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                {loadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Loading attempt records...
                  </div>
                ) : attemptHistory.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      No attempts recorded yet for this session.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Complete your first quiz to track scores over time!
                    </p>
                  </div>
                ) : (
                  attemptHistory.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 hover:border-indigo-400 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Attempt #{att.attempt_number}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {att.difficulty}
                          </span>
                          {att.is_fresh && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Fresh Questions
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(att.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span>•</span>
                          <span>{att.quiz_length} questions</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {att.score !== null && att.score !== undefined ? (
                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900 dark:text-white">
                              {att.score_percentage}%
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {att.score}/{att.total_questions} correct
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">
                            In Progress
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsHistoryModalOpen(false);
                            handleInspectPastAttempt(att.id);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
