import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface FirebaseRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

const DATABASE_RULES_JSON = `{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "usernames": {
      ".read": true,
      ".write": "auth != null"
    },
    "studyIds": {
      ".read": true,
      ".write": "auth != null"
    },
    "status": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "userChats": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "chats": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "typing": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}`;

export const FirebaseRulesModal: React.FC<FirebaseRulesModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DATABASE_RULES_JSON);
      setCopied(true);
      onNotify('Copied Rules', 'Firebase Database rules copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify('Copy Failed', 'Please select and copy manually.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close Rules Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Firebase Realtime Database Rules
            </h3>
            <p className="text-xs text-slate-500">Security Rules Guide for Study Mods Chat</p>
          </div>
        </div>

        {/* Step-by-Step Instructions in Hindi & English */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-slate-700 space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-700">1.</span>
            <span>Apne <strong>Firebase Console</strong> me jayein ➔ <strong>Realtime Database</strong> ➔ <strong>Rules</strong> tab open karein.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-700">2.</span>
            <span>Neeche diye gaye rules ko copy karke wahan paste karein.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-700">3.</span>
            <span>Upar <strong>Publish</strong> button par click karein.</span>
          </div>
          <p className="text-[11px] text-indigo-800 font-medium pt-1 border-t border-indigo-200/60">
            ✅ In rules se dono users ko ek-dusre ke messages instant received honge aur Home page par turant dikhenge bina kisi permission error ke!
          </p>
        </div>

        {/* Rules Code Box */}
        <div className="relative my-3">
          <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            <code>{DATABASE_RULES_JSON}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Rules</span>
              </>
            )}
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
