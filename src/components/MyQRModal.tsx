import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Download, Share2, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface MyQRModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const MyQRModal: React.FC<MyQRModalProps> = ({
  user,
  isOpen,
  onClose,
  onNotify,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canonical profile URL with hash parameter that auto-opens this user's profile on any device
  const profileUrl = `${window.location.origin}${window.location.pathname}#studyId=${encodeURIComponent(user.studyId)}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(profileUrl, {
      width: 400,
      margin: 1.5,
      color: {
        dark: '#1e1b4b', // deep indigo/slate
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });
  }, [isOpen, profileUrl, user.studyId]);

  if (!isOpen) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.studyId);
      setCopiedId(true);
      onNotify('Copied Study ID', `Study ID ${user.studyId} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      onNotify('Copy Failed', 'Please select and copy the text manually.', 'error');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      onNotify('Copied Link', 'Profile link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onNotify('Copy Failed', 'Please copy URL from the browser bar.', 'error');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `StudyMods_${user.username}_QR.png`;
    link.href = qrDataUrl;
    link.click();
    onNotify('Downloaded QR', 'QR Code saved to your downloads folder.', 'success');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${user.displayName} on Study Mods`,
          text: `Add me on Study Mods Chat! My Study ID is ${user.studyId}`,
          url: profileUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close QR Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User preview header */}
        <div className="relative -mt-2 mb-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.username || 'User'}
              className="w-16 h-16 rounded-2xl object-cover shadow-lg ring-4 ring-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
              {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 justify-center">
          <h3 className="text-lg font-bold text-slate-900">{user.displayName || user.username || 'User'}</h3>
          {user.isVerified && <VerifiedBadge size="sm" />}
        </div>
        <p className="text-xs text-slate-500 font-medium">@{user.username}</p>

        {/* Study ID Chip */}
        <button
          onClick={handleCopyId}
          className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wider transition-all"
          title="Click to copy Study ID"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Study ID: {user.studyId}</span>
          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
        </button>

        {/* QR Code Container */}
        <div className="mt-5 p-3 rounded-2xl bg-white shadow-inner border border-slate-100 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${user.displayName}`}
              className="w-56 h-56 rounded-xl object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
              Generating Study QR...
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 mt-3 max-w-[240px]">
          Classmates can scan this code with their camera to instantly message you.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full mt-5">
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-xs font-medium border border-slate-200/70 transition-all shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
            <span className="text-[10px]">{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-xs font-medium border border-slate-200/70 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px]">Download</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-medium transition-all shadow-md shadow-indigo-500/20"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span className="text-[10px]">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
