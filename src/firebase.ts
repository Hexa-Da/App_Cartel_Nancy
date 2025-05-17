import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

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

// Configuration du provider pour l'authentification mobile
provider.setCustomParameters({
  prompt: 'select_account',
  // Autoriser l'authentification sur mobile
  authType: 'signInWithRedirect'
});

// Fonction pour gérer l'authentification de manière adaptative
export const signInWithGoogle = async () => {
  try {
    // Détecter si l'appareil est mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Utiliser signInWithRedirect pour les appareils mobiles
      await signInWithRedirect(auth, provider);
    } else {
      // Utiliser signInWithPopup pour les ordinateurs de bureau
      await signInWithPopup(auth, provider);
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    throw error;
  }
};

export { auth, database, provider };