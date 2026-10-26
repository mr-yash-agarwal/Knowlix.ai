import { useState, useEffect, useRef, useCallback } from 'react';

// Browser SpeechRecognition interface augmentation
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  permissionDenied: boolean;
  isSupported: boolean;
  language: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
  setLanguage: (lang: string) => void;
}

export function useSpeechRecognition(initialLang: string = 'en-US'): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [language, setLanguageState] = useState(initialLang);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        setIsSupported(true);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore already stopped
      }
    }
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscriptState('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or use text input.');
      return;
    }

    setError(null);
    setPermissionDenied(false);

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + ' ';
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (finalStr) {
          setTranscriptState((prev) => (prev ? `${prev} ${finalStr.trim()}` : finalStr.trim()));
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionDenied(true);
          setError('Microphone access was denied. Please allow microphone permissions in your browser bar.');
        } else if (event.error === 'no-speech') {
          // Normal silence, don't crash
        } else if (event.error === 'network') {
          setError('Network issue with speech recognition service.');
        } else {
          setError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setError(e.message || 'Could not access speech recognition');
      setIsListening(false);
    }
  }, [language]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    permissionDenied,
    isSupported,
    language,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    setLanguage,
  };
}
