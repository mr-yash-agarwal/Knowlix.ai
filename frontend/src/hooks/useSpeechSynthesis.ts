import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  activeId: string | null;
  rate: number;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  isSupported: boolean;
  speak: (text: string, id?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rate, setRateState] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        // Default to a clear English voice if available
        if (available.length > 0 && !selectedVoice) {
          const naturalVoice =
            available.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
            available.find((v) => v.lang.startsWith('en')) ||
            available[0];
          setSelectedVoice(naturalVoice);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveId(null);
      activeUtteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/[*_#`~]/g, '') // remove markdown marks
      .replace(/\[Page \d+[^\]]*\]/g, '') // clean page tags
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speak = useCallback(
    (rawText: string, id: string = 'general') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const clean = cleanTextForSpeech(rawText);
      if (!clean) return;

      // Stop any existing speech before starting
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = rate;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setActiveId(id);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveId(null);
        activeUtteranceRef.current = null;
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis error:', e);
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveId(null);
        activeUtteranceRef.current = null;
      };

      utterance.onpause = () => setIsPaused(true);
      utterance.onresume = () => setIsPaused(false);

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [rate, selectedVoice]
  );

  const setRate = (newRate: number) => {
    setRateState(newRate);
    if (isSpeaking && activeUtteranceRef.current) {
      // Re-trigger with new rate seamlessly if needed
    }
  };

  const setVoice = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
  };

  return {
    isSpeaking,
    isPaused,
    activeId,
    rate,
    voices,
    selectedVoice,
    isSupported,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
  };
}
