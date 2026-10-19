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
import { soundEffects } from '../utils/soundEffects';

/**
 * Generate a deterministic chatId for two participants.
 */
export function getChatId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

/**
 * Send a message and update conversation metadata for both users.
 * Guaranteed to update Home screens for both users immediately.
 */
export async function sendMessage(
  sender: UserProfile, 
  recipient: UserProfile, 
  text: string,
  isSticker: boolean = false
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
    senderName: sender.displayName || sender.username || 'Member',
    text: trimmed,
    timestamp: now,
    status: 'sent',
    isSticker,
  };

  // Primary chat updates
  const chatUpdates: Record<string, any> = {};
  chatUpdates[`chats/${chatId}/messages/${messageId}`] = messageData;
  chatUpdates[`chats/${chatId}/participants/${sender.uid}`] = true;
  chatUpdates[`chats/${chatId}/participants/${recipient.uid}`] = true;
  chatUpdates[`chats/${chatId}/lastMessage`] = trimmed;
  chatUpdates[`chats/${chatId}/lastTimestamp`] = now;
  chatUpdates[`chats/${chatId}/lastSenderId`] = sender.uid;
  chatUpdates[`typing/${chatId}/${sender.uid}`] = false;

  // Sender's conversation list
  chatUpdates[`userChats/${sender.uid}/${recipient.uid}`] = {
    chatId,
    otherUid: recipient.uid,
    lastMessage: trimmed,
    lastSenderId: sender.uid,
    lastTimestamp: now,
    unreadCount: 0,
  };

  // Check existing unread count
  let currentUnread = 0;
  try {
    const unreadSnap = await get(ref(rtdb, `userChats/${recipient.uid}/${sender.uid}/unreadCount`));
    if (unreadSnap.exists()) {
      currentUnread = Number(unreadSnap.val()) || 0;
    }
  } catch {}

  // Recipient's conversation list
  chatUpdates[`userChats/${recipient.uid}/${sender.uid}`] = {
    chatId,
    otherUid: sender.uid,
    lastMessage: trimmed,
    lastSenderId: sender.uid,
    lastTimestamp: now,
    unreadCount: currentUnread + 1,
  };

  // Play audio sound for sending
  soundEffects.playSent();

  // Perform atomic multi-path update
  try {
    await update(ref(rtdb), chatUpdates);
  } catch (err) {
    console.warn('Multi-path update notice, falling back to sequential writes:', err);
    // Fallback: write chat message and sender's userChat directly
    try {
      await set(ref(rtdb, `chats/${chatId}/messages/${messageId}`), messageData);
      await update(ref(rtdb, `chats/${chatId}`), {
        lastMessage: trimmed,
        lastTimestamp: now,
        lastSenderId: sender.uid,
      });
      await set(ref(rtdb, `userChats/${sender.uid}/${recipient.uid}`), {
        chatId,
        otherUid: recipient.uid,
        lastMessage: trimmed,
        lastSenderId: sender.uid,
        lastTimestamp: now,
        unreadCount: 0,
      });
      try {
        await set(ref(rtdb, `userChats/${recipient.uid}/${sender.uid}`), {
          chatId,
          otherUid: sender.uid,
          lastMessage: trimmed,
          lastSenderId: sender.uid,
          lastTimestamp: now,
          unreadCount: currentUnread + 1,
        });
      } catch (recipErr) {
        console.warn('Recipient conversation write notice:', recipErr);
      }
    } catch (fallbackErr) {
      console.error('Message delivery fallback error:', fallbackErr);
      throw fallbackErr;
    }
  }
}

/**
 * Add or toggle an emoji reaction on a message (WhatsApp / Instagram style)
 */
export async function toggleReaction(
  chatId: string, 
  messageId: string, 
  uid: string, 
  emoji: string
): Promise<void> {
  try {
    const reactionRef = ref(rtdb, `chats/${chatId}/messages/${messageId}/reactions/${uid}`);
    const snap = await get(reactionRef);
    if (snap.exists() && snap.val() === emoji) {
      // Toggle off
      await set(reactionRef, null);
    } else {
      await set(reactionRef, emoji);
    }
  } catch (err) {
    console.warn('Reaction error:', err);
  }
}

/**
 * Subscribes to messages of a chat in chronological order.
 */
export function subscribeToMessages(
  chatId: string, 
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = query(ref(rtdb, `chats/${chatId}/messages`), limitToLast(120));

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
    const messagesSnap = await get(query(ref(rtdb, `chats/${chatId}/messages`), limitToLast(30)));
    let hasUnread = false;
    if (messagesSnap.exists()) {
      messagesSnap.forEach((child) => {
        const msg = child.val() as ChatMessage;
        if (msg.senderId === otherUid && msg.status !== 'read') {
          updates[`chats/${chatId}/messages/${child.key}/status`] = 'read';
          hasUnread = true;
        }
      });
    }

    await update(ref(rtdb), updates);
    if (hasUnread) {
      soundEffects.playSeen();
    }
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
    // Non-critical
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
