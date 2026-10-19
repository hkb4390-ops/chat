import React from 'react';
import { Sparkles, Search, MessageSquare } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenSearch,
  onOpenProfile,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-30 liquid-glass border-b border-white/60 px-4 py-3 sm:px-6 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xs opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white/95" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                Study Mods Chat
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
                Active
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Developed for Himanshu Raj Yadav
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="hidden md:inline">Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="hidden md:inline">Offline</span>
              </>
            )}
          </div>

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all border border-transparent hover:border-white shadow-2xs"
            title="Search members"
            aria-label="Search study members"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* User Profile Avatar shortcut */}
          {currentUser && (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full liquid-glass-subtle hover:bg-white hover:shadow-sm transition-all border border-white/80 active:scale-95"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || currentUser.username || 'User'}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-400/50 shadow-xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {(currentUser.displayName || currentUser.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-800 max-w-[70px] truncate hidden xs:inline">
                {(currentUser.displayName || currentUser.username || 'User').split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
