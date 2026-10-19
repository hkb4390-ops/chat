import { 
  ref, 
  push, 
  set, 
  get, 
  update, 
  onValue, 
  onDisconnect, 
  query, 
  limitToLast 
} from 'firebase/database';
import { rtdb } from '../firebase';
import { ChatMessage, ConversationItem, UserProfile } from '../types';
import { getUserProfile } from './userService';

/**
 * Generate a deterministic chatId for two participants.
 */
export function getChatId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

/**
 * Send a message and update conversation metadata for both users.
 */
export async function sendMessage(
  sender: UserProfile, 
  recipient: UserProfile, 
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const chatId = getChatId(sender.uid, recipient.uid);
  const now = Date.now();

  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  const messageId = newMessageRef.key!;

  const messageData: ChatMessage = {
    id: messageId,
    senderId: sender.uid,
    senderName: sender.displayName,
    text: trimmed,
    timestamp: now,
    status: 'sent',
  };

  // Get recipient's current unread count to increment
  let currentRecipientUnread = 0;
  try {
    const unreadSnap = await get(ref(rtdb, `userChats/${recipient.uid}/${sender.uid}/unreadCount`));
    if (unreadSnap.exists()) {
      currentRecipientUnread = Number(unreadSnap.val()) || 0;
    }
  } catch {}

  const updates: Record<string, any> = {};

  // Store message
  updates[`chats/${chatId}/messages/${messageId}`] = messageData;
  updates[`chats/${chatId}/participants/${sender.uid}`] = true;
  updates[`chats/${chatId}/participants/${recipient.uid}`] = true;
  updates[`chats/${chatId}/lastMessage`] = trimmed;
  updates[`chats/${chatId}/lastTimestamp`] = now;

  // Update sender's conversation list
  updates[`userChats/${sender.uid}/${recipient.uid}`] = {
    chatId,
    otherUid: recipient.uid,
    lastMessage: trimmed,
    lastSenderId: sender.uid,
    lastTimestamp: now,
    unreadCount: 0,
  };

  // Update recipient's conversation list (unread incremented)
  updates[`userChats/${recipient.uid}/${sender.uid}`] = {
    chatId,
    otherUid: sender.uid,
    lastMessage: trimmed,
    lastSenderId: sender.uid,
    lastTimestamp: now,
    unreadCount: currentRecipientUnread + 1,
  };

  // Clear typing state
  updates[`typing/${chatId}/${sender.uid}`] = false;

  await update(ref(rtdb), updates);
}

/**
 * Subscribes to messages of a chat in chronological order.
 */
export function subscribeToMessages(
  chatId: string, 
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = query(ref(rtdb, `chats/${chatId}/messages`), limitToLast(100));

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({
        id: child.key!,
        ...child.val(),
      });
    });

    // Chronological order (oldest to newest)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(messages);
  }, (err) => {
    console.error(`Messages subscription error for chat ${chatId}:`, err);
  });

  return unsubscribe;
}

/**
 * Subscribes to user's conversations list and dynamically fetches other user profiles.
 */
export function subscribeToConversations(
  currentUid: string, 
  callback: (conversations: ConversationItem[]) => void
): () => void {
  const userChatsRef = ref(rtdb, `userChats/${currentUid}`);

  const unsubscribe = onValue(userChatsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const rawList: any[] = [];
    snapshot.forEach((child) => {
      rawList.push(child.val());
    });

    // Fetch user profiles for each conversation partner
    const enrichedList: ConversationItem[] = await Promise.all(
      rawList.map(async (item) => {
        let otherUser: UserProfile | null = null;
        try {
          otherUser = await getUserProfile(item.otherUid);
        } catch {}

        return {
          chatId: item.chatId,
          otherUid: item.otherUid,
          otherUser: otherUser || {
            uid: item.otherUid,
            displayName: 'Study Member',
            username: 'member',
            studyId: 'SM-00000',
            email: '',
            createdAt: item.lastTimestamp,
            isOnline: false,
          },
          lastMessage: item.lastMessage || '',
          lastSenderId: item.lastSenderId || '',
          lastTimestamp: item.lastTimestamp || 0,
          unreadCount: item.unreadCount || 0,
        };
      })
    );

    // Sort by most recent message
    enrichedList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    callback(enrichedList);
  }, (err) => {
    console.warn(`User chats subscription error for ${currentUid}:`, err);
  });

  return unsubscribe;
}

/**
 * Marks messages from the other user as read and resets unread count.
 */
export async function markChatAsRead(
  chatId: string, 
  currentUid: string, 
  otherUid: string
): Promise<void> {
  try {
    const updates: Record<string, any> = {};
    updates[`userChats/${currentUid}/${otherUid}/unreadCount`] = 0;

    // Read latest messages and update unread status
    const messagesSnap = await get(query(ref(rtdb, `chats/${chatId}/messages`), limitToLast(25)));
    if (messagesSnap.exists()) {
      messagesSnap.forEach((child) => {
        const msg = child.val() as ChatMessage;
        if (msg.senderId === otherUid && msg.status !== 'read') {
          updates[`chats/${chatId}/messages/${child.key}/status`] = 'read';
        }
      });
    }

    await update(ref(rtdb), updates);
  } catch (err) {
    console.warn('markChatAsRead error:', err);
  }
}

/**
 * Update real-time typing status with onDisconnect cleanup.
 */
export async function setTypingStatus(
  chatId: string, 
  uid: string, 
  isTyping: boolean
): Promise<void> {
  const typingRef = ref(rtdb, `typing/${chatId}/${uid}`);
  try {
    if (isTyping) {
      await onDisconnect(typingRef).set(false);
      await set(typingRef, true);
    } else {
      await set(typingRef, false);
    }
  } catch (err) {
    // Non-critical, ignore silent typing errors
  }
}

/**
 * Subscribes to typing status of the other user in a chat.
 */
export function subscribeToTyping(
  chatId: string, 
  otherUid: string, 
  callback: (isTyping: boolean) => void
): () => void {
  const typingRef = ref(rtdb, `typing/${chatId}/${otherUid}`);
  const unsubscribe = onValue(typingRef, (snapshot) => {
    callback(Boolean(snapshot.val()));
  });
  return unsubscribe;
}
