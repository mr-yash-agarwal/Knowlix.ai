import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Cpu, Target, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onStartLearning: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartLearning }) => {
  const steps = [
    {
      number: '01',
      icon: UploadCloud,
      title: 'Upload Your Notes',
      subtitle: 'Any photo, scan, or diagram',
      description:
        'Snap a picture of your handwritten spiral notebook, textbook page, whiteboard sketch, or PDF lecture slide. Drag & drop JPG, PNG, or WEBP files up to 15MB.',
      tag: 'Step 1 • Multi-Modal Input',
    },
    {
      number: '02',
      icon: Cpu,
      title: 'Generate Personalized Revision Pack',
      subtitle: 'Open-weight vision-language inference',
      description:
        'The vision model extracts clear text, defines critical terms, structures an executive summary, and builds custom 5-question quizzes and spaced-repetition flashcards.',
      tag: 'Step 2 • Cognitive Processing',
    },
    {
      number: '03',
      icon: Target,
      title: 'Practice, Identify Gaps & Improve',
      subtitle: 'Teach Me What I Missed',
      description:
        'Take the quiz! When you make a mistake, our signature feature diagnoses exactly why, simplifies the concept with real-world analogies, and gives you a targeted retry.',
      tag: 'Step 3 • Mastery Breakthrough',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50/70 dark:bg-slate-950/40 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Simple 3-Step Workflow
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Knowlix AI Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            From an unorganized photo to verified concept mastery in less than three minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line behind steps on desktop */}
          <div className="hidden md:block absolute top-1/2 left-12 right-12 h-0.5 bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 dark:from-indigo-900 dark:via-violet-900 dark:to-sky-900 -translate-y-12 -z-0" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-4xl font-extrabold text-slate-200 dark:text-slate-800 font-mono">
                      {step.number}
                    </span>
                  </div>

                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-2">
                    {step.tag}
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                    {step.subtitle}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA banner */}
        <div className="mt-16 text-center">
          <button
            onClick={onStartLearning}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/20 active:scale-98 transition transform cursor-pointer"
          >
            <span>Start Your First Revision Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
