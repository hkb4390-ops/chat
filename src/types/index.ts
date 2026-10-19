export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  studyId: string;
  email: string;
  bio?: string;
  photoURL?: string;
  createdAt: number;
  lastSeen?: number;
  isOnline?: boolean;
  isVerified?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface ConversationItem {
  chatId: string;
  otherUid: string;
  otherUser?: UserProfile;
  lastMessage: string;
  lastSenderId: string;
  lastTimestamp: number;
  unreadCount: number;
}

export interface NotificationToast {
  id: string;
  type: 'success' | 'error' | 'info' | 'message';
  title: string;
  message: string;
  timestamp?: number;
}
