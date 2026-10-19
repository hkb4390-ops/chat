import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check, Sparkles, Calendar, Clock } from 'lucide-react';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (user: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onStartChat,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopyStudyId = async () => {
    try {
      await navigator.clipboard.writeText(user.studyId);
      setCopiedId(true);
      onNotify('Copied Study ID', `Study ID ${user.studyId} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      onNotify('Copy Failed', 'Please select text manually.', 'error');
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
    : 'Recent';

  const lastSeenStr = user.isOnline
    ? 'Online now'
    : user.lastSeen
    ? `Last active ${new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Offline';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close Profile"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative inline-block mb-3 mt-1">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.username || 'Member'}
              className="w-20 h-20 rounded-2xl object-cover shadow-md ring-4 ring-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-2xl flex items-center justify-center shadow-md ring-4 ring-white">
              {(user.displayName || user.username || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          {user.isOnline && (
            <span
              className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white"
              title="Online"
            />
          )}
        </div>

        {/* Names */}
        <div className="flex items-center justify-center gap-1.5">
          <h3 className="text-lg font-bold text-slate-900">{user.displayName || user.username || 'Member'}</h3>
          {user.isVerified && <VerifiedBadge size="md" />}
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">@{user.username}</p>

        {/* Study ID */}
        <button
          onClick={handleCopyStudyId}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wider transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Study ID: {user.studyId}</span>
          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
        </button>

        {/* Bio */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-slate-100 text-xs text-slate-700 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            About & Study Focus
          </span>
          <p className="leading-relaxed">
            {user.bio || 'Study Mods member. Ready to collaborate on assignments and study notes.'}
          </p>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-left">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              Member
            </span>
            <p className="text-xs font-semibold text-slate-700">{memberSince}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-indigo-500" />
              Presence
            </span>
            <p className={`text-xs font-semibold ${user.isOnline ? 'text-emerald-600' : 'text-slate-600'}`}>
              {lastSeenStr}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onClose();
            onStartChat(user);
          }}
          className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          Send Direct Message
        </button>
      </div>
    </div>
  );
};
