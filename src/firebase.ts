import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

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
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // Authentification native (Android/iOS)
    try {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      return signInWithCredential(auth, credential);
    } catch (error) {
      console.error('Erreur Google Auth native:', error);
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

export { auth, database, provider };