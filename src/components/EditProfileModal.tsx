import React, { useState } from 'react';
import { X, Check, User, FileText, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../services/userService';

interface EditProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdated,
  onNotify,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      onNotify('Name Required', 'Display name cannot be empty.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      onNotify('Profile Updated', 'Your profile details have been saved to Firebase.', 'success');
      onUpdated();
      onClose();
    } catch (err: any) {
      onNotify('Update Failed', err.message || 'Could not update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
              <p className="text-xs text-slate-500">Update your public study information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Read-only Username & Study ID note */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Username</span>
              <p className="font-semibold text-slate-700 mt-0.5 truncate">@{user.username}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Study ID</span>
              <p className="font-semibold text-indigo-600 mt-0.5 font-mono">{user.studyId}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800"
              placeholder="e.g. Alex Johnson"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Bio & Study Interests
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 resize-none"
              placeholder="e.g. Computer Science sophomore • Algorithms & Web dev"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Tell other study partners what you are studying</span>
              <span>{bio.length}/160</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
