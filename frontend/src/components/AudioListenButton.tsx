import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, Play, Square, FastForward } from 'lucide-react';
import { UseSpeechSynthesisReturn } from '../hooks/useSpeechSynthesis';

interface AudioListenButtonProps {
  tts: UseSpeechSynthesisReturn;
  textToSpeak: string;
  itemId: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'subtle' | 'ghost' | 'pill';
  className?: string;
}

export const AudioListenButton: React.FC<AudioListenButtonProps> = ({
  tts,
  textToSpeak,
  itemId,
  label = 'Listen',
  size = 'md',
  variant = 'subtle',
  className = '',
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const isCurrentSpeaking = tts.isSpeaking && tts.activeId === itemId;
  const isCurrentPaused = tts.isPaused && tts.activeId === itemId;

  if (!tts.isSupported) {
    return (
      <span className="text-[11px] text-slate-400 italic" title="Speech synthesis not supported in this browser">
        (TTS unavailable)
      </span>
    );
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSpeaking) {
      tts.pause();
    } else if (isCurrentPaused) {
      tts.resume();
    } else {
      tts.speak(textToSpeak, itemId);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    tts.stop();
  };

  const handleRateChange = (e: React.MouseEvent, newRate: number) => {
    e.stopPropagation();
    tts.setRate(newRate);
    setShowSpeedMenu(false);
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg',
    md: 'text-xs sm:text-sm px-3.5 py-1.5 gap-2 rounded-xl',
    lg: 'text-sm px-4 py-2 gap-2.5 rounded-2xl',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs font-semibold',
    subtle:
      'bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-medium',
    ghost:
      'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium',
    pill:
      'bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20 font-semibold',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center transition cursor-pointer select-none active:scale-95 ${sizeClasses[size]} ${
          isCurrentSpeaking
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md ring-2 ring-amber-300 dark:ring-amber-500 animate-pulse'
            : isCurrentPaused
            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
            : variantClasses[variant]
        }`}
        title={isCurrentSpeaking ? 'Pause reading' : isCurrentPaused ? 'Resume reading' : `Listen: ${label}`}
        aria-label={isCurrentSpeaking ? 'Pause reading' : `Listen to ${label}`}
      >
        {isCurrentSpeaking ? (
          <>
            <Pause className="w-3.5 h-3.5 shrink-0" />
            <span>Pause</span>
            {/* Animated sound wave bars */}
            <span className="flex items-center gap-0.5 ml-1">
              <span className="w-0.5 h-3 bg-slate-950 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-4 bg-slate-950 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-2 bg-slate-950 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </>
        ) : isCurrentPaused ? (
          <>
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span>Resume</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Stop button when active */}
      {(isCurrentSpeaking || isCurrentPaused) && (
        <button
          type="button"
          onClick={handleStop}
          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
          title="Stop reading"
          aria-label="Stop audio"
        >
          <Square className="w-3 h-3 fill-current" />
        </button>
      )}

      {/* Speed Rate Selector Pill */}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowSpeedMenu(!showSpeedMenu);
          }}
          className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition cursor-pointer"
          title="Change playback speed"
        >
          {tts.rate}x
        </button>

        {showSpeedMenu && (
          <div className="absolute right-0 bottom-full mb-1 z-50 py-1 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex gap-1 text-[10px] font-mono">
            {[0.75, 1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={(e) => handleRateChange(e, speed)}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  tts.rate === speed
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
