import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What study document and image formats are supported?',
      a: 'Knowlix AI supports both image formats (PNG, JPG, JPEG, WEBP) and document formats (PDF). You can upload photos of handwritten notebooks, whiteboard drawings, scanned textbook pages, and lecture PDFs up to 25MB with configurable page-range selection.',
    },
    {
      q: 'What AI model powers Knowlix AI, and is my data private?',
      a: 'Knowlix AI is engineered exclusively around qualifying open-weight vision-language models—specifically Qwen2-VL-7B-Instruct and LLaVA. No proprietary closed APIs (such as Gemini or GPT) are used. Your study notes and personal coursework remain completely private and can be run entirely on your local machine.',
    },
    {
      q: 'How does the Voice Input and Text-to-Speech feature work?',
      a: 'Students can speak questions verbally to the AI Study Assistant using standard browser speech recognition. The AI response and all generated summaries, definitions, quiz questions, and revision coaching can be listened to aloud using the browser Text-to-Speech API with play, pause, speed control, and repeat controls.',
    },
    {
      q: 'What is the "Teach Me What I Missed" signature feature?',
      a: 'When you take a quiz, Knowlix AI evaluates your answers server-side against a verified answer key. For any incorrect answers, our adaptive open-weight AI identifies the exact underlying misconception, provides a simplified explanation (including an ELI5 Lego-style breakdown) and relatable real-world analogies, and presents a targeted retry question until you achieve concept mastery.',
    },
    {
      q: 'How does Audio-Based Quiz mode work?',
      a: 'You can toggle "Start Voice Quiz" at any time. The application reads each question and choice aloud. You can answer by clicking or by speaking your choice (e.g. "Option A" or the option text). Questions remain visually visible, and scores are objectively calculated.',
    },
    {
      q: 'Can I test Knowlix AI for free without creating an account?',
      a: 'Yes! You can preview study materials, upload notes or PDFs, test the 1-click sample revision sets, and try interactive quizzes immediately before logging in.',
    },
  ];

  return (
    <section id="faqs" className="py-20 lg:py-28 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Got Questions?</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Everything you need to know about our open-weight model, PDF processing, and voice learning.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
