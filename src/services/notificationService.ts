import { soundEffects } from '../utils/soundEffects';

// VAPID Public Key and Sender ID provided by the user for FCM / Web Push
export const FCM_VAPID_KEY = 'BKTCbtVZVPdE4l9E0Uqhw-gkrOJns4XLYj35VvAZENkso5nPzBF9JLaHOQtVejkmlthEUZWOpDmbbcyv0jOf_w4';
export const FCM_SENDER_ID = '336205646823';

/**
 * Request notification permission from browser.
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      soundEffects.playSeen(); // Pleasant confirmation chime
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Checks if notifications are currently permitted.
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Displays an incoming message system notification with sound.
 */
export function showIncomingNotification(
  senderName: string,
  messageText: string,
  photoURL?: string,
  onClick?: () => void
): void {
  // Play incoming message chime
  soundEffects.playReceived();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(`Study Mods: ${senderName}`, {
        body: messageText || 'Sent you a new message',
        icon: photoURL || '/vite.svg',
        tag: `studymods_msg_${Date.now()}`,
      });

      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('System notification error:', err);
    }
  }
}
