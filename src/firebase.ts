import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyD2H_6Bz5DGvRrwChCzDem_psM_edcBwhg",
  authDomain: "hrushs.firebaseapp.com",
  databaseURL: "https://hrushs-default-rtdb.firebaseio.com",
  projectId: "hrushs",
  storageBucket: "hrushs.firebasestorage.app",
  messagingSenderId: "336205646823",
  appId: "1:336205646823:web:d6c97db2ae9a19a7b54b42",
  measurementId: "G-Z9BGVQ6G1X"
};

// Initialize Firebase singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);
export const storage = getStorage(app);

// Configure persistent authentication
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Failed to set browserLocalPersistence on Firebase Auth:', error);
});

// Human-friendly error message translator
export function getFirebaseErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || error.message || '';

  switch (code) {
    case 'auth/api-key-not-valid':
      return 'The Firebase API key is not valid or has Google Cloud API restrictions. Check your Web App configuration and authorized domain list in Firebase Console.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in or use a different email.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'The email address is formatted incorrectly.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Try again later.';
    case 'permission_denied':
    case 'PERMISSION_DENIED':
      return 'Firebase Database Permission Denied. Please ensure your Realtime Database Security Rules are published in Firebase Console.';
    case 'storage/unauthorized':
      return 'Storage permission denied. Ensure Firebase Storage rules allow authenticated uploads.';
    default:
      if (typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
      }
      return 'An unexpected error occurred. Please check your connection and try again.';
  }
}
