import React, { useState } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  Search, 
  Compass, 
  Clock, 
  Users, 
  ArrowRight,
  Bell,
  Plus,
  Check
} from 'lucide-react';
import { ConversationItem, UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { requestNotificationPermission } from '../services/notificationService';

interface HomeTabProps {
  currentUser: UserProfile;
  conversations: ConversationItem[];
  suggestedUsers: UserProfile[];
  onSelectConversation: (partner: UserProfile) => void;
  onOpenDiscover: () => void;
  onOpenMyQR: () => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  currentUser,
  conversations,
  suggestedUsers,
  onSelectConversation,
  onOpenDiscover,
  onOpenMyQR,
  onOpenProfile,
}) => {
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'default';
    }
    return false;
  });

  const requestNotificationAccess = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowNotificationBanner(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 shadow-sm border border-white/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Study ID: {currentUser.studyId}</span>
              {currentUser.isVerified && <VerifiedBadge size="sm" />}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {currentUser.displayName || currentUser.username || 'Member'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time messaging, study groups, and notes sharing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDiscover}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-xs transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Find Members
            </button>
            <button
              onClick={onOpenMyQR}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              My QR
            </button>
          </div>
        </div>
      </div>

      {/* Enable Sound & Push Notification Banner if not yet allowed */}
      {showNotificationBanner && (
        <div className="liquid-glass rounded-2xl p-3.5 border border-indigo-100 flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 to-purple-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Enable Sound & Message Alerts</h4>
              <p className="text-[11px] text-slate-600">Get notified with audio chimes when study partners message you.</p>
            </div>
          </div>
          <button
            onClick={requestNotificationAccess}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 shadow-xs active:scale-95 transition-all"
          >
            Allow Alerts
          </button>
        </div>
      )}

      {/* Online Study Members Instagram-style Stories/Carousel */}
      {suggestedUsers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Active Study Members ({suggestedUsers.length})
            </h3>
            <button
              onClick={onOpenDiscover}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              Directory <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
            {suggestedUsers.map((user) => (
              <button
                key={user.uid}
                onClick={() => onOpenProfile(user)}
                className="flex flex-col items-center gap-1.5 min-w-[76px] p-2 rounded-2xl liquid-glass-subtle hover:bg-white/95 border border-white/80 transition-all group shrink-0 active:scale-95"
              >
                <div className="relative">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.username || 'Member'}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-600 transition-all shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {(user.displayName || user.username || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </div>
                <div className="flex items-center justify-center gap-0.5 max-w-[74px]">
                  <span className="text-[11px] font-semibold text-slate-800 truncate">
                    {(user.displayName || user.username || 'Member').split(' ')[0]}
                  </span>
                  {user.isVerified && <VerifiedBadge size="sm" />}
                </div>
                <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                  {user.studyId}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversations Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            Messages ({conversations.length})
          </h3>

          <button
            onClick={onOpenDiscover}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {conversations.length === 0 ? (
          /* Empty State */
          <div className="liquid-glass rounded-3xl p-8 sm:p-10 text-center border border-white/80 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner border border-indigo-100">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No active conversations yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              When someone messages you, or when you start a conversation from Discover, their profile and real-time chat will appear here.
            </p>
            <button
              onClick={onOpenDiscover}
              className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 active:scale-95 transition-all"
            >
              <Compass className="w-4 h-4" />
              Find Members to Chat
            </button>
          </div>
        ) : (
          /* Real conversation list */
          <div className="space-y-2">
            {conversations.map((item) => {
              const partner = item.otherUser || {
                uid: item.otherUid,
                displayName: 'Study Member',
                username: 'member',
                studyId: 'SM-00000',
                email: '',
                createdAt: item.lastTimestamp,
                isOnline: false,
              };

              const isMeSender = item.lastSenderId === currentUser.uid;

              return (
                <div
                  key={item.chatId}
                  onClick={() => onSelectConversation(partner)}
                  className="liquid-glass hover:bg-white rounded-2xl p-3.5 sm:p-4 border border-white/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group active:scale-99"
                >
                  {/* Partner Avatar with Presence */}
                  <div className="relative shrink-0">
                    {partner.photoURL ? (
                      <img
                        src={partner.photoURL}
                        alt={partner.displayName || partner.username || 'Member'}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-xs group-hover:ring-indigo-400/50 transition-all"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center ring-2 ring-white shadow-xs">
                        {(partner.displayName || partner.username || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {partner.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
                    )}
                  </div>

                  {/* Message Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {partner.displayName || partner.username || 'Study Member'}
                        </span>
                        {partner.isVerified && <VerifiedBadge size="sm" />}
                        <span className="text-[10px] font-mono text-slate-400 hidden xs:inline">
                          {partner.studyId}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatTimestamp(item.lastTimestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${item.unreadCount > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                        {isMeSender && <span className="text-slate-400 font-normal">You: </span>}
                        {item.lastMessage || 'No messages yet'}
                      </p>

                      {/* Unread badge */}
                      {item.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0 shadow-sm animate-bounce">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
