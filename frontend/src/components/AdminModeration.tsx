import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Trash2,
  Edit2,
  Plus,
  FileText,
  AlertCircle,
  Eye,
  Loader2,
  ExternalLink,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { CommunityNote, Folder } from '../types';
import {
  fetchAdminNotes,
  moderateAdminNote,
  assignAdminFolder,
  deleteAdminNote,
  createAdminFolder,
  updateAdminFolder,
  deleteAdminFolder,
  fetchExploreFolders,
} from '../services/api';

interface AdminModerationProps {
  onOpenStudySession?: (note: CommunityNote) => void;
  onOpenContributeModal?: () => void;
  onBackToDashboard?: () => void;
}

export const AdminModeration: React.FC<AdminModerationProps> = ({
  onOpenStudySession,
  onOpenContributeModal,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'folders'>('queue');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'published' | 'rejected' | 'all'>('pending');
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingNote, setRejectingNote] = useState<CommunityNote | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderColor, setFolderColor] = useState('indigo');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedNotes, fetchedFolders] = await Promise.all([
        fetchAdminNotes(statusFilter),
        fetchExploreFolders(),
      ]);
      setNotes(fetchedNotes);
      setFolders(fetchedFolders);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleApprove = async (note: CommunityNote) => {
    try {
      await moderateAdminNote(note.id, 'approve');
      setActionSuccess(`Note "${note.title}" approved and published to Explore Notes!`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve note');
    }
  };

  const handleOpenReject = (note: CommunityNote) => {
    setRejectingNote(note);
    setRejectionReason('Does not meet current academic content guidelines or contains illegible handwriting.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingNote) return;
    try {
      await moderateAdminNote(rejectingNote.id, 'reject', rejectionReason);
      setActionSuccess(`Note "${rejectingNote.title}" rejected with feedback sent to author.`);
      setRejectingNote(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject note');
    }
  };

  const handleDelete = async (note: CommunityNote) => {
    if (!confirm(`Are you sure you want to permanently delete note "${note.title}"?`)) return;
    try {
      await deleteAdminNote(note.id);
      setActionSuccess(`Note "${note.title}" deleted.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
    }
  };

  const handleAssignFolder = async (noteId: string, fId: string) => {
    try {
      await assignAdminFolder(noteId, fId || null);
      setActionSuccess('Folder assignment updated.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign folder');
    }
  };

  // Folder management
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFolder) {
        await updateAdminFolder(editingFolder.id, folderName, folderDesc, folderColor);
        setActionSuccess(`Folder "${folderName}" updated.`);
      } else {
        await createAdminFolder(folderName, folderDesc, folderColor);
        setActionSuccess(`Folder "${folderName}" created.`);
      }
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      setFolderName('');
      setFolderDesc('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save folder');
    }
  };

  const handleDeleteFolder = async (f: Folder) => {
    if (!confirm(`Are you sure you want to delete folder "${f.name}"?`)) return;
    try {
      await deleteAdminFolder(f.id, true);
      setActionSuccess(`Folder "${f.name}" deleted.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder');
    }
  };

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl border border-indigo-900/60 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Study Resource Moderation &amp; Organization
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Review student-submitted study notes, publish high-yield learning packs to public Explore Notes,
            and organize materials into categories and curriculum folders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              Back to Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={onOpenContributeModal}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Upload Curated Note</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Note Moderation Queue</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {notes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('folders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'folders'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Curriculum Folders</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {folders.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Moderation Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Filter Status:
              </span>
              {(['pending', 'published', 'rejected', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'pending' ? 'Pending Review ⏳' : st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadData}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Refresh Queue
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Loader2 className="w-7 h-7 mx-auto animate-spin text-indigo-600" />
              <p className="text-xs">Loading moderation queue...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Queue is clear!
              </h3>
              <p className="text-xs text-slate-500">
                No notes found matching the "{statusFilter}" status filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                >
                  <div className="flex gap-4 items-start">
                    {/* Thumbnail preview */}
                    <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {note.preview_image ? (
                        <img
                          src={note.preview_image}
                          alt={note.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {note.subject}
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {note.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            note.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : note.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {note.status}
                        </span>
                        {note.folder_name && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            📁 {note.folder_name}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {note.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xl">
                        {note.description || note.extracted_summary || 'No description provided.'}
                      </p>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                        <span>Submitted by: <strong className="text-slate-700 dark:text-slate-300">{note.author_name}</strong></span>
                        <span>•</span>
                        <span>File: {note.file_name} ({(note.file_size / 1024).toFixed(0)} KB)</span>
                        <span>•</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>

                      {note.rejection_reason && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg mt-1">
                          <strong>Rejection note:</strong> {note.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {note.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(note)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve &amp; Publish</span>
                        </button>
                      )}

                      {note.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReject(note)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Assign Folder select */}
                      <select
                        value={note.folder_id || ''}
                        onChange={(e) => handleAssignFolder(note.id, e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                      >
                        <option value="">Move to folder...</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Folders Management */}
      {activeTab === 'folders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              <span>Curriculum Subject Folders</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null);
                setFolderName('');
                setFolderDesc('');
                setFolderColor('indigo');
                setIsFolderModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Folder</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {folders.map((f) => (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {f.notes_count} Published Note(s)
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {f.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {f.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFolder(f);
                      setFolderName(f.name);
                      setFolderDesc(f.description);
                      setFolderColor(f.color || 'indigo');
                      setIsFolderModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Edit Folder"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Reject Note: "{rejectingNote.title}"
            </h3>
            <p className="text-xs text-slate-500">
              Provide constructive feedback for the contributing student explaining why this note was not published.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingNote(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Folder Create/Edit Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingFolder ? 'Edit Folder' : 'Create New Folder'}
            </h3>
            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Brief curriculum description..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md"
                >
                  {editingFolder ? 'Save Changes' : 'Create Folder'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
