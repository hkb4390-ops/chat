import { 
  ref, 
  get, 
  set, 
  update, 
  onValue, 
  onDisconnect, 
  serverTimestamp, 
  query, 
  orderByChild, 
  limitToLast 
} from 'firebase/database';
import { 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { auth, rtdb, storage } from '../firebase';
import { UserProfile } from '../types';

export function generateStudyId(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `SM-${digits}`;
}

/**
 * Checks if a username is available.
 * Usernames are lowercased for uniqueness check in RTDB.
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 24) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) return false;

  try {
    const usernameRef = ref(rtdb, `usernames/${clean}`);
    const snapshot = await get(usernameRef);
    if (!snapshot.exists()) return true;
    return auth.currentUser ? snapshot.val() === auth.currentUser.uid : false;
  } catch (err: any) {
    // If not yet authenticated or remote rules restrict pre-auth reads,
    // allow pre-check to pass so createUserWithEmailAndPassword can authenticate first.
    console.warn('Pre-auth username check notice (skipping pre-check):', err);
    return true;
  }
}

/**
 * Creates the user record, username reservation, and studyId reservation.
 */
export async function createUserRecord(
  uid: string, 
  displayName: string, 
  username: string, 
  email: string
): Promise<UserProfile> {
  const cleanUsername = username.trim().toLowerCase();
  const studyId = generateStudyId();
  const now = Date.now();

  const userProfile: UserProfile = {
    uid,
    displayName: displayName.trim(),
    username: cleanUsername,
    studyId,
    email: email.trim(),
    bio: 'Study Mods member 🚀',
    createdAt: now,
    lastSeen: now,
    isOnline: true,
    isVerified: false,
  };

  // Write primary user profile
  await set(ref(rtdb, `users/${uid}`), userProfile);

  // Write username and studyId pointers safely
  try {
    await set(ref(rtdb, `usernames/${cleanUsername}`), uid);
  } catch (err) {
    console.warn('Username pointer write notice:', err);
  }

  try {
    await set(ref(rtdb, `studyIds/${studyId}`), uid);
  } catch (err) {
    console.warn('StudyId pointer write notice:', err);
  }

  return userProfile;
}

/**
 * Creates or synchronizes a Google Sign-In user record with Google photo and verified badge.
 */
export async function createOrSyncGoogleUserRecord(
  uid: string,
  displayName: string,
  email: string,
  photoURL?: string | null
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  const now = Date.now();

  if (existing) {
    const updates: Record<string, any> = {
      isVerified: true, // Google accounts get verified badge
      lastSeen: now,
      isOnline: true,
    };
    if (photoURL && !existing.photoURL) {
      updates.photoURL = photoURL;
    }
    if (displayName && !existing.displayName) {
      updates.displayName = displayName;
    }
    await update(ref(rtdb, `users/${uid}`), updates);
    return { ...existing, ...updates };
  }

  // Create new user profile for Google login
  const baseName = email ? email.split('@')[0] : (displayName || 'user');
  const cleanUsername = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || `user_${uid.slice(0, 5)}`;
  const studyId = generateStudyId();

  const userProfile: UserProfile = {
    uid,
    displayName: displayName || cleanUsername,
    username: cleanUsername,
    studyId,
    email: email || '',
    photoURL: photoURL || undefined,
    bio: 'Study Mods verified member 🚀',
    createdAt: now,
    lastSeen: now,
    isOnline: true,
    isVerified: true, // Blue verification badge for Google authenticated accounts
  };

  await set(ref(rtdb, `users/${uid}`), userProfile);
  try {
    await set(ref(rtdb, `usernames/${cleanUsername}`), uid);
  } catch {}
  try {
    await set(ref(rtdb, `studyIds/${studyId}`), uid);
  } catch {}

  return userProfile;
}

/**
 * Retrieves a user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await get(ref(rtdb, `users/${uid}`));
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching user profile for', uid, error);
    return null;
  }
}

/**
 * Subscribes to changes on a user's profile.
 */
export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void): () => void {
  const userRef = ref(rtdb, `users/${uid}`);
  const unsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as UserProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn(`Profile subscription error for ${uid}:`, error);
  });
  return unsubscribe;
}

/**
 * Updates profile fields (displayName and bio only - UID and isVerified cannot be forged).
 */
export async function updateUserProfile(uid: string, data: { displayName?: string; bio?: string; photoURL?: string }): Promise<void> {
  const updates: Record<string, any> = {};
  if (data.displayName !== undefined) {
    updates[`users/${uid}/displayName`] = data.displayName.trim();
  }
  if (data.bio !== undefined) {
    updates[`users/${uid}/bio`] = data.bio.trim();
  }
  if (data.photoURL !== undefined) {
    updates[`users/${uid}/photoURL`] = data.photoURL;
  }
  await update(ref(rtdb), updates);
}

/**
 * Updates profile photo directly via URL (PostImages, ImgBB, or any image URL)
 */
export async function updateProfilePhotoUrl(uid: string, url: string): Promise<void> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('Please enter an image URL.');
  }
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Image URL must start with http:// or https://');
  }
  await update(ref(rtdb, `users/${uid}`), { photoURL: cleanUrl });
}

/**
 * Uploads a profile image to Firebase Storage and updates user profile.
 */
export function uploadProfilePhoto(
  uid: string, 
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image (JPEG, PNG, WEBP).'));
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error('Image size exceeds 5MB limit. Please select a smaller photo.'));
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `users/${uid}/profile_${Date.now()}.${fileExt}`;
    const fileStorageRef = storageRef(storage, filePath);
    const uploadTask = uploadBytesResumable(fileStorageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(progress));
      },
      (error) => {
        console.error('Storage upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await update(ref(rtdb, `users/${uid}`), { photoURL: downloadUrl });
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Searches users by Study ID, Username, Display Name, or Email (fuzzy & prefix matching).
 */
export async function searchUsers(searchTerm: string, currentUid?: string): Promise<UserProfile[]> {
  const rawTerm = searchTerm.trim().toLowerCase();
  if (!rawTerm) return [];

  const termClean = rawTerm.replace(/[@\-_\s]/g, '');

  const usersRef = ref(rtdb, 'users');
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) return [];

  const results: UserProfile[] = [];
  snapshot.forEach((child) => {
    const data = child.val() || {};
    const uid = data.uid || child.key || '';
    if (currentUid && uid === currentUid) return;

    const user: UserProfile = {
      uid,
      displayName: data.displayName || data.username || 'Member',
      username: data.username || uid.slice(0, 8),
      studyId: data.studyId || 'SM-00000',
      email: data.email || '',
      bio: data.bio || '',
      photoURL: data.photoURL || undefined,
      createdAt: data.createdAt || 0,
      lastSeen: data.lastSeen || 0,
      isOnline: Boolean(data.isOnline),
      isVerified: Boolean(data.isVerified),
    };

    const username = (user.username || '').toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    const studyId = (user.studyId || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    const matchRaw = 
      username.includes(rawTerm) ||
      displayName.includes(rawTerm) ||
      studyId.includes(rawTerm) ||
      email.includes(rawTerm) ||
      uid.toLowerCase() === rawTerm;

    const matchFuzzy = 
      termClean.length >= 2 &&
      (username.replace(/[@\-_\s]/g, '').includes(termClean) ||
       displayName.replace(/[@\-_\s]/g, '').includes(termClean) ||
       studyId.replace(/[@\-_\s]/g, '').includes(termClean));

    if (matchRaw || matchFuzzy) {
      results.push(user);
    }
  });

  // Sort online and verified users first
  results.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    return (b.lastSeen || b.createdAt || 0) - (a.lastSeen || a.createdAt || 0);
  });

  return results;
}

/**
 * Looks up an exact user by Study ID (e.g. from QR scan).
 */
export async function findUserByStudyId(studyId: string): Promise<UserProfile | null> {
  const cleanId = studyId.trim().toUpperCase();
  // First check index pointer
  const indexRef = ref(rtdb, `studyIds/${cleanId}`);
  const indexSnap = await get(indexRef);
  if (indexSnap.exists()) {
    const uid = indexSnap.val();
    return getUserProfile(uid);
  }

  // Fallback scan across users
  const usersRef = ref(rtdb, 'users');
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return null;

  let matched: UserProfile | null = null;
  const targetClean = cleanId.replace(/[^A-Z0-9]/g, '');

  snapshot.forEach((child) => {
    const data = child.val() || {};
    const uid = data.uid || child.key || '';
    const sid = (data.studyId || '').toUpperCase();
    if (sid) {
      const userStudyClean = sid.replace(/[^A-Z0-9]/g, '');
      if (userStudyClean === targetClean || sid === cleanId) {
        matched = {
          uid,
          displayName: data.displayName || data.username || 'Member',
          username: data.username || uid.slice(0, 8),
          studyId: data.studyId || cleanId,
          email: data.email || '',
          bio: data.bio || '',
          photoURL: data.photoURL || undefined,
          createdAt: data.createdAt || 0,
          lastSeen: data.lastSeen || 0,
          isOnline: Boolean(data.isOnline),
          isVerified: Boolean(data.isVerified),
        };
      }
    }
  });

  return matched;
}

/**
 * Fetches actual registered users for Discover suggestions.
 * Shows all available classmates (online & verified first).
 */
export async function getSuggestedUsers(currentUid: string, maxCount: number = 50): Promise<UserProfile[]> {
  const usersRef = ref(rtdb, 'users');
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return [];

  const list: UserProfile[] = [];
  snapshot.forEach((child) => {
    const data = child.val() || {};
    const uid = data.uid || child.key || '';
    if (uid && uid !== currentUid) {
      list.push({
        uid,
        displayName: data.displayName || data.username || 'Member',
        username: data.username || uid.slice(0, 8),
        studyId: data.studyId || 'SM-00000',
        email: data.email || '',
        bio: data.bio || '',
        photoURL: data.photoURL || undefined,
        createdAt: data.createdAt || 0,
        lastSeen: data.lastSeen || 0,
        isOnline: Boolean(data.isOnline),
        isVerified: Boolean(data.isVerified),
      });
    }
  });

  // Sort online first, then verified, then by recent activity
  list.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    return (b.lastSeen || b.createdAt || 0) - (a.lastSeen || a.createdAt || 0);
  });

  return list.slice(0, maxCount);
}

/**
 * Sets up presence using .info/connected and onDisconnect.
 */
export function initializePresence(uid: string): () => void {
  const connectedRef = ref(rtdb, '.info/connected');
  const myStatusRef = ref(rtdb, `status/${uid}`);
  const userRef = ref(rtdb, `users/${uid}`);

  const unsubscribe = onValue(connectedRef, async (snap) => {
    if (snap.val() === true) {
      try {
        // Prepare onDisconnect handlers
        await onDisconnect(myStatusRef).set({
          state: 'offline',
          lastChanged: serverTimestamp(),
        });
        await onDisconnect(userRef).update({
          isOnline: false,
          lastSeen: serverTimestamp(),
        });

        // Set online status now
        await set(myStatusRef, {
          state: 'online',
          lastChanged: serverTimestamp(),
        });
        await update(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Presence update error:', err);
      }
    }
  });

  return () => {
    unsubscribe();
    // Update offline when unmounting
    try {
      set(myStatusRef, { state: 'offline', lastChanged: Date.now() });
      update(userRef, { isOnline: false, lastSeen: Date.now() });
    } catch {}
  };
}
