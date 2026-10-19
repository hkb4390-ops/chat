import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { auth } from '../firebase';
import { checkUsernameAvailability, createUserRecord, createOrSyncGoogleUserRecord } from './userService';
import { UserProfile } from '../types';

export interface RegistrationParams {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export async function registerAccount(params: RegistrationParams): Promise<User> {
  const { displayName, username, email, password, confirmPassword } = params;

  // 1. Validate fields
  if (!displayName || displayName.trim().length < 2) {
    throw new Error('Please enter a display name with at least 2 characters.');
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3 || cleanUsername.length > 24) {
    throw new Error('Username must be between 3 and 24 characters.');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    throw new Error('Username can only contain letters, numbers, and underscores.');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (password !== confirmPassword) {
    throw new Error('Password confirmation does not match.');
  }

  // 2. Check username availability (safe pre-check)
  const isAvailable = await checkUsernameAvailability(cleanUsername);
  if (!isAvailable) {
    throw new Error(`Username "@${cleanUsername}" is already taken. Please choose another one.`);
  }

  // 3. Create Firebase Auth user (establishes genuine authenticated session)
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;

  // 4. Update display name on Auth profile
  try {
    await updateProfile(user, { displayName: displayName.trim() });
  } catch (err) {
    console.warn('Failed to update auth display name:', err);
  }

  // 5. Create Database User Profile & reserve username
  try {
    await createUserRecord(user.uid, displayName.trim(), cleanUsername, email.trim());
  } catch (dbErr: any) {
    console.error('Error creating database profile record:', dbErr);
    // Profile creation error is logged; Auth account exists
  }

  return user;
}

export async function loginAccount(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new Error('Please provide both email and password.');
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Create or sync user profile with Google avatar and verified badge
  const profile = await createOrSyncGoogleUserRecord(
    user.uid,
    user.displayName || 'Google Member',
    user.email || '',
    user.photoURL
  );

  return { user, profile };
}

export async function logoutAccount(): Promise<void> {
  await signOut(auth);
}
