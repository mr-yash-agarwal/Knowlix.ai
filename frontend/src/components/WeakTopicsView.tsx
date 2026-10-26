import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Target,
} from 'lucide-react';
import { ConceptMasteryOverview } from '../types';

interface WeakTopicsViewProps {
  concepts: string[];
  breakdown: ConceptMasteryOverview[];
  onPracticeConcept: (concept: string) => void;
}

export const WeakTopicsView: React.FC<WeakTopicsViewProps> = ({
  concepts,
  breakdown,
  onPracticeConcept,
}) => {
  // Merge concepts with breakdown or create defaults
  const conceptMap = new Map<string, { status: string; acc: number }>();
  breakdown.forEach((b) => {
    conceptMap.set(b.concept, { status: b.status, acc: b.accuracy_percentage });
  });

  const allConceptCards = concepts.map((c) => {
    const existing = conceptMap.get(c);
    return {
      name: c,
      status: existing ? existing.status : 'Needs Practice',
      accuracy: existing ? existing.acc : 40,
    };
  });

  const needsPractice = allConceptCards.filter((c) => c.status === 'Needs Practice');
  const improving = allConceptCards.filter((c) => c.status === 'Improving');
  const mastered = allConceptCards.filter((c) => c.status === 'Mastered');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Overview Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Concept Mastery Radar
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Real-time mastery tracking across your revision session. Focus first on "Needs Practice".
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {needsPractice.length} Weak
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {improving.length} Improving
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {mastered.length} Mastered
          </span>
        </div>
      </div>

      {/* Needs Practice Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4" />
          <span>Priority Focus: Needs Practice ({needsPractice.length})</span>
        </div>

        {needsPractice.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            ✨ Fantastic job! No concepts currently flagged for urgent practice.
          </div>
        ) : (
          <div className="space-y-2.5">
            {needsPractice.map((c) => (
              <div
                key={c.name}
                className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.name}
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-400">
                    Accuracy: {c.accuracy}% • Misconception detected in quiz
                  </p>
                </div>

                <button
                  onClick={() => onPracticeConcept(c.name)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Teach Me This Concept</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Improving Section */}
      {improving.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
            <span>In Progress: Improving ({improving.length})</span>
          </div>

          <div className="space-y-2.5">
            {improving.map((c) => (
              <div
                key={c.name}
                className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.name}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Accuracy: {c.accuracy}% • 1 more correct retry needed for full mastery
                  </p>
                </div>

                <button
                  onClick={() => onPracticeConcept(c.name)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <span>Practice Again</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mastered Section */}
      {mastered.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Mastered Concepts ({mastered.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mastered.map((c) => (
              <div
                key={c.name}
                className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {c.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  100% Mastered
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
