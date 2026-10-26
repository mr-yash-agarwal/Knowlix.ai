import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  FileText,
  Search,
  FolderOpen,
  Download,
  Eye,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  X,
  Layers,
  HelpCircle,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import { SampleMaterial, CommunityNote, Folder, User } from '../types';
import { fetchExploreNotes, fetchExploreFolders, recordNoteDownload } from '../services/api';
import { ContributeNoteModal } from './ContributeNoteModal';

interface ExploreNotesProps {
  samples: SampleMaterial[];
  onSelectSample: (sampleId: string) => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onOpenAdminPanel?: () => void;
  onLaunchNoteWorkspace?: (note: CommunityNote) => void;
}

export const ExploreNotes: React.FC<ExploreNotesProps> = ({
  samples,
  onSelectSample,
  user,
  onOpenAuth,
  onOpenAdminPanel,
  onLaunchNoteWorkspace,
}) => {
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'title'>('newest');

  // Modals
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [activePreviewNote, setActivePreviewNote] = useState<CommunityNote | null>(null);

  const loadCommunityNotes = async () => {
    setLoading(true);
    try {
      const data = await fetchExploreNotes({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        folder_id: selectedFolderId === 'all' ? undefined : selectedFolderId,
        search: searchQuery.trim() || undefined,
        sort_by: sortBy,
      });
      setNotes(data.notes || []);
      setFolders(data.folders || []);
      setCategories(data.categories || []);
    } catch (e) {
      console.warn('Failed to load explore notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityNotes();
  }, [selectedCategory, selectedFolderId, sortBy, searchQuery]);

  const handleDownload = async (note: CommunityNote) => {
    try {
      const res = await recordNoteDownload(note.id);
      if (res && res.file_data) {
        const link = document.createElement('a');
        link.href = `data:${res.file_type};base64,${res.file_data}`;
        link.download = res.file_name || 'notes.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleLaunchSession = (note: CommunityNote) => {
    if (onLaunchNoteWorkspace) {
      onLaunchNoteWorkspace(note);
    } else {
      // Fallback matching sample
      const lower = (note.title + ' ' + note.subject).toLowerCase();
      if (lower.includes('tree') || lower.includes('bst')) onSelectSample('binary_trees');
      else if (lower.includes('thermo')) onSelectSample('thermodynamics');
      else onSelectSample('photosynthesis');
    }
  };

  return (
    <section id="explore-notes" className="py-16 sm:py-24 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header with Title and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Grounded Knowledge Base &amp; Community Contributions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Explore Study Notes &amp; Curricula
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Discover verified study notes, exam cheat sheets, and lecture slides contributed by scholars and reviewed by educators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setIsContributeModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Contribute Notes</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Sign In to Contribute</span>
              </button>
            )}

            {user?.role === 'admin' && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Admin Moderation</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, concept, subject..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-xs font-semibold text-slate-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="newest">Recently Added</option>
                <option value="popular">Most Popular</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Folder Pills Filter */}
          {folders.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
              <span className="text-slate-400 font-semibold whitespace-nowrap">Folders:</span>
              <button
                onClick={() => setSelectedFolderId('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedFolderId === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                All Folders
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedFolderId === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{f.name}</span>
                  {f.notes_count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700">
                      {f.notes_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
              <span className="text-slate-400 font-semibold whitespace-nowrap">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section: Published Community Notes Collection */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Published Educational Resources</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Showing {notes.length} verified notes
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <p className="text-sm">Loading verified notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 space-y-4">
              <FileText className="w-12 h-12 mx-auto text-slate-400" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                No published study notes found matching your filters
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Try clearing your search query or folder filter, or be the first scholar to contribute notes for this category!
              </p>
              {user && (
                <button
                  onClick={() => setIsContributeModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  + Upload Study Notes
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Subject pill & file badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {note.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                        {note.file_type.includes('pdf') ? 'PDF' : 'IMAGE'}
                      </span>
                    </div>

                    {/* Note Thumbnail Preview if available */}
                    {note.preview_image && (
                      <div
                        onClick={() => setActivePreviewNote(note)}
                        className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer relative group/preview"
                      >
                        <img
                          src={note.preview_image}
                          alt={note.title}
                          className="w-full h-full object-cover group-hover/preview:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/preview:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                          <Eye className="w-4 h-4" />
                          <span>Quick Preview</span>
                        </div>
                      </div>
                    )}

                    <h4
                      onClick={() => setActivePreviewNote(note)}
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition cursor-pointer"
                    >
                      {note.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {note.description || note.extracted_summary || 'Educational learning notes and key summaries.'}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata & Author */}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        <span>{note.author_name}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{note.views_count}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          <span>{note.downloads_count}</span>
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchSession(note)}
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <span>Launch Revision</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(note)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Download Resource"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Note Detail & Full Preview Modal */}
        {activePreviewNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8"
            >
              <button
                onClick={() => setActivePreviewNote(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {activePreviewNote.subject}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {activePreviewNote.category}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {activePreviewNote.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Contributed by {activePreviewNote.author_name} on {new Date(activePreviewNote.created_at).toLocaleDateString()}
                </p>
              </div>

              {activePreviewNote.preview_image && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-72 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={activePreviewNote.preview_image}
                    alt={activePreviewNote.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <h5 className="font-bold text-slate-900 dark:text-white">Synthesis / Overview</h5>
                <p className="leading-relaxed">
                  {activePreviewNote.description || activePreviewNote.extracted_summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(activePreviewNote)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Resource</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleLaunchSession(activePreviewNote);
                    setActivePreviewNote(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Interactive Study Session</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Contribute Modal */}
        <ContributeNoteModal
          isOpen={isContributeModalOpen}
          onClose={() => setIsContributeModalOpen(false)}
          onSuccess={(note) => {
            loadCommunityNotes();
            alert(
              user?.role === 'admin'
                ? `Note "${note.title}" published immediately to Explore Notes!`
                : `Thank you! Note "${note.title}" was submitted and is pending administrator review.`
            );
          }}
          folders={folders}
          categories={categories.length > 0 ? categories : ['Computer Science', 'Biology', 'Physics', 'Mathematics', 'General']}
          isAdmin={user?.role === 'admin'}
        />
      </div>
    </section>
  );
};
