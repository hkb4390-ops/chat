import React, { useEffect, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Clock, 
  User, 
  Info,
  ExternalLink
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { 
  getChatId, 
  sendMessage, 
  subscribeToMessages, 
  markChatAsRead, 
  setTypingStatus, 
  subscribeToTyping 
} from '../services/chatService';
import { VerifiedBadge } from './VerifiedBadge';

interface ChatScreenProps {
  currentUser: UserProfile;
  partner: UserProfile;
  onBack: () => void;
  onOpenPartnerProfile: (partner: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  partner,
  onBack,
  onOpenPartnerProfile,
  onNotify,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const chatId = getChatId(currentUser.uid, partner.uid);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribeMessages = subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
    });

    // Mark as read immediately and reset unread count
    markChatAsRead(chatId, currentUser.uid, partner.uid);

    // Subscribe to partner typing state
    const unsubscribeTyping = subscribeToTyping(chatId, partner.uid, (typing) => {
      setIsPartnerTyping(typing);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      // Clear own typing state on unmount
      setTypingStatus(chatId, currentUser.uid, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, currentUser.uid, partner.uid]);

  // Scroll to bottom on message list change
  useEffect(() => {
    if (messages.length > 0 || isPartnerTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: hasScrolledInit ? 'smooth' : 'auto' });
      setHasScrolledInit(true);
    }
  }, [messages, isPartnerTyping, hasScrolledInit]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputVal(val);

    // Auto-adjust height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Set typing state in RTDB
    setTypingStatus(chatId, currentUser.uid, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(chatId, currentUser.uid, false);
    }, 2500);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingStatus(chatId, currentUser.uid, false);
      setInputVal('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      await sendMessage(currentUser, partner, text);
    } catch (err: any) {
      console.error('Send message error:', err);
      onNotify('Failed to Send', err.message || 'Could not deliver message to Firebase.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp helper
  const formatTime = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPresence = () => {
    if (isPartnerTyping) return 'typing...';
    if (partner.isOnline) return 'Online now';
    if (partner.lastSeen) {
      const d = new Date(partner.lastSeen);
      return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Offline';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 aurora-bg">
      {/* Top Navigation Bar */}
      <div className="liquid-glass border-b border-white/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white/70 active:scale-95 transition-all"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() => onOpenPartnerProfile(partner)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              {partner.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.displayName || partner.username || 'Member'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center ring-2 ring-white shadow-sm text-sm">
                  {(partner.displayName || partner.username || 'M').charAt(0).toUpperCase()}
                </div>
              )}
              {partner.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {partner.displayName || partner.username || 'Study Partner'}
                </h2>
                {partner.isVerified && <VerifiedBadge size="sm" />}
              </div>
              <p
                className={`text-[11px] font-medium transition-all ${
                  isPartnerTyping
                    ? 'text-indigo-600 font-bold animate-pulse'
                    : partner.isOnline
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              >
                {formatPresence()}
              </p>
            </div>
          </div>
        </div>

        {/* Study ID pill */}
        <button
          onClick={() => onOpenPartnerProfile(partner)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 hover:bg-white border border-slate-200/60 text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <span className="font-mono text-indigo-600 text-[11px]">{partner.studyId}</span>
          <Info className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl w-full mx-auto">
        {/* Intro banner */}
        <div className="text-center py-6 px-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-sm border border-indigo-100/50">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Study Session with {partner.displayName || partner.username || 'Partner'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Messages are end-to-end synchronized in real time via Firebase Realtime Database.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600">
            Study ID: {partner.studyId}
          </div>
        </div>

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="text-center py-8 px-4 liquid-glass-subtle rounded-2xl max-w-sm mx-auto border border-white/80">
            <p className="text-xs font-medium text-slate-600">
              No messages yet. Say hello and share questions, formulas, or project notes!
            </p>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
            >
              <div
                className={`relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words whitespace-pre-wrap ${
                  isMe
                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-xs shadow-indigo-500/10'
                    : 'liquid-glass-card text-slate-800 rounded-bl-xs border border-white'
                }`}
              >
                {!isMe && (
                  <span className="block text-[10px] font-bold text-indigo-600 mb-0.5">
                    {msg.senderName}
                  </span>
                )}
                <p className="leading-relaxed text-[13px]">{msg.text}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                    isMe ? 'text-indigo-100/80' : 'text-slate-400'
                  }`}
                >
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMe && (
                    <span
                      className="inline-flex items-center ml-0.5"
                      title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}
                    >
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/70 stroke-[2]" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/70 stroke-[2]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <div className="flex items-start">
            <div className="liquid-glass-card rounded-2xl rounded-bl-xs px-4 py-3 border border-white shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="liquid-glass border-t border-white/80 p-3 sm:px-6">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <div className="flex-1 bg-white/90 rounded-2xl border border-slate-200/80 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/20 shadow-inner px-3.5 py-2 transition-all">
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${partner.displayName || partner.username || 'Partner'}...`}
              rows={1}
              className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none max-h-32 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim() || isSending}
            className="p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
            aria-label="Send message"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
