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
  Phone,
  Smile,
  Heart
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { 
  getChatId, 
  sendMessage, 
  subscribeToMessages, 
  markChatAsRead, 
  setTypingStatus, 
  subscribeToTyping,
  toggleReaction
} from '../services/chatService';
import { VerifiedBadge } from './VerifiedBadge';

interface ChatScreenProps {
  currentUser: UserProfile;
  partner: UserProfile;
  onBack: () => void;
  onOpenPartnerProfile: (partner: UserProfile) => void;
  onStartCall: (partner: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

const QUICK_STICKERS = [
  '👋 Hey there!',
  '📚 Let\'s study!',
  '🔥 Great job!',
  '❤️ Thank you!',
  '💡 Got a quick question?',
  '🚀 Let\'s ace this!',
  '💯 100% agreed',
  '☕ Study break?'
];

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '👏', '📚'];

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  partner,
  onBack,
  onOpenPartnerProfile,
  onStartCall,
  onNotify,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [activeMessageIdForReaction, setActiveMessageIdForReaction] = useState<string | null>(null);

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

  const handleSend = async (textToSend?: string, isSticker: boolean = false) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingStatus(chatId, currentUser.uid, false);
      if (!textToSend) {
        setInputVal('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }

      await sendMessage(currentUser, partner, text, isSticker);
    } catch (err: any) {
      console.error('Send message error:', err);
      onNotify('Failed to Send', err.message || 'Could not deliver message to Firebase.', 'error');
    } finally {
      setIsSending(false);
      setShowStickers(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    setActiveMessageIdForReaction(null);
    await toggleReaction(chatId, messageId, currentUser.uid, emoji);
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
      return `Last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Offline';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 aurora-bg">
      {/* Top Navigation Bar */}
      <div className="liquid-glass border-b border-white/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
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
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative">
              {partner.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.displayName || partner.username || 'Member'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center ring-2 ring-white shadow-xs text-sm">
                  {(partner.displayName || partner.username || 'M').charAt(0).toUpperCase()}
                </div>
              )}
              {partner.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
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

        {/* Right Action Icons: Voice Call & Profile Info */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onStartCall(partner)}
            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs"
            title="Start Voice Call"
            aria-label="Start Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenPartnerProfile(partner)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-slate-200/60 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
          >
            <span className="font-mono text-indigo-600 text-[11px]">{partner.studyId}</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl w-full mx-auto">
        {/* Intro banner */}
        <div className="text-center py-5 px-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs border border-indigo-100/50">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Study Session with {partner.displayName || partner.username || 'Partner'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
            Messages are delivered and synchronized in real time.
          </p>
        </div>

        {/* Empty state with Quick Wave suggestion */}
        {messages.length === 0 && (
          <div className="text-center py-6 px-4 liquid-glass-subtle rounded-3xl max-w-sm mx-auto border border-white/80 space-y-3">
            <p className="text-xs font-medium text-slate-600">
              No messages yet. Send a quick sticker to say hello!
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_STICKERS.slice(0, 4).map((stk, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(stk, true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 shadow-2xs active:scale-95 transition-all"
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;
          const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all group relative`}
            >
              {/* Reaction Popup Menu when clicked */}
              {activeMessageIdForReaction === msg.id && (
                <div
                  className={`absolute -top-9 z-20 flex items-center gap-1 p-1 rounded-full liquid-glass-card shadow-lg border border-white animate-in zoom-in-95 duration-150 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-slate-100 hover:scale-125 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div
                onClick={() => {
                  setActiveMessageIdForReaction(activeMessageIdForReaction === msg.id ? null : msg.id);
                }}
                className={`relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm break-words whitespace-pre-wrap cursor-pointer select-text ${
                  isMe
                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-xs shadow-indigo-500/10'
                    : 'liquid-glass-card text-slate-800 rounded-bl-xs border border-white'
                } ${msg.isSticker ? 'text-base font-semibold' : ''}`}
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

              {/* Display reactions chip */}
              {hasReactions && (
                <div
                  className={`flex items-center gap-0.5 -mt-2 z-10 ${isMe ? 'mr-2' : 'ml-2'}`}
                >
                  <div className="liquid-glass rounded-full px-2 py-0.5 shadow-2xs border border-white text-xs flex items-center gap-1">
                    {Object.values(msg.reactions!).slice(0, 3).map((r, i) => (
                      <span key={i}>{r}</span>
                    ))}
                    {Object.keys(msg.reactions!).length > 1 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        {Object.keys(msg.reactions!).length}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <div className="flex items-start">
            <div className="liquid-glass-card rounded-2xl rounded-bl-xs px-4 py-3 border border-white shadow-xs flex items-center gap-1.5">
              <span className="text-xs font-semibold text-indigo-600 mr-1.5">
                {partner.displayName || partner.username || 'Partner'} is typing
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Stickers Drawer */}
      {showStickers && (
        <div className="liquid-glass border-t border-white/70 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none animate-in slide-in-from-bottom-2 duration-150">
          {QUICK_STICKERS.map((stk, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(stk, true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 border border-slate-200/70 shadow-2xs whitespace-nowrap active:scale-95 transition-all"
            >
              {stk}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="liquid-glass border-t border-white/80 p-3 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          {/* Quick sticker trigger */}
          <button
            type="button"
            onClick={() => setShowStickers(!showStickers)}
            className={`p-2.5 rounded-2xl transition-all ${
              showStickers
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-white'
            }`}
            title="Send Quick Stickers & Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

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
