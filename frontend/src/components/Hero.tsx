import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  FileText,
  HelpCircle,
  Layers,
  Brain,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Scan,
  RefreshCw,
} from 'lucide-react';

interface HeroProps {
  onStartLearning: () => void;
  onExploreDemo: (sampleId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartLearning, onExploreDemo }) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'upload' | 'summary' | 'quiz' | 'flashcard' | 'teach'>('upload');
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [teachSimpler, setTeachSimpler] = useState(false);

  return (
    <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
      {/* Background Ambient Glow Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-sky-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold shadow-xs mb-6"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Open-Weight Vision AI • Learn Smarter. Remember Longer.</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
          >
            Turn Your Notes Into Your{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
              Next Breakthrough.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            Upload your notes. Discover what matters. Master what you missed.{' '}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              Learn with AI that adapts to you.
            </span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onStartLearning}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 active:scale-98 transition transform duration-150 cursor-pointer"
            >
              <span>Start Learning</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Quick Demo Previews Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400"
          >
            <span>Or try instant study presets:</span>
            <button
              onClick={() => onExploreDemo('photosynthesis')}
              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/60 dark:border-emerald-800 transition cursor-pointer font-medium"
            >
              🌿 Photosynthesis
            </button>
            <button
              onClick={() => onExploreDemo('binary_trees')}
              className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800 transition cursor-pointer font-medium"
            >
              🌳 Binary Search Trees
            </button>
            <button
              onClick={() => onExploreDemo('thermodynamics')}
              className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200/60 dark:border-amber-800 transition cursor-pointer font-medium"
            >
              ⚡ Thermodynamics
            </button>
          </motion.div>
        </div>

        {/* Interactive Live Transformation Preview Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 max-w-5xl mx-auto rounded-3xl p-1 sm:p-2 bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent shadow-2xl border border-indigo-200/50 dark:border-indigo-800/50"
        >
          <div className="bg-white dark:bg-slate-900 rounded-[22px] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-inner">
            {/* Top Preview Bar with Interactive Mode Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-950/60 gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                  knowlix-vision://session/preview-demo
                </span>
              </div>

              {/* Transformation Stage Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {[
                  { id: 'upload', label: '1. Uploaded Note', icon: Scan },
                  { id: 'summary', label: '2. Smart Summary', icon: FileText },
                  { id: 'quiz', label: '3. Interactive Quiz', icon: HelpCircle },
                  { id: 'flashcard', label: '4. Digital Flashcard', icon: Layers },
                  { id: 'teach', label: '5. Teach Me Missed ✨', icon: Brain },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activePreviewTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActivePreviewTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Interactive Stage Content */}
            <div className="p-5 sm:p-8 min-h-[380px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {/* 1. Uploaded Note View */}
                {activePreviewTab === 'upload' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 shadow-md">
                      <img
                        src="/samples/photosynthesis_notes.png"
                        alt="Handwritten note sample"
                        className="w-full h-64 object-cover object-top"
                      />
                      {/* Animated Scan Line */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline" />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono flex items-center gap-1.5">
                        <Scan className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span>OCR VLM: 99.4% Legibility Confirmed</span>
                      </div>
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Instant Vision-Language Model Analysis</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        From Raw Handwriting to Structured Knowledge
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Knowlix AI parses hand-drawn diagrams, complex formulas, and handwritten notes.
                        It pinpoints core concepts and separates them from illegible text or ink smudges.
                      </p>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setActivePreviewTab('summary')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition cursor-pointer"
                        >
                          <span>See Extracted Summary</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Smart Summary View */}
                {activePreviewTab === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full text-left space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Biology / Photosynthesis
                        </span>
                        <span className="text-xs text-slate-500">Extracted in 210ms</span>
                      </div>
                      <button
                        onClick={() => setActivePreviewTab('quiz')}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Take Test Quiz <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Photosynthesis converts solar energy into chemical bonds in two synchronized phases.
                        Light reactions in thylakoid membranes split water, releasing oxygen and generating ATP & NADPH.
                        The Calvin cycle in the stroma consumes this energy to fix atmospheric CO2 into G3P sugars.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                          Concept #1
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          Photolysis of H2O produces oxygen gas
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60">
                        <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400">
                          Concept #2
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          Proton gradient drives ATP Synthase
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60">
                        <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">
                          Concept #3
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          RuBisCO fixes CO2 with RuBP in stroma
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. Interactive Quiz View */}
                {activePreviewTab === 'quiz' && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full text-left max-w-xl mx-auto space-y-4"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Question 2 of 5</span>
                      <span>Concept: Photolysis of Water</span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      What is the primary function of water photolysis in Photosystem II?
                    </h4>

                    <div className="space-y-2">
                      {[
                        { id: 0, text: 'To supply replacement electrons to P680 and release oxygen gas', correct: true },
                        { id: 1, text: 'To directly synthesize glucose in the stroma', correct: false },
                        { id: 2, text: 'To eliminate carbon dioxide from the leaf', correct: false },
                        { id: 3, text: 'To neutralize alkaline pH inside the chloroplast', correct: false },
                      ].map((opt) => {
                        const isSelected = quizSelectedOption === opt.id;
                        let optStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400';
                        if (quizSelectedOption !== null) {
                          if (opt.correct) {
                            optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200';
                          } else if (isSelected) {
                            optStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                          }
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() => setQuizSelectedOption(opt.id)}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${optStyle}`}
                          >
                            <span>{opt.text}</span>
                            {quizSelectedOption !== null && opt.correct && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            {quizSelectedOption === opt.id && !opt.correct && (
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSelectedOption !== null && (
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {quizSelectedOption === 0 ? '✨ Correct! Grounded in thylakoid notes.' : '⚠️ Missed! Try Teach Me What I Missed.'}
                        </span>
                        <button
                          onClick={() => setActivePreviewTab('teach')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 transition cursor-pointer"
                        >
                          See Teach Me What I Missed
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 4. Digital Flashcard View */}
                {activePreviewTab === 'flashcard' && (
                  <motion.div
                    key="flashcard"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Card 1 of 5</span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">Click card to flip</span>
                    </div>

                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full max-w-md h-52 perspective-1000 cursor-pointer select-none"
                    >
                      <div
                        className={`relative w-full h-full duration-500 transform-style-3d rounded-2xl shadow-lg border transition-transform ${
                          isFlipped ? 'rotate-y-180' : ''
                        } border-indigo-200/80 dark:border-indigo-800 bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-800 dark:to-slate-900`}
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 backface-hidden p-6 flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                            QUESTION • Photosynthesis
                          </span>
                          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white text-center">
                            Where does the Calvin-Benson Cycle take place within the chloroplast?
                          </p>
                          <div className="flex items-center justify-center text-xs text-slate-400 gap-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Click to reveal answer</span>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 flex flex-col justify-between bg-indigo-600 text-white rounded-2xl">
                          <span className="text-[10px] uppercase font-bold text-indigo-200">
                            ANSWER
                          </span>
                          <p className="text-sm sm:text-base font-medium text-center leading-relaxed">
                            In the chloroplast stroma, where high-energy ATP and NADPH from light reactions are used to fix CO2 into sugars.
                          </p>
                          <span className="text-xs text-indigo-200 text-center italic">
                            Hint: Stroma = solution; Thylakoid = light capture.
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. Signature Feature: Teach Me What I Missed View */}
                {activePreviewTab === 'teach' && (
                  <motion.div
                    key="teach"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full text-left max-w-2xl mx-auto space-y-4"
                  >
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-white dark:from-slate-800 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          Identified Learning Gap: Photolysis of Water
                        </span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Mastery: Needs Practice
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mb-2">
                        Original Mistake: You picked "Directly synthesizes glucose". Correct: "Supplies replacement electrons and releases oxygen gas".
                      </p>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            {teachSimpler ? 'ELI5 Simpler Explanation' : 'Beginner-Friendly Explanation'}
                          </span>
                          <button
                            onClick={() => setTeachSimpler(!teachSimpler)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {teachSimpler ? 'Standard Explanation' : 'Explain Even More Simply'}
                          </button>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {teachSimpler
                            ? 'Imagine water is a Lego car. Sun power breaks the Lego car in half. The wheels (electrons) power the plant, and the air bubble left over (oxygen) is what you and I breathe!'
                            : 'Think of water molecules as batteries plugged into Photosystem II. When sunlight hits chlorophyll, it rips electrons away from water to keep the photosynthetic engine running. Oxygen gas is released as a natural byproduct!'}
                        </p>

                        <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Analogy:</span>
                          <span>A solar water electrolyzer that splits water into bubbling oxygen and hydrogen ions.</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Follow-up practice question is ready to test mastery!
                        </span>
                        <button
                          onClick={onStartLearning}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer"
                        >
                          Try In Full Workspace
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
