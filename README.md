# Study Mods Chat

**Study Mods Chat** is a complete, full-stack real-time messaging web application built for **Himanshu Raj Yadav**.

---

## 🌟 Architecture & Features

- **Real Firebase Backend**:
  - **Firebase Authentication**: Persistent authentication via `browserLocalPersistence`, email/password login, registration validation, username uniqueness check.
  - **Firebase Realtime Database (RTDB)**: Real-time 1-to-1 messaging, presence (`.info/connected` with `onDisconnect`), typing indicators (`typing/{chatId}/{uid}`), read receipts (`sent`, `delivered`, `read`), and unread counts.
  - **Firebase Storage**: Real avatar photo upload with progress monitoring, size limits (<5MB), and download URL storage.
- **Premium White Liquid Glass UI**:
  - Frosted glass cards (`backdrop-filter: blur(20px)`), delicate borders, soft aurora gradients, responsive layout across mobile and desktop.
  - 3 Primary Bottom Navigation destinations: **Home**, **Discover**, **Profile**.
- **Discovery & QR System**:
  - Unique **Study IDs** (e.g. `SM-49218`) and unique usernames.
  - **My QR Code**: High-resolution QR code generator with copy link, copy Study ID, download PNG, and native share.
  - **Scan QR Code**: In-browser camera scanning powered by `jsQR`, camera flip, and manual Study ID fallback search.
- **Strict No-Fake-Data Guarantee**:
  - No synthetic users, no hardcoded chat history, no mock presence.
  - Professional empty states when the database has no prior messages or other members yet.
- **Blue Verification Badge**:
  - Admin-assigned and protected by Firebase Security Rules. Normal users cannot forge or edit verification status.

---

## 🗄️ Database Structure

```
users/{uid}                    -> User profile (uid, displayName, username, studyId, bio, photoURL, isOnline, lastSeen, isVerified)
usernames/{username}           -> Maps lowercased unique username to uid
studyIds/{studyId}             -> Maps unique Study ID to uid
status/{uid}                   -> Presence state ('online' | 'offline', lastChanged)
userChats/{uid}/{otherUid}     -> Conversation metadata (chatId, lastMessage, lastTimestamp, unreadCount)
chats/{chatId}/messages/{msgId} -> Actual messages (id, senderId, senderName, text, timestamp, status)
typing/{chatId}/{uid}          -> Real-time boolean typing indicator
```

---

## 🔒 Security Rules

1. **Realtime Database**: File `database.rules.json` is located in the repository root and can also be viewed/copied directly from the in-app Diagnostics modal.
2. **Firebase Storage**: File `storage.rules` is located in the repository root.

---

## 🧪 Testing Checklist (17 Verification Tests)

1. **TEST 1 (Register Real Account)**: Open the app, switch to **Create Account**, register a username, email, and password.
2. **TEST 2 (Profile in Firebase)**: Profile is created with unique Study ID in `/users/{uid}` and reserved in `/usernames/{username}`.
3. **TEST 3 (Session Persistence)**: Reload the webpage; your session stays logged in without prompting for password again.
4. **TEST 4 (Sign Out & Sign In)**: Click **Sign Out** from the Profile tab, then sign back in using your registered credentials.
5. **TEST 5 (Register Second Account)**: Open an incognito/private browser tab or another device and register account B.
6. **TEST 6 (Search by Study ID)**: From account A, navigate to **Discover** and search for account B's Study ID.
7. **TEST 7 (Open Conversation)**: Click **Message** on account B's profile card.
8. **TEST 8 & 9 (Real-Time Messaging)**: Send a message from account A to account B. It immediately delivers to account B without page reload.
9. **TEST 10 (Message History)**: Reload both browser tabs; message history is preserved and loaded from RTDB.
10. **TEST 11 (Upload Profile Photo)**: In Profile tab, tap the camera icon on the avatar and upload an image to Firebase Storage.
11. **TEST 12 (Edit Display Name & Bio)**: Click **Edit Profile**, modify your name and study bio, and save to Firebase.
12. **TEST 13 (QR Code Generation & Scan)**: Open **My QR**, test copying the Study ID, download the QR image, or scan it with another camera.
13. **TEST 14 (Private Message Protection)**: Verify that users cannot read or write messages belonging to other chat IDs.
14. **TEST 15 (Blue Verification Badge)**: Normal users cannot edit `isVerified: true`; this is enforced by database rules.
15. **TEST 16 (Offline & Error State)**: Disconnecting network shows the offline indicator and real error banners if operations fail.
16. **TEST 17 (Empty States)**: When an account has no chats, it cleanly displays the empty state rather than demo or fake chats.
