import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  Clock, 
  Phone, 
  Share2 
} from 'lucide-react';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (user: UserProfile, initialGreeting?: string) => void;
  onStartCall: (user: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

const ICE_BREAKER_STICKERS = [
  { label: 'Say Hello', text: '👋 Hello! Nice to connect on Study Mods.', icon: '👋', bg: 'hover:bg-amber-50' },
  { label: 'Wave Hi', text: '🌊 *Waves at you warmly* Hey there!', icon: '🌊', bg: 'hover:bg-blue-50' },
  { label: 'High Five', text: '🙌 High five! Ready to study?', icon: '🙌', bg: 'hover:bg-emerald-50' },
  { label: 'Exam Ace', text: '🚀 Let\'s ace our exams together!', icon: '🚀', bg: 'hover:bg-purple-50' },
  { label: 'Ask Doubt', text: '💡 Hey! Can we discuss a question?', icon: '💡', bg: 'hover:bg-yellow-50' },
  { label: 'Study Break', text: '☕ Chai / Coffee study break?', icon: '☕', bg: 'hover:bg-orange-50' },
  { label: 'Fire Power', text: '🔥 Let\'s crush this study session!', icon: '🔥', bg: 'hover:bg-rose-50' },
  { label: 'Notes Share', text: '📚 Hey! Can we exchange notes?', icon: '📚', bg: 'hover:bg-indigo-50' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onStartChat,
  onStartCall,
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

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#studyId=${encodeURIComponent(user.studyId)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Study Mods - ${user.displayName}`,
          text: `Connect with ${user.displayName} on Study Mods! Study ID: ${user.studyId}`,
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      onNotify('Profile Link Copied', 'Profile link copied to clipboard!', 'success');
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
      <div className="relative w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white text-center max-h-[92vh] overflow-y-auto">
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
              className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse"
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
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <button
            onClick={handleCopyStudyId}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wider transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Study ID: {user.studyId}</span>
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
          </button>

          <button
            onClick={handleShare}
            className="p-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-xs"
            title="Share this profile"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bio */}
        <div className="mt-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100 text-xs text-slate-700 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            About & Study Focus
          </span>
          <p className="leading-relaxed">
            {user.bio || 'Study Mods member. Ready to collaborate on assignments and study notes.'}
          </p>
        </div>

        {/* Break the Ice - Unique Animated Stickers */}
        <div className="mt-3.5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-0.5">
            ⚡ Quick Hello Stickers & Wave
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ICE_BREAKER_STICKERS.map((sticker, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  onStartChat(user, sticker.text);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-700 shadow-xs transition-all shrink-0 active:scale-95"
              >
                <span>{sticker.icon}</span>
                <span className="text-[11px]">{sticker.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-left">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3 text-indigo-500" />
              Member
            </span>
            <p className="text-xs font-semibold text-slate-700">{memberSince}</p>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-indigo-500" />
              Presence
            </span>
            <p className={`text-xs font-semibold ${user.isOnline ? 'text-emerald-600' : 'text-slate-600'}`}>
              {lastSeenStr}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => {
              onClose();
              onStartCall(user);
            }}
            className="py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            Voice Call
          </button>

          <button
            onClick={() => {
              onClose();
              onStartChat(user);
            }}
            className="py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message
          </button>
        </div>
      </div>
    </div>
  );
};
