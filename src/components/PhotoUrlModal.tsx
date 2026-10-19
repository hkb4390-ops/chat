import React, { useState } from 'react';
import { X, Image as ImageIcon, Check, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { updateProfilePhotoUrl } from '../services/userService';

interface PhotoUrlModalProps {
  uid: string;
  currentPhotoUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpdated: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
];

export const PhotoUrlModal: React.FC<PhotoUrlModalProps> = ({
  uid,
  currentPhotoUrl,
  isOpen,
  onClose,
  onPhotoUpdated,
  onNotify,
}) => {
  const [urlInput, setUrlInput] = useState(currentPhotoUrl || '');
  const [previewError, setPreviewError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      onNotify('URL Required', 'Please enter a valid image URL.', 'error');
      return;
    }

    if (!/^https?:\/\//i.test(cleanUrl)) {
      onNotify('Invalid URL', 'URL must start with http:// or https://', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfilePhotoUrl(uid, cleanUrl);
      onNotify('Photo Updated', 'Your profile picture has been updated successfully!', 'success');
      onPhotoUpdated();
      onClose();
    } catch (err: any) {
      onNotify('Update Failed', err.message || 'Could not update profile photo.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-sm">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Profile Picture URL</h3>
              <p className="text-xs text-slate-500">Use PostImages, ImgBB, or direct image link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="my-5 flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-white shadow-lg bg-slate-100 flex items-center justify-center">
            {urlInput && !previewError ? (
              <img
                src={urlInput}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-500 mt-2">
            {urlInput && !previewError ? 'Live Image Preview' : 'No preview loaded'}
          </span>
          {previewError && (
            <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3" /> Image preview failed to load, verify URL
            </span>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Image Direct URL (PostImages / ImgBB / Web)
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://i.postimg.cc/... or https://i.ibb.co/..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 shadow-inner font-mono"
            />
          </div>

          {/* Quick Preset Avatars */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Or Choose a Preset Avatar:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setUrlInput(preset);
                    setPreviewError(false);
                  }}
                  className={`w-10 h-10 rounded-2xl overflow-hidden ring-2 transition-all shrink-0 ${
                    urlInput === preset ? 'ring-indigo-600 scale-105' : 'ring-white/80 hover:ring-indigo-300'
                  }`}
                >
                  <img src={preset} alt={`Preset ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Helper Tips */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
            <span className="font-bold flex items-center gap-1 text-indigo-950">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Free Image Hosting Tips:
            </span>
            <p className="leading-relaxed text-indigo-800/90">
              Upload photo to <strong>postimages.org</strong> or <strong>imgbb.com</strong> and copy the <strong>Direct Link</strong> (ending in .png, .jpg, or .webp).
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !urlInput.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save Photo URL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
