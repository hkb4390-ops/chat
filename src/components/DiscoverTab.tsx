import React, { useState } from 'react';
import { 
  Search, 
  Camera, 
  Sparkles, 
  MessageSquare, 
  Users, 
  Copy, 
  Check, 
  X,
  Compass
} from 'lucide-react';
import { UserProfile } from '../types';
import { searchUsers } from '../services/userService';
import { VerifiedBadge } from './VerifiedBadge';

interface DiscoverTabProps {
  currentUser: UserProfile;
  suggestedUsers: UserProfile[];
  onOpenQRScanner: () => void;
  onOpenMyQR: () => void;
  onStartChat: (user: UserProfile) => void;
  onViewProfile: (user: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  currentUser,
  suggestedUsers,
  onOpenQRScanner,
  onOpenMyQR,
  onStartChat,
  onViewProfile,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(term, currentUser.uid);
      setSearchResults(results);
    } catch (err: any) {
      console.error('Search error:', err);
      onNotify('Search Error', err.message || 'Failed to search users in database.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const handleCopyStudyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      onNotify('Copied Study ID', `Study ID ${id} copied!`, 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onNotify('Copy Failed', 'Please copy manually.', 'error');
    }
  };

  const renderUserCard = (user: UserProfile) => (
    <div
      key={user.uid}
      onClick={() => onViewProfile(user)}
      className="liquid-glass hover:bg-white rounded-2xl p-4 border border-white/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.username || 'Member'}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center ring-2 ring-white shadow-sm">
              {(user.displayName || user.username || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          {user.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {user.displayName || user.username || 'Member'}
            </span>
            {user.isVerified && <VerifiedBadge size="sm" />}
            <span className="text-xs text-slate-400 font-normal">@{user.username}</span>
          </div>

          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
            {user.bio || 'Study Mods member'}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={(e) => handleCopyStudyId(user.studyId, e)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-mono font-semibold transition-colors"
              title="Copy Study ID"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>{user.studyId}</span>
              {copiedId === user.studyId ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
            </button>

            <span className="text-[10px] text-slate-400">
              {user.isOnline ? 'Online now' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartChat(user);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 inline-flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Message</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Top Search & Actions Card */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm border border-white/80">
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-1">
          Discover Study Partners
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Connect with classmates via Study ID, username, or instant camera QR scanning.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Study ID (e.g. SM-12345), username, or name..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs sm:text-sm text-slate-800 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </form>

        {/* QR Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onOpenQRScanner}
            className="p-3 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/70 shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Scan QR Code</span>
          </button>

          <button
            onClick={onOpenMyQR}
            className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 hover:bg-indigo-100/60 text-indigo-700 text-xs font-semibold border border-indigo-100 shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>My QR Code</span>
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Search Results ({searchResults.length})
            </h3>
            <button
              onClick={handleClearSearch}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-8 text-center border border-white/80">
              <p className="text-sm font-semibold text-slate-800">No matching users found</p>
              <p className="text-xs text-slate-500 mt-1">
                Make sure the Study ID or username is typed correctly, or try scanning their QR code.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map(renderUserCard)}
            </div>
          )}
        </div>
      )}

      {/* Suggested / All Registered Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Registered Members ({suggestedUsers.length})
          </h3>
        </div>

        {suggestedUsers.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-8 text-center border border-white/80">
            <Compass className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-75" />
            <p className="text-sm font-semibold text-slate-800">No other members registered yet</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              You are currently the first registered member. Share your Study ID <span className="font-mono font-bold text-indigo-600">{currentUser.studyId}</span> or invite classmates to join and test real-time chat!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestedUsers.map(renderUserCard)}
          </div>
        )}
      </div>
    </div>
  );
};
