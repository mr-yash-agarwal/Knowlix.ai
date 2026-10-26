import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Volume2,
  StopCircle,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  Globe,
  Loader2,
  Layers,
  FileText,
} from 'lucide-react';
import { AssistantMessage } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { AudioListenButton } from './AudioListenButton';
import { askStudyAssistant } from '../services/api';

interface AIStudyAssistantProps {
  sessionId: string;
  topicTitle?: string;
  subjectTitle?: string;
  initialContextSummary?: string;
  className?: string;
}

export const AIStudyAssistant: React.FC<AIStudyAssistantProps> = ({
  sessionId,
  topicTitle = 'Study Notes',
  subjectTitle = 'Academic Material',
  initialContextSummary = '',
  className = '',
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I'm your Knowlix AI Study Assistant, powered by our open-weight model. You can type or click the microphone to speak questions about **${topicTitle}**. What would you like to explore?`,
      timestamp: 'Just now',
      citations: [topicTitle],
      relatedConcepts: ['Core Principles', 'Quiz Review', 'Key Definitions'],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const speechRecognition = useSpeechRecognition('en-US');
  const tts = useSpeechSynthesis();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, speechRecognition.transcript, isAsking]);

  // When speech recognition produces text, update input text so student can review/edit
  useEffect(() => {
    if (speechRecognition.transcript) {
      setInputText(speechRecognition.transcript);
    }
  }, [speechRecognition.transcript]);

  const handleStartVoice = () => {
    speechRecognition.resetTranscript();
    setInputText('');
    setIsEditingTranscript(false);
    speechRecognition.startListening();
  };

  const handleStopVoice = () => {
    speechRecognition.stopListening();
    setIsEditingTranscript(true);
  };

  const handleCancelVoice = () => {
    speechRecognition.stopListening();
    speechRecognition.resetTranscript();
    setInputText('');
    setIsEditingTranscript(false);
  };

  const handleSendMessage = async (textToSend?: string, wasVoice: boolean = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAsking) return;

    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    }

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      isVoice: wasVoice || speechRecognition.transcript.length > 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    speechRecognition.resetTranscript();
    setIsEditingTranscript(false);
    setIsAsking(true);

    try {
      const res = await askStudyAssistant(
        sessionId,
        text,
        userMsg.isVoice,
        speechRecognition.language
      );

      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.source_citations,
        relatedConcepts: res.related_concepts,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Study assistant query failed:', err);
      const errorMsg: AssistantMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: `I ran into an issue connecting with the open-weight study engine: ${err.message || 'Processing error'}. Please try again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const supportedLanguages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'es-ES', label: 'Español' },
    { code: 'fr-FR', label: 'Français' },
    { code: 'de-DE', label: 'Deutsch' },
  ];

  return (
    <div className={`flex flex-col h-[520px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-amber-300 border border-white/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>AI Study Assistant</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                Voice &amp; Text
              </span>
            </h3>
            <p className="text-[11px] text-indigo-200 truncate max-w-xs sm:max-w-md">
              Grounded in: {topicTitle}
            </p>
          </div>
        </div>

        {/* Language selector button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguagePicker(!showLanguagePicker)}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5 cursor-pointer text-indigo-100"
            title="Speech recognition language"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-300" />
            <span className="font-mono">{speechRecognition.language.split('-')[0].toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showLanguagePicker && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-slate-800 dark:text-slate-100 text-xs">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    speechRecognition.setLanguage(lang.code);
                    setShowLanguagePicker(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-between ${
                    speechRecognition.language === lang.code ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                >
                  <span>{lang.label}</span>
                  {speechRecognition.language === lang.code && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 text-xs sm:text-sm shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                <span className="font-semibold flex items-center gap-1">
                  {msg.sender === 'user' ? (
                    <>
                      <UserIcon className="w-3 h-3" />
                      <span>You {msg.isVoice ? '• Spoken Voice' : ''}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Knowlix AI Tutor</span>
                    </>
                  )}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Bot citations and audio button */}
              {msg.sender === 'assistant' && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                  <AudioListenButton
                    tts={tts}
                    textToSpeak={msg.text}
                    itemId={msg.id}
                    label="Listen"
                    size="sm"
                    variant="subtle"
                  />

                  {msg.citations && msg.citations.length > 0 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>Source: {msg.citations[0]}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {isAsking && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Consulting open-weight study engine...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Voice Status Alert Bar */}
      {speechRecognition.isListening && (
        <div className="p-3 bg-amber-500/10 border-t border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold">Listening... Speak your question now</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopVoice}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Done Speaking
            </button>
            <button
              type="button"
              onClick={handleCancelVoice}
              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Permission Denied or Unsupported Notification */}
      {speechRecognition.permissionDenied && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border-t border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Microphone access was denied. Please allow microphone permissions in browser settings.</span>
          </div>
        </div>
      )}

      {/* Input Area with Mic and Text Send */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* If user stopped speaking and is reviewing transcript */}
        {isEditingTranscript && inputText && (
          <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-semibold">
              <span>Review recognized transcript before sending:</span>
              <button
                type="button"
                onClick={handleStartVoice}
                className="text-indigo-600 hover:underline cursor-pointer"
              >
                Retry Recording
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-200 italic">"{inputText}"</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone button */}
          <button
            type="button"
            onClick={speechRecognition.isListening ? handleStopVoice : handleStartVoice}
            className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
              speechRecognition.isListening
                ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/80 dark:border-indigo-800'
            }`}
            title={speechRecognition.isListening ? 'Stop listening' : 'Ask question verbally via microphone'}
            aria-label="Microphone Voice Input"
          >
            {speechRecognition.isListening ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              speechRecognition.isListening
                ? 'Listening to your voice...'
                : 'Type or speak a question about this material...'
            }
            disabled={isAsking}
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isAsking || !inputText.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white transition cursor-pointer shrink-0 shadow-xs"
            title="Send question"
            aria-label="Send question"
          >
            {isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
