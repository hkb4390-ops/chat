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
 * Searches users by Study ID, Username, or Display Name.
 */
export async function searchUsers(searchTerm: string, currentUid?: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const usersRef = ref(rtdb, 'users');
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) return [];

  const results: UserProfile[] = [];
  snapshot.forEach((child) => {
    const user = child.val() as UserProfile;
    if (currentUid && user.uid === currentUid) return;

    const matchStudyId = user.studyId?.toLowerCase().includes(term);
    const matchUsername = user.username?.toLowerCase().includes(term);
    const matchDisplayName = user.displayName?.toLowerCase().includes(term);
    const matchUid = user.uid.toLowerCase() === term;

    if (matchStudyId || matchUsername || matchDisplayName || matchUid) {
      results.push(user);
    }
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
  snapshot.forEach((child) => {
    const user = child.val() as UserProfile;
    if (user.studyId && user.studyId.toUpperCase() === cleanId) {
      matched = user;
    }
  });

  return matched;
}

/**
 * Fetches actual registered users for Discover suggestions.
 * Strictly no fake data: returns empty list if no other users are registered.
 */
export async function getSuggestedUsers(currentUid: string, maxCount: number = 20): Promise<UserProfile[]> {
  const usersRef = query(ref(rtdb, 'users'), limitToLast(maxCount));
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return [];

  const list: UserProfile[] = [];
  snapshot.forEach((child) => {
    const user = child.val() as UserProfile;
    if (user.uid !== currentUid) {
      list.push(user);
    }
  });

  // Sort online users first, then by creation date
  list.sort((a, b) => {
    if (a.isOnline === b.isOnline) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    return a.isOnline ? -1 : 1;
  });

  return list;
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
