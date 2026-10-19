import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, rtdb } from './firebase';
import { UserProfile, ConversationItem, NotificationToast } from './types';
import { 
  getUserProfile, 
  subscribeToUserProfile, 
  initializePresence, 
  getSuggestedUsers, 
  findUserByStudyId,
  createUserRecord
} from './services/userService';
import { subscribeToConversations, sendMessage } from './services/chatService';
import { soundEffects } from './utils/soundEffects';
import { showIncomingNotification } from './services/notificationService';

// Components
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { DiscoverTab } from './components/DiscoverTab';
import { ProfileTab } from './components/ProfileTab';
import { ChatScreen } from './components/ChatScreen';
import { AuthScreen } from './components/AuthScreen';
import { MyQRModal } from './components/MyQRModal';
import { QRScannerModal } from './components/QRScannerModal';
import { EditProfileModal } from './components/EditProfileModal';
import { PhotoUrlModal } from './components/PhotoUrlModal';
import { UserProfileModal } from './components/UserProfileModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { FirebaseRulesModal } from './components/FirebaseRulesModal';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Auth & Profile state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App Navigation & Active Chat
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeChatPartner, setActiveChatPartner] = useState<UserProfile | null>(null);

  // Data states
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Modals state
  const [isMyQROpen, setIsMyQROpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPhotoUrlModalOpen, setIsPhotoUrlModalOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [activeVoiceCallPartner, setActiveVoiceCallPartner] = useState<UserProfile | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Tracking latest conversation timestamps to alert on incoming messages
  const prevConvsRef = useRef<Record<string, number>>({});
  const isInitialConvsLoad = useRef(true);

  // Notification toasts
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const addToast = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'info' | 'message' = 'info',
    onClick?: () => void
  ) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: NotificationToast = { id, title, message, type, onClick };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Audio unlock listener so sound effects play without autoplay restriction
  useEffect(() => {
    const unlock = () => {
      soundEffects.unlockAudio();
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Monitor Firebase RTDB connection state
  useEffect(() => {
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      setIsConnected(Boolean(snap.val()));
    });
    return () => unsubscribe();
  }, []);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // Small retry in case profile record is being written
            await new Promise((resolve) => setTimeout(resolve, 600));
            profile = await getUserProfile(user.uid);
          }
          if (!profile) {
            // If profile still missing, create profile from user credentials
            const cleanUsername = (user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
            profile = await createUserRecord(
              user.uid,
              user.displayName || cleanUsername,
              cleanUsername,
              user.email || ''
            );
          }
          setCurrentUser(profile);
        } catch (err: any) {
          console.error('Error fetching initial profile:', err);
        }
      } else {
        setCurrentUser(null);
        setActiveChatPartner(null);
        setConversations([]);
        setSuggestedUsers([]);
        prevConvsRef.current = {};
        isInitialConvsLoad.current = true;
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Monitor Current User's Profile in RTDB and Presence & Conversations
  useEffect(() => {
    if (!authUser || !currentUser) return;

    // Presence setup
    const cleanupPresence = initializePresence(authUser.uid);

    // Profile subscription
    const unsubscribeProfile = subscribeToUserProfile(authUser.uid, (profile) => {
      if (profile) {
        setCurrentUser(profile);
      }
    });

    // Reset initial load tracking on auth change
    isInitialConvsLoad.current = true;

    // Conversations subscription with incoming audio chime and notifications
    const unsubscribeConversations = subscribeToConversations(authUser.uid, (list) => {
      setConversations(list);

      // On initial load, record timestamps without ringing
      if (isInitialConvsLoad.current) {
        list.forEach((item) => {
          prevConvsRef.current[item.chatId] = item.lastTimestamp;
        });
        isInitialConvsLoad.current = false;
        return;
      }

      // Check for incoming new messages from other participants
      list.forEach((item) => {
        const prevTs = prevConvsRef.current[item.chatId] || 0;
        if (item.lastTimestamp > prevTs && item.lastSenderId !== authUser.uid) {
          // Play incoming audio chime
          soundEffects.playReceived();

          const partner = item.otherUser || {
            uid: item.otherUid,
            displayName: 'Study Member',
            username: 'member',
            studyId: 'SM-00000',
            email: '',
            createdAt: item.lastTimestamp,
            isOnline: false,
          };
          const partnerName = partner.displayName || partner.username || 'Study Partner';
          const msgText = item.lastMessage || 'Sent you a message';

          // If not currently in active chat with this partner, show toast & push notification
          if (activeChatPartner?.uid !== item.otherUid) {
            addToast(
              `New message from ${partnerName}`,
              msgText,
              'message',
              () => {
                setActiveChatPartner(partner);
              }
            );

            showIncomingNotification(partnerName, msgText, partner.photoURL, () => {
              window.focus();
              setActiveChatPartner(partner);
            });
          }
        }
        prevConvsRef.current[item.chatId] = item.lastTimestamp;
      });
    });

    // Load registered users for suggestions
    const loadSuggested = async () => {
      try {
        const users = await getSuggestedUsers(authUser.uid, 50);
        setSuggestedUsers(users);
      } catch (err) {
        console.warn('Suggested users fetch warning:', err);
      }
    };
    loadSuggested();

    // Refresh suggestions every 30s
    const interval = setInterval(loadSuggested, 30000);

    return () => {
      cleanupPresence();
      unsubscribeProfile();
      unsubscribeConversations();
      clearInterval(interval);
    };
  }, [authUser?.uid, activeChatPartner?.uid]);

  // Handle URL hash on load (e.g. #studyId=SM-12345 or shared links)
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('studyId=')) {
        const match = hash.match(/studyId=([A-Za-z0-9_-]+)/);
        if (match && match[1]) {
          const studyId = decodeURIComponent(match[1]);
          try {
            const user = await findUserByStudyId(studyId);
            if (user && currentUser && user.uid !== currentUser.uid) {
              setPreviewUser(user);
            }
          } catch {}
        }
      }
    };

    if (currentUser) {
      handleHash();
    }
  }, [currentUser?.uid]);

  // Total unread messages across all conversations
  const totalUnreadCount = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

  // Loading Screen
  if (isAuthLoading || (authUser && !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 aurora-bg">
        <div className="liquid-glass-card rounded-3xl p-8 shadow-2xl border border-white text-center flex flex-col items-center max-w-xs w-full">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/25 animate-pulse">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Study Mods Chat</h2>
          <p className="text-xs text-slate-500 mt-1">Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Screen
  if (!authUser || !currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthScreen
          onSuccess={() => {}}
          onNotify={addToast}
        />
      </>
    );
  }

  // Authenticated Main View
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 aurora-bg selection:bg-indigo-500 selection:text-white">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenSearch={() => setCurrentTab('discover')}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenRules={() => setIsRulesModalOpen(true)}
        isOnline={isConnected}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 sm:px-6">
        {currentTab === 'home' && (
          <HomeTab
            currentUser={currentUser}
            conversations={conversations}
            suggestedUsers={suggestedUsers}
            onSelectConversation={(partner) => setActiveChatPartner(partner)}
            onOpenDiscover={() => setCurrentTab('discover')}
            onOpenMyQR={() => setIsMyQROpen(true)}
            onOpenProfile={(user) => setPreviewUser(user)}
          />
        )}

        {currentTab === 'discover' && (
          <DiscoverTab
            currentUser={currentUser}
            suggestedUsers={suggestedUsers}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenMyQR={() => setIsMyQROpen(true)}
            onStartChat={(user) => setActiveChatPartner(user)}
            onViewProfile={(user) => setPreviewUser(user)}
            onNotify={addToast}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileTab
            currentUser={currentUser}
            onOpenEditModal={() => setIsEditProfileOpen(true)}
            onOpenPhotoUrlModal={() => setIsPhotoUrlModalOpen(true)}
            onOpenMyQR={() => setIsMyQROpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onNotify={addToast}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={(tab) => setCurrentTab(tab)}
        unreadCount={totalUnreadCount}
      />

      {/* Active 1-to-1 Chat Overlay */}
      {activeChatPartner && (
        <ChatScreen
          currentUser={currentUser}
          partner={activeChatPartner}
          onBack={() => setActiveChatPartner(null)}
          onOpenPartnerProfile={(partner) => setPreviewUser(partner)}
          onStartCall={(partner) => setActiveVoiceCallPartner(partner)}
          onNotify={addToast}
        />
      )}

      {/* My QR Modal */}
      <MyQRModal
        user={currentUser}
        isOpen={isMyQROpen}
        onClose={() => setIsMyQROpen(false)}
        onNotify={addToast}
      />

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onUserFound={(user) => {
          if (user.uid === currentUser.uid) {
            addToast('Self Scan', 'That is your own Study ID!', 'info');
          } else {
            setActiveChatPartner(user);
          }
        }}
        onNotify={addToast}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={currentUser}
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onUpdated={async () => {
          if (authUser) {
            const refreshed = await getUserProfile(authUser.uid);
            if (refreshed) setCurrentUser(refreshed);
          }
        }}
        onNotify={addToast}
      />

      {/* Photo URL Modal */}
      <PhotoUrlModal
        uid={currentUser.uid}
        currentPhotoUrl={currentUser.photoURL}
        isOpen={isPhotoUrlModalOpen}
        onClose={() => setIsPhotoUrlModalOpen(false)}
        onPhotoUpdated={async () => {
          if (authUser) {
            const refreshed = await getUserProfile(authUser.uid);
            if (refreshed) setCurrentUser(refreshed);
          }
        }}
        onNotify={addToast}
      />

      {/* User Profile Preview Modal with Quick Wave / Greeting auto-send */}
      <UserProfileModal
        user={previewUser}
        isOpen={previewUser !== null}
        onClose={() => setPreviewUser(null)}
        onStartChat={async (user, initialGreeting) => {
          setPreviewUser(null);
          setActiveChatPartner(user);
          if (initialGreeting && currentUser) {
            try {
              await sendMessage(currentUser, user, initialGreeting, true);
            } catch (e) {
              console.warn('Initial greeting send notice:', e);
            }
          }
        }}
        onStartCall={(user) => {
          setPreviewUser(null);
          setActiveVoiceCallPartner(user);
        }}
        onNotify={addToast}
      />

      {/* Voice Call Modal */}
      {activeVoiceCallPartner && (
        <VoiceCallModal
          partner={activeVoiceCallPartner}
          isOpen={activeVoiceCallPartner !== null}
          onClose={() => setActiveVoiceCallPartner(null)}
        />
      )}

      {/* Firebase Database Security Rules Helper Modal */}
      <FirebaseRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        onNotify={addToast}
      />
    </div>
  );
}
