import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  FileCheck,
  Layers,
  TrendingUp,
  RotateCcw,
  Zap,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface FeaturesProps {
  onStartLearning: () => void;
}

export const Features: React.FC<FeaturesProps> = ({ onStartLearning }) => {
  const featuresList = [
    {
      icon: Sparkles,
      color: 'from-blue-500 to-indigo-600',
      badge: 'Vision-Language AI',
      title: 'AI-Powered Note Understanding',
      description:
        'Interprets messy handwriting, blackboard formulas, flowcharts, and textbook margins using open-weight vision models without inventing absent facts.',
    },
    {
      icon: FileCheck,
      color: 'from-indigo-500 to-violet-600',
      badge: 'Concise Synthesis',
      title: 'Smart Summaries & Definitions',
      description:
        'Extracts core concepts, critical definitions, and key takeaways into structured, scannable revision summaries with uncertain areas clearly flagged.',
    },
    {
      icon: Zap,
      color: 'from-violet-500 to-purple-600',
      badge: 'Active Recall',
      title: 'Interactive Grounded Quizzes',
      description:
        'Generates 5 multiple-choice questions grounded strictly in your source notes, evaluated with a trusted server-side answer key and instant feedback.',
    },
    {
      icon: Layers,
      color: 'from-purple-500 to-pink-600',
      badge: 'Spaced Repetition',
      title: 'Digital 3D Flashcards',
      description:
        'Study with interactive flip flashcards featuring front questions, back answers, memory tips, shuffling, and review status tracking.',
    },
    {
      icon: Brain,
      color: 'from-amber-500 to-rose-600',
      badge: 'Signature Feature',
      title: 'Teach Me What I Missed',
      description:
        'Diagnoses your actual quiz mistakes, explains weak concepts in simpler language with relatable analogies, and provides targeted follow-up retries.',
      highlight: true,
    },
    {
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Mastery Engine',
      title: 'Personalized Progress Tracking',
      description:
        'Monitors session history, quiz accuracy scores, weak concept clusters, and dynamic mastery levels persisted in lightweight SQLite.',
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/70 border border-violet-200/80 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
            <span>Built For Deeper Retention</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Everything You Need To Master Any Topic
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Engineered around proven cognitive science principles: active recall, spaced repetition, and immediate corrective feedback.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative group rounded-3xl p-7 transition-all duration-300 ${
                  f.highlight
                    ? 'bg-gradient-to-b from-indigo-50/80 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border-2 border-indigo-400/60 dark:border-indigo-600 shadow-xl shadow-indigo-500/10'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-md hover:shadow-xl'
                }`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${f.color} text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      f.highlight
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {f.description}
                </p>

                {f.highlight && (
                  <div className="mt-5 pt-4 border-t border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Adaptive Misconception Diagnosis
                    </span>
                    <button
                      onClick={onStartLearning}
                      className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                    >
                      Try Feature →
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
