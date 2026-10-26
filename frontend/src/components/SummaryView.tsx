import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Key,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Volume2,
} from 'lucide-react';
import { NoteAnalysis } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { AudioListenButton } from './AudioListenButton';

interface SummaryViewProps {
  analysis: NoteAnalysis;
  onGoToQuiz: () => void;
  onGoToFlashcards: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  analysis,
  onGoToQuiz,
  onGoToFlashcards,
}) => {
  const [showRawText, setShowRawText] = useState(false);
  const tts = useSpeechSynthesis();

  const fullSummarySpokenText = `Study Summary for ${analysis.topic} in ${analysis.subject}. ${analysis.summary}. Key concepts include: ${analysis.key_concepts.join(', ')}.`;

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
              {analysis.subject}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {analysis.topic}
            </span>
            {analysis.document_type === 'pdf' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                PDF Document ({analysis.page_count || 1} Pages)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <AudioListenButton
              tts={tts}
              textToSpeak={fullSummarySpokenText}
              itemId="full-summary"
              label="Listen to Full Summary"
              size="md"
              variant="primary"
            />

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>Extracted via {analysis.model_meta.model_name.split('/')[0]} ({analysis.model_meta.latency_ms || 180}ms)</span>
            </div>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Concise Academic Synthesis
        </h2>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {analysis.summary}
        </p>

        {/* Action Pills */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onGoToQuiz}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer shadow-xs"
          >
            Take 5-Question Quiz →
          </button>
          <button
            onClick={onGoToFlashcards}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 hover:bg-indigo-200 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800 transition cursor-pointer"
          >
            Practice Flashcards →
          </button>
        </div>
      </div>

      {/* Extracted Key Concepts Pills */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Extracted Key Concepts
            </h3>
          </div>
          <AudioListenButton
            tts={tts}
            textToSpeak={`The extracted key concepts are: ${analysis.key_concepts.join('. ')}`}
            itemId="all-key-concepts"
            label="Listen to Concepts"
            size="sm"
            variant="subtle"
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {analysis.key_concepts.map((concept, idx) => (
            <span
              key={concept}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>{concept}</span>
              <button
                type="button"
                onClick={() => tts.speak(concept, `concept-${concept}`)}
                className="opacity-70 hover:opacity-100 transition text-indigo-600 dark:text-indigo-400 cursor-pointer"
                title={`Listen to ${concept}`}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Important Definitions Table / Cards */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Important Definitions
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {analysis.definitions.length} terms identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.definitions.map((def) => (
            <div
              key={def.term}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {def.term}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    {def.importance || 'High'}
                  </span>
                  <AudioListenButton
                    tts={tts}
                    textToSpeak={`${def.term}: ${def.definition}`}
                    itemId={`def-${def.term}`}
                    label="Listen"
                    size="sm"
                    variant="ghost"
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {def.definition}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Takeaways Checklist */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Main Takeaways &amp; Exam Points
            </h3>
          </div>
          <AudioListenButton
            tts={tts}
            textToSpeak={`Main takeaways: ${analysis.takeaways.join('. ')}`}
            itemId="all-takeaways"
            label="Listen to Takeaways"
            size="sm"
            variant="subtle"
          />
        </div>
        <div className="space-y-2.5">
          {analysis.takeaways.map((takeaway, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800"
            >
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {takeaway}
                </p>
              </div>
              <AudioListenButton
                tts={tts}
                textToSpeak={takeaway}
                itemId={`takeaway-${idx}`}
                label="Listen"
                size="sm"
                variant="ghost"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Areas Where Source Image Is Unclear Notice */}
      {analysis.unclear_sections && analysis.unclear_sections.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Noted Uncertainties in Source Image (Handwriting / Crop Ambiguity)</span>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300 leading-relaxed">
            Knowlix AI strictly adheres to factuality and flags ambiguous handwritten sections instead of hallucinating:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-amber-800 dark:text-amber-300 pl-1">
            {analysis.unclear_sections.map((unclear, i) => (
              <li key={i}>{unclear}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw Extracted Text Viewer Accordion */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setShowRawText(!showRawText)}
          className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>View Full Optical Extracted Text</span>
          </div>
          {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800"
          >
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {analysis.extracted_text}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  );
};
