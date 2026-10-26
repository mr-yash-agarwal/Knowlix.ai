import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Trophy,
  Smile,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Volume2,
  Mic,
  MicOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MissedConceptReport, FollowupQuestion } from '../types';
import { getTeachMissedDetails, submitRetryFollowup } from '../services/api';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { AudioListenButton } from './AudioListenButton';

interface TeachMeMissedProps {
  sessionId: string;
  missedReports: MissedConceptReport[];
  isPerfectScore?: boolean;
  onReturnToQuiz: () => void;
  targetConcept?: string | null;
}

export const TeachMeMissed: React.FC<TeachMeMissedProps> = ({
  sessionId,
  missedReports,
  isPerfectScore = false,
  onReturnToQuiz,
  targetConcept = null,
}) => {
  // If there are missed concepts, pick the target or first one
  const initialIndex = targetConcept
    ? Math.max(0, missedReports.findIndex((r) => r.concept.toLowerCase() === targetConcept.toLowerCase()))
    : 0;

  const [activeConceptIndex, setActiveConceptIndex] = useState(initialIndex);
  const [simplificationLevel, setSimplificationLevel] = useState<'beginner' | 'eli5' | 'analogy'>('beginner');
  const [currentReports, setCurrentReports] = useState<MissedConceptReport[]>(missedReports);
  const [selectedFollowupOption, setSelectedFollowupOption] = useState<string>('');
  const [isEvaluatingRetry, setIsEvaluatingRetry] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
    message: string;
  } | null>(null);

  const tts = useSpeechSynthesis();
  const speech = useSpeechRecognition('en-US');

  const activeReport = currentReports[activeConceptIndex] || currentReports[0];

  // Handle spoken answer for targeted follow-up question
  useEffect(() => {
    if (speech.transcript && activeReport?.practice_question) {
      const text = speech.transcript.trim().toLowerCase();
      const options = activeReport.practice_question.options;
      const letters = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < options.length; i++) {
        const letter = letters[i];
        const optText = options[i].toLowerCase();
        if (
          text.includes(`option ${letter}`) ||
          text.includes(`choice ${letter}`) ||
          text === letter ||
          (optText.length > 5 && text.includes(optText))
        ) {
          setSelectedFollowupOption(options[i]);
          speech.stopListening();
          speech.resetTranscript();
          break;
        }
      }
    }
  }, [speech.transcript, activeReport]);

  // If student scored 100% on the quiz: Show Challenge Round
  if (isPerfectScore || currentReports.length === 0) {
    const challengeText = "If the studied system was exposed to a sudden environmental shock that doubles entropy, how would the equilibrium shift to restore stability? Analyze the relationship between the governing forces identified in your source summary.";
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 text-white shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-900 flex items-center justify-center shadow-lg">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-indigo-200">
            Perfection Unlocked • 100% Accuracy
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Mastery Challenge Round!
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-lg mx-auto">
            You scored 100% on the initial quiz! Because you made zero mistakes, our adaptive AI has generated a deep-thinking synthesis problem to test your high-level mastery.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Deep-Thinking Challenge Question
            </span>
            <AudioListenButton
              tts={tts}
              textToSpeak={challengeText}
              itemId="challenge-q"
              label="Listen Question"
              size="sm"
              variant="pill"
            />
          </div>
          <p className="text-sm sm:text-base font-semibold text-white">
            If the studied system was exposed to a sudden environmental shock that doubles entropy, how would the equilibrium shift to restore stability?
          </p>
          <div className="pt-2 text-xs text-indigo-200 italic">
            Analyze the relationship between the governing forces identified in your source summary.
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onReturnToQuiz}
            className="px-6 py-2.5 rounded-xl font-bold bg-white text-indigo-900 hover:bg-indigo-50 transition cursor-pointer"
          >
            Return to Revision Workspace
          </button>
        </div>
      </div>
    );
  }

  const handleLevelChange = async (level: 'beginner' | 'eli5' | 'analogy') => {
    setSimplificationLevel(level);
    try {
      const data = await getTeachMissedDetails(
        sessionId,
        activeReport.concept,
        level,
        activeReport.original_question,
        activeReport.student_answer,
        activeReport.correct_answer
      );
      // Update explanation in current report
      setCurrentReports((prev) =>
        prev.map((r, i) =>
          i === activeConceptIndex
            ? {
                ...r,
                simple_explanation: data.simpler_explanation,
                real_world_example: data.real_world_example,
              }
            : r
        )
      );
    } catch (e) {
      console.error('Error fetching simplified explanation:', e);
    }
  };

  const handleCheckFollowup = async () => {
    if (!selectedFollowupOption) return;
    setIsEvaluatingRetry(true);
    try {
      const res = await submitRetryFollowup(
        sessionId,
        activeReport.concept,
        activeReport.practice_question.id,
        selectedFollowupOption,
        activeReport.practice_question.correct_answer,
        activeReport.practice_question.explanation
      );

      setRetryFeedback({
        isCorrect: res.is_correct,
        explanation: res.explanation,
        message: res.encouraging_message,
      });

      // Update concept status in state
      setCurrentReports((prev) =>
        prev.map((r, i) =>
          i === activeConceptIndex
            ? {
                ...r,
                mastery_status: res.updated_mastery as any,
                attempts_count: r.attempts_count + 1,
              }
            : r
        )
      );

      if (res.is_correct) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Error submitting retry:', err);
    } finally {
      setIsEvaluatingRetry(false);
    }
  };

  const handleNextConcept = () => {
    if (activeConceptIndex < currentReports.length - 1) {
      setActiveConceptIndex((prev) => prev + 1);
      setSelectedFollowupOption('');
      setRetryFeedback(null);
    }
  };

  const handlePrevConcept = () => {
    if (activeConceptIndex > 0) {
      setActiveConceptIndex((prev) => prev - 1);
      setSelectedFollowupOption('');
      setRetryFeedback(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-amber-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Signature Adaptive Learning Coach</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Teach Me What I Missed
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl leading-relaxed">
            Mistakes are stepping stones to permanent memory. Let's break down your weak concepts with simpler language, real-world analogies, and targeted practice.
          </p>
        </div>

        <button
          onClick={onReturnToQuiz}
          className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 transition cursor-pointer shrink-0 shadow-xs"
        >
          Return to Quiz
        </button>
      </div>

      {/* Multiple Missed Concepts Selector Tabs */}
      {currentReports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentReports.map((report, idx) => {
            const isActive = idx === activeConceptIndex;
            return (
              <button
                key={report.concept}
                onClick={() => {
                  setActiveConceptIndex(idx);
                  setSelectedFollowupOption('');
                  setRetryFeedback(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <span>{report.concept}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    report.mastery_status === 'Mastered'
                      ? 'bg-emerald-500 text-white'
                      : report.mastery_status === 'Improving'
                      ? 'bg-blue-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {report.mastery_status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Personalized Learning Gap Card */}
      <motion.div
        key={activeReport.concept}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6"
      >
        {/* Top Status & Concept Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Focus Concept
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {activeReport.concept}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Mastery Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeReport.mastery_status === 'Mastered'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : activeReport.mastery_status === 'Improving'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {activeReport.mastery_status}
            </span>
          </div>
        </div>

        {/* The Mistake Breakdown Card */}
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Original Quiz Mistake</span>
            </div>
            <AudioListenButton
              tts={tts}
              textToSpeak={`Original quiz mistake for ${activeReport.concept}. Question was: ${activeReport.original_question}. You picked: ${activeReport.student_answer}. The correct answer is: ${activeReport.correct_answer}. Why tricky: ${activeReport.why_incorrect}`}
              itemId={`mistake-${activeReport.concept}`}
              label="Listen Mistake Breakdown"
              size="sm"
              variant="subtle"
            />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
            "{activeReport.original_question}"
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-rose-200/60 dark:border-rose-900">
              <span className="font-semibold text-slate-500">You Picked: </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">{activeReport.student_answer}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-900">
              <span className="font-semibold text-slate-500">Correct Answer: </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeReport.correct_answer}</span>
            </div>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 pt-1">
            <span className="font-bold">Why tricky: </span> {activeReport.why_incorrect}
          </p>
        </div>

        {/* Simpler Explanation & Analogies */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-indigo-200/60 dark:border-indigo-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Simpler Explanation
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <AudioListenButton
                tts={tts}
                textToSpeak={`Explanation for ${activeReport.concept}: ${activeReport.simple_explanation}. Real world analogy: ${activeReport.real_world_example}`}
                itemId={`explanation-${activeReport.concept}-${simplificationLevel}`}
                label="Listen to Explanation"
                size="sm"
                variant="subtle"
              />

              {/* Simplification Toggle Buttons */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => handleLevelChange('beginner')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    simplificationLevel === 'beginner'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => handleLevelChange('eli5')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    simplificationLevel === 'eli5'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  Explain More Simply (ELI5)
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
            {activeReport.simple_explanation}
          </p>

          {/* Real World Analogy */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 flex items-start gap-2.5">
            <Smile className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-indigo-900 dark:text-indigo-300">Real-World Analogy: </span>
              <span className="text-slate-700 dark:text-slate-300">{activeReport.real_world_example}</span>
            </div>
          </div>
        </div>

        {/* Targeted Practice Question (Tests concept differently) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Targeted Practice Question (Verify Your Understanding)</span>
            </span>
            <div className="flex items-center gap-2">
              <AudioListenButton
                tts={tts}
                textToSpeak={`Targeted follow-up question for ${activeReport.concept}: ${activeReport.practice_question.question}. Options: ${activeReport.practice_question.options.join('. ')}`}
                itemId={`practice-q-${activeReport.concept}`}
                label="Listen Question"
                size="sm"
                variant="subtle"
              />
              <button
                type="button"
                onClick={speech.isListening ? speech.stopListening : speech.startListening}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  speech.isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
                title="Speak your answer"
              >
                {speech.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{speech.isListening ? 'Listening...' : 'Speak Choice'}</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                Attempt #{activeReport.attempts_count}
              </span>
            </div>
          </div>

          <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {activeReport.practice_question.question}
          </h5>

          {/* 4 Choices */}
          <div className="space-y-2">
            {activeReport.practice_question.options.map((opt) => {
              const isSelected = selectedFollowupOption === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelectedFollowupOption(opt)}
                  disabled={retryFeedback?.isCorrect}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Check Understanding Button */}
          {!retryFeedback?.isCorrect && (
            <button
              onClick={handleCheckFollowup}
              disabled={!selectedFollowupOption || isEvaluatingRetry}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5 ${
                !selectedFollowupOption || isEvaluatingRetry
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEvaluatingRetry ? 'Verifying...' : 'Check Understanding'}</span>
            </button>
          )}

          {/* Retry Feedback State */}
          {retryFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border text-xs sm:text-sm space-y-1 ${
                retryFeedback.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  {retryFeedback.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                  <span>{retryFeedback.message}</span>
                </div>
                <AudioListenButton
                  tts={tts}
                  textToSpeak={`${retryFeedback.message}. ${retryFeedback.explanation}`}
                  itemId={`feedback-${activeReport.concept}-${retryFeedback.isCorrect}`}
                  label="Listen Feedback"
                  size="sm"
                  variant="subtle"
                />
              </div>
              <p className="text-xs pt-1 leading-relaxed">
                {retryFeedback.explanation}
              </p>
            </motion.div>
          )}
        </div>

        {/* Bottom Navigation between Missed Concepts */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handlePrevConcept}
            disabled={activeConceptIndex === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              activeConceptIndex === 0
                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            ← Previous Weak Concept
          </button>

          {activeConceptIndex < currentReports.length - 1 ? (
            <button
              onClick={handleNextConcept}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer flex items-center gap-1"
            >
              <span>Next Weak Concept</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onReturnToQuiz}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer"
            >
              All Done! Return to Workspace
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
