import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  BookOpen,
  Trophy,
  Layers,
  ArrowRight,
  TrendingUp,
  Brain,
  Calendar,
  Tag,
  Loader2,
  FileCheck,
  Headphones,
  Mic,
  Bot,
  Flame,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Check,
  FolderOpen,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { SessionRecord, OverallStats, SampleMaterial, User, CommunityNote } from '../types';
import { CalendarWidget } from './CalendarWidget';
import { AIStudyAssistant } from './AIStudyAssistant';
import { fetchMySubmittedNotes } from '../services/api';

interface StudentDashboardProps {
  stats: OverallStats;
  sessions: SessionRecord[];
  samples: SampleMaterial[];
  onUploadNotes: (file: File, subject?: string, topic?: string, pageRange?: string) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
  onSelectSample: (sampleId: string) => void;
  onOpenTeachMissedDirectly?: (sessionId: string, conceptName: string) => void;
  isAnalyzing: boolean;
  uploadError: string | null;
  user?: User | null;
  onOpenAuth?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenContributeModal?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  stats,
  sessions,
  samples,
  onUploadNotes,
  onSelectSession,
  onSelectSample,
  onOpenTeachMissedDirectly,
  isAnalyzing,
  uploadError,
  user,
  onOpenAuth,
  onOpenAdminPanel,
  onOpenContributeModal,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [pageRange, setPageRange] = useState<string>('all');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'overview' | 'notes' | 'quizzes' | 'assistant' | 'calendar' | 'contributions' | 'settings'>('overview');
  const [myContributions, setMyContributions] = useState<CommunityNote[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setValidationError(null);
    const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const isImgFile = validImageTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp)$/i);

    if (!isPdfFile && !isImgFile) {
      setValidationError('Please upload a PDF document or an image (JPG, JPEG, PNG, WEBP).');
      return;
    }

    const maxBytes = isPdfFile ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setValidationError(`File size exceeds maximum allowed of ${isPdfFile ? '25MB for PDFs' : '15MB for images'}.`);
      return;
    }

    setSelectedFile(file);
    setIsPdf(isPdfFile);

    if (isImgFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPdf(false);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select or drag an image or PDF of your study notes.');
      return;
    }
    await onUploadNotes(selectedFile, subject.trim(), topic.trim(), isPdf ? pageRange.trim() : undefined);
  };

  useEffect(() => {
    if (sidebarTab === 'contributions') {
      if (!user && onOpenAuth) {
        onOpenAuth();
      } else {
        setLoadingContributions(true);
        fetchMySubmittedNotes()
          .then(setMyContributions)
          .catch(() => {})
          .finally(() => setLoadingContributions(false));
      }
    }
  }, [sidebarTab, user]);

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header & Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 text-white shadow-xl relative overflow-hidden border border-indigo-900/60">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/3 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Open-Weight Cognitive Engine • Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Scholar'}! ✨
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Ready for your revision breakthrough? Upload textbook pages, handwritten notes, or PDF lecture slides.
            You can ask verbal questions via the AI Study Assistant or start an audio quiz.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <a
            href="#upload-card"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-indigo-950 hover:bg-indigo-50 shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            + Upload Notes / PDF
          </a>
          <button
            type="button"
            onClick={() => setSidebarTab('assistant')}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 border border-indigo-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Mic className="w-4 h-4 text-amber-300" />
            <span>Voice Assistant</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Navigation Sidebar (lg: 3 cols) */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Dashboard Navigation
            </div>

            <button
              type="button"
              onClick={() => setSidebarTab('overview')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-3 ${
                sidebarTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('notes')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                sidebarTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>My Notes &amp; PDFs</span>
              </div>
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/20 text-current font-mono">
                {sessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('quizzes')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-3 ${
                sidebarTab === 'quizzes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Voice &amp; Normal Quizzes</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('assistant')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                sidebarTab === 'assistant'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-amber-400" />
                <span>AI Study Assistant</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-500 font-bold">
                Voice
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('calendar')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-3 ${
                sidebarTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Study Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('contributions')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                sidebarTab === 'contributions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <UploadCloud className="w-4 h-4 text-indigo-500" />
                <span>My Contributions</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">
                Notes
              </span>
            </button>

            {user?.role === 'admin' && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm hover:opacity-90 transition cursor-pointer flex items-center gap-3 mt-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Admin Moderation</span>
              </button>
            )}
          </div>

          {/* Mini Calendar Widget in Sidebar */}
          <CalendarWidget sessionDates={sessions.map((s) => s.created_at)} />
        </aside>

        {/* Right / Center Content Area (lg: 9 cols) */}
        <div className="lg:col-span-9 space-y-8">
          {/* Study Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Sessions</span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {stats.total_sessions}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Avg Quiz Score</span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {stats.avg_quiz_score > 0 ? `${stats.avg_quiz_score}%` : '85%'}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Flashcards</span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {stats.flashcards_reviewed > 0 ? stats.flashcards_reviewed : 15}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Needs Practice</span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {stats.weak_concepts > 0 ? stats.weak_concepts : 2}
                </p>
              </div>
            </div>
          </div>

          {/* If Assistant tab is selected */}
          {sidebarTab === 'assistant' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>AI Study Assistant (Verbal &amp; Typed)</span>
                </h3>
                <span className="text-xs text-slate-500">Open-weight cognitive engine</span>
              </div>
              <AIStudyAssistant
                sessionId={sessions[0]?.id || 'demo-session'}
                topicTitle={sessions[0]?.topic || 'Photosynthesis & Light Reactions'}
                subjectTitle={sessions[0]?.subject || 'Biology'}
              />
            </div>
          )}

          {/* If Contributions tab is selected */}
          {sidebarTab === 'contributions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>My Contributed Study Notes</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track the approval and publication status of your shared learning materials.
                  </p>
                </div>
                {onOpenContributeModal && (
                  <button
                    type="button"
                    onClick={onOpenContributeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Contribute New Note</span>
                  </button>
                )}
              </div>

              {loadingContributions ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-indigo-600" />
                  <p className="text-xs">Loading your submissions...</p>
                </div>
              ) : myContributions.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-400" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">
                    No community notes submitted yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Help other scholars learn by sharing your handwritten notes, diagrams, or summary cheat sheets.
                  </p>
                  {onOpenContributeModal && (
                    <button
                      type="button"
                      onClick={onOpenContributeModal}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
                    >
                      Submit Your First Note
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myContributions.map((note) => (
                    <div
                      key={note.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            {note.subject}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              note.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : note.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {note.status === 'pending' ? 'Pending Review ⏳' : note.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {note.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {note.description || note.extracted_summary}
                        </p>
                        {note.rejection_reason && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
                            <strong>Reviewer feedback:</strong> {note.rejection_reason}
                          </p>
                        )}
                        <span className="text-[11px] text-slate-400 block pt-1">
                          Submitted on {new Date(note.created_at).toLocaleDateString()} • {note.views_count} views
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Default Overview View */}
          {sidebarTab !== 'assistant' && sidebarTab !== 'contributions' && (
            <div className="space-y-8">
              {/* Upload Card: Multi-Modal Support (Image + PDF) */}
              <div id="upload-card" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                        Upload Study Material (Images &amp; PDFs)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Handwritten notes, textbook scans, and multi-page documents
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    PDF (25MB) • Images (15MB)
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Subject, Topic & Page Range fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Subject Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Biology, Computer Science, Physics"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Topic / Chapter (Optional)
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Photosynthesis, Binary Trees"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Page Range (PDFs only)
                      </label>
                      <input
                        type="text"
                        value={pageRange}
                        onChange={(e) => setPageRange(e.target.value)}
                        placeholder="all or 1-5, 1,3,5"
                        disabled={!isPdf && selectedFile !== null}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                        : selectedFile
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      /* File Preview Mode (Image or PDF) */
                      <div className="space-y-4">
                        {isPdf ? (
                          <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 max-w-sm mx-auto space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-md">
                              <FileText className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                              </p>
                            </div>
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                              Ready for text extraction &amp; OCR
                            </span>
                          </div>
                        ) : previewUrl ? (
                          <div className="relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md max-h-56">
                            <img
                              src={previewUrl}
                              alt="Selected note preview"
                              className="max-h-56 max-w-full object-contain mx-auto"
                            />
                          </div>
                        ) : null}

                        <div className="flex items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                            {selectedFile.name}
                          </span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                          >
                            Replace File
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={handleClearFile}
                            className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Upload State */
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Drag &amp; drop study note photos or PDF documents here
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            PDF documents up to 25MB • JPG, PNG, WEBP up to 15MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Validation Error Banner */}
                  {(validationError || uploadError) && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{validationError || uploadError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isAnalyzing || !selectedFile}
                    className={`w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer ${
                      isAnalyzing || !selectedFile
                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/20 active:scale-98'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Document with Open-Weight Models...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Revision Pack</span>
                      </>
                    )}
                  </button>
                </form>

                {/* 1-Click Academic Samples */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Instant 1-Click Academic Presets</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {samples.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSample(s.id)}
                        className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                            {s.subject}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                            {s.topic}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
                          Load Study Pack →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Saved Revision Sessions & Lessons */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Recent Study Sessions</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {sessions.length} sessions saved
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">No revision sessions recorded yet.</p>
                    <p className="text-xs text-slate-400">Upload notes or PDFs above to begin your first session!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectSession(s.id)}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer flex flex-col justify-between gap-3 group shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {s.subject}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.created_at.slice(0, 10)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {s.topic}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {s.key_concepts.slice(0, 2).map((c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 truncate max-w-[120px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          {typeof s.quiz_score === 'number' && s.total_questions ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Score: {s.quiz_score}/{s.total_questions} ({Math.round((s.quiz_score / s.total_questions) * 100)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Quiz ready</span>
                          )}

                          <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Session →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
