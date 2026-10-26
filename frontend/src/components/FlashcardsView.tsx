import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  RotateCw,
  Shuffle,
  CheckCircle2,
  BookmarkPlus,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FlashcardItem } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { AudioListenButton } from './AudioListenButton';

interface FlashcardsViewProps {
  initialFlashcards: FlashcardItem[];
  sessionId: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  initialFlashcards,
  sessionId,
}) => {
  const [cards, setCards] = useState<FlashcardItem[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

  const tts = useSpeechSynthesis();

  const currentCard = cards[currentIndex] || cards[0];
  const totalCards = cards.length;
  const knownCount = knownCards.size;
  const progressPercent = totalCards > 0 ? (knownCount / totalCards) * 100 : 0;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(totalCards - 1);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleMarkAsKnown = () => {
    const nextSet = new Set(knownCards);
    nextSet.add(currentCard.id);
    setKnownCards(nextSet);

    if (nextSet.size === totalCards) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    }

    handleNext();
  };

  const handleReviewAgain = () => {
    const nextSet = new Set(knownCards);
    nextSet.delete(currentCard.id);
    setKnownCards(nextSet);
    handleNext();
  };

  const isCurrentKnown = knownCards.has(currentCard?.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Spaced Repetition Flashcards
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {knownCount} of {totalCards} Mastered
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Click card or spacebar to flip between question and grounded answer.
          </p>
        </div>

        <button
          onClick={handleShuffle}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer select-none"
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d rounded-3xl shadow-xl transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Face: Question */}
          <div className="absolute inset-0 backface-hidden p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200/80 dark:border-indigo-900 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                {currentCard.concept}
              </span>
              <div className="flex items-center gap-2">
                <AudioListenButton
                  tts={tts}
                  textToSpeak={currentCard.question}
                  itemId={`flash-q-${currentCard.id}`}
                  label="Listen"
                  size="sm"
                  variant="subtle"
                />
                <span className="text-xs font-mono text-slate-400">
                  Card {currentIndex + 1} / {totalCards}
                </span>
              </div>
            </div>

            <div className="text-center space-y-3 my-auto">
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-500">
                QUESTION
              </span>
              <h4 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
                {currentCard.question}
              </h4>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <RotateCw className="w-3.5 h-3.5 animate-spin-slow text-indigo-500" />
              <span>Click anywhere to reveal answer</span>
            </div>
          </div>

          {/* Back Face: Answer */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20">
                {currentCard.concept}
              </span>
              <div className="flex items-center gap-2">
                <AudioListenButton
                  tts={tts}
                  textToSpeak={`${currentCard.answer}. Memory hint: ${currentCard.mastery_hint || ''}`}
                  itemId={`flash-a-${currentCard.id}`}
                  label="Listen Answer"
                  size="sm"
                  variant="pill"
                />
                <span className="text-xs font-mono text-indigo-200">
                  ANSWER
                </span>
              </div>
            </div>

            <div className="text-center space-y-4 my-auto">
              <p className="text-base sm:text-xl font-medium leading-relaxed">
                {currentCard.answer}
              </p>
              {currentCard.mastery_hint && (
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs text-xs sm:text-sm text-indigo-100 italic border border-white/10 max-w-lg mx-auto">
                  💡 Memory Hint: {currentCard.mastery_hint}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-200">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click to flip back to question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Navigation & Mastery Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Navigation arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Previous card"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Next card"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleReviewAgain}
            className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200/80 dark:border-amber-800 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Review Again</span>
          </button>
          <button
            onClick={handleMarkAsKnown}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark as Known</span>
          </button>
        </div>
      </div>
    </div>
  );
};
