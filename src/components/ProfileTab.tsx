import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  LogOut, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Mail, 
  User, 
  QrCode,
  Link2
} from 'lucide-react';
import { UserProfile } from '../types';
import { logoutAccount } from '../services/authService';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileTabProps {
  currentUser: UserProfile;
  onOpenEditModal: () => void;
  onOpenPhotoUrlModal: () => void;
  onOpenMyQR: () => void;
  onOpenRules?: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  onOpenEditModal,
  onOpenPhotoUrlModal,
  onOpenMyQR,
  onOpenRules,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyStudyId = async () => {
    try {
      await navigator.clipboard.writeText(currentUser.studyId);
      setCopiedId(true);
      onNotify('Copied Study ID', `Study ID ${currentUser.studyId} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      onNotify('Copy Failed', 'Please copy manually.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAccount();
      onNotify('Signed Out', 'You have been signed out safely.', 'info');
    } catch (err: any) {
      onNotify('Sign Out Error', err.message || 'Failed to sign out.', 'error');
    }
  };

  const memberDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="space-y-5 pb-24">
      {/* Main Profile Card */}
      <div className="liquid-glass-card rounded-3xl p-6 shadow-sm border border-white text-center relative overflow-hidden">
        {/* Subtle decorative aurora top line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400" />

        {/* Avatar with Photo URL Trigger */}
        <div className="relative inline-block mb-3 mt-2">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || currentUser.username || 'User'}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white shadow-lg mx-auto"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white font-extrabold text-3xl flex items-center justify-center ring-4 ring-white shadow-lg mx-auto">
              {(currentUser.displayName || currentUser.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Photo URL edit button */}
          <button
            onClick={onOpenPhotoUrlModal}
            className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md ring-2 ring-white active:scale-95 transition-all"
            title="Change Profile Photo URL (PostImages / ImgBB)"
            aria-label="Change Profile Photo URL"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Name & Badges */}
        <div className="flex items-center justify-center gap-1.5">
          <h2 className="text-xl font-bold text-slate-900">{currentUser.displayName || currentUser.username || 'User'}</h2>
          {currentUser.isVerified && <VerifiedBadge size="md" />}
        </div>
        <p className="text-xs font-medium text-slate-500 mt-0.5">@{currentUser.username}</p>

        {/* Study ID Chip */}
        <div className="mt-2.5 flex items-center justify-center">
          <button
            onClick={handleCopyStudyId}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wider transition-all"
            title="Copy Study ID"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-mono">Study ID: {currentUser.studyId}</span>
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
          </button>
        </div>

        {/* Bio */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/70 border border-slate-100 text-xs text-slate-700 text-left relative">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Bio & Study Focus
          </span>
          <p className="leading-relaxed">
            {currentUser.bio || 'Study Mods member. Ready to share notes and solve problem sets.'}
          </p>
          <button
            onClick={onOpenEditModal}
            className="absolute top-3 right-3 text-indigo-600 hover:text-indigo-800 p-1"
            title="Edit bio & display name"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={onOpenEditModal}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/70 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit</span>
          </button>

          <button
            onClick={onOpenPhotoUrlModal}
            className="p-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/70 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Photo</span>
          </button>

          <button
            onClick={onOpenMyQR}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-100 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* Share Your Profile Card */}
      <div className="liquid-glass rounded-3xl p-5 shadow-xs border border-white/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Share Your Profile
              </h3>
              <p className="text-[11px] text-slate-500">Invite classmates or study buddies to message you</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={async () => {
              const url = `${window.location.origin}${window.location.pathname}#studyId=${encodeURIComponent(currentUser.studyId)}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `Chat with ${currentUser.displayName} on Study Mods`,
                    text: `Connect with me on Study Mods Chat! My Study ID is ${currentUser.studyId}`,
                    url,
                  });
                } catch {}
              } else {
                await navigator.clipboard.writeText(url);
                onNotify('Link Copied', 'Profile link copied to clipboard!', 'success');
              }
            }}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-2xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Copy Link</span>
          </button>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Hey! Add me on Study Mods Chat to collaborate on study notes and assignments. My Study ID is: ${currentUser.studyId}\n${window.location.origin}${window.location.pathname}#studyId=${currentUser.studyId}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-2xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span className="text-sm">💬</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Account Info Details Card */}
      <div className="liquid-glass rounded-3xl p-5 shadow-xs border border-white/80 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Account Information
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              Email
            </span>
            <span className="font-semibold text-slate-800">{currentUser.email || 'Not provided'}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Member Since
            </span>
            <span className="font-semibold text-slate-800">{memberDate}</span>
          </div>
        </div>
      </div>

      {/* Blue Verified Badge Status Card */}
      <div className="liquid-glass rounded-3xl p-5 shadow-xs border border-white/80">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Verification Status
              </h4>
              {currentUser.isVerified ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
                  Verified Official <VerifiedBadge size="sm" />
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Standard Member
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {currentUser.isVerified 
                ? 'Your account is officially verified with the blue verification badge!'
                : 'Sign in with Google to get an instant verified blue badge on your profile.'}
            </p>
          </div>
        </div>
      </div>

      {/* Database Security Rules Helper Card */}
      {onOpenRules && (
        <div className="liquid-glass rounded-3xl p-4 shadow-xs border border-white/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Firebase Database Rules</h4>
              <p className="text-[11px] text-slate-500">Copy RTDB rules for cross-user message delivery</p>
            </div>
          </div>
          <button
            onClick={onOpenRules}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-semibold shadow-2xs active:scale-95 transition-all"
          >
            View Rules
          </button>
        </div>
      )}

      {/* Sign Out Action */}
      <div className="space-y-2">
        <button
          onClick={handleLogout}
          className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-600 text-xs font-semibold border border-rose-200/60 shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
