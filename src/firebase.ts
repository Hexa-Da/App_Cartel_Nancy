import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

// Interface pour le plugin d'authentification
interface AuthPlugin {
  signIn(): Promise<{ success: boolean; error?: string }>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<{ isSignedIn: boolean; email?: string; displayName?: string; photoUrl?: string }>;
}

// Déclaration du plugin d'authentification
const Auth = registerPlugin<AuthPlugin>('Auth');

const firebaseConfig = {
  apiKey: "AIzaSyBFB_-a5O4KD1V0MSa4HYpsEMekpBTL044",
  authDomain: "cummap-7afee.firebaseapp.com",
  databaseURL: "https://cummap-7afee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cummap-7afee",
  storageBucket: "cummap-7afee.firebasestorage.app",
  messagingSenderId: "402641775282",
  appId: "1:402641775282:web:585cabb0a67ae4475937ab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Always initialize before signIn
      await GoogleAuth.initialize();
      const result = await Auth.signIn();
      if (result.success) {
        // L'authentification a réussi côté natif
        return auth.currentUser;
      } else {
        throw new Error(result.error || 'Échec de l\'authentification');
      }
    } catch (error) {
      console.error('Erreur d\'authentification native:', error);
      throw error;
    }
  } else {
    // Authentification web (popup)
    try {
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error) {
      console.error('Erreur Google Auth web:', error);
      throw error;
    }
  }
}

export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('Connecté !', result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Erreur Google OAuth:', error);
    throw error;
  }
}

export async function signOut() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion native:', error);
      throw error;
    }
  } else {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion web:', error);
      throw error;
    }
  }
}

export { auth, database, provider, storage };