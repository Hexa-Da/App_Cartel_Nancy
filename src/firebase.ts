import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Configuration explicite des scopes
provider.addScope('profile');
provider.addScope('email');

provider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // Sur mobile, utiliser l'authentification native Google
    try {
      console.log('🔄 Authentification Google native sur mobile...');
      
      // Vérifier que le plugin est disponible
      if (!GoogleAuth) {
        console.error('❌ Plugin GoogleAuth non disponible');
        throw new Error('Plugin Google Auth non disponible - Vérifiez l\'installation');
      }
      
      console.log('✅ Plugin GoogleAuth disponible');
      
      // Vérifier que les méthodes sont disponibles
      if (typeof GoogleAuth.initialize !== 'function') {
        console.error('❌ Méthode initialize non disponible');
        throw new Error('Méthode initialize non disponible');
      }
      
      if (typeof GoogleAuth.signIn !== 'function') {
        console.error('❌ Méthode signIn non disponible');
        throw new Error('Méthode signIn non disponible');
      }
      
      console.log('✅ Méthodes GoogleAuth disponibles');
      
      // Initialiser le plugin Google Auth
      console.log('🔄 Initialisation du plugin Google Auth...');
      await GoogleAuth.initialize();
      console.log('✅ Plugin Google Auth initialisé avec succès');
      
      // Authentification native
      console.log('🔄 Tentative de connexion Google...');
      const user = await GoogleAuth.signIn();
      console.log('✅ Utilisateur connecté via Google Auth native:', user);
      
      if (user.authentication?.idToken) {
        console.log('✅ ID Token disponible, échange avec Firebase...');
        // Créer les credentials Firebase avec l'ID token
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        const firebaseUser = await signInWithCredential(auth, credential);
        console.log('✅ Utilisateur Firebase connecté:', firebaseUser.user);
        return firebaseUser.user;
      } else {
        console.error('❌ ID Token non disponible après authentification Google');
        throw new Error('ID token non disponible après authentification Google');
      }
      
    } catch (error) {
      console.error('❌ Erreur Google Auth native:', error);
      console.error('Type d\'erreur:', typeof error);
      console.error('Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
      throw error;
    }
  } else {
    // Authentification web (popup) - inchangée
    try {
      console.log('🔄 Tentative de connexion Google Auth web...');
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Connexion web réussie:', result.user);
      return result.user;
    } catch (error) {
      console.error('❌ Erreur Google Auth web:', error);
      throw error;
    }
    }
}

export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('Connecté via redirect !', result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Erreur Google OAuth redirect:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    if (Capacitor.isNativePlatform()) {
      // Déconnecter de Google Auth aussi sur mobile
      if (GoogleAuth && typeof GoogleAuth.signOut === 'function') {
        console.log('🔄 Déconnexion Google Auth...');
        await GoogleAuth.signOut();
        console.log('✅ Google Auth déconnecté');
      } else {
        console.log('⚠️ Plugin Google Auth non disponible pour la déconnexion');
      }
    }
    
    console.log('🔄 Déconnexion Firebase...');
    await auth.signOut();
    console.log('✅ Firebase déconnecté');
    console.log('✅ Déconnexion complète réussie');
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion :', error);
    console.error('Type d\'erreur:', typeof error);
    console.error('Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
    throw error;
  }
}

// Test rapide de configuration Google Auth
export async function quickGoogleAuthTest() {
  console.log('=== TEST RAPIDE GOOGLE AUTH ===');
  
  if (!Capacitor.isNativePlatform()) {
    console.log('❌ Test uniquement disponible sur plateforme native');
    return false;
  }
  
  try {
    console.log('1. Vérification du plugin...');
    if (!GoogleAuth) {
      console.error('❌ Plugin GoogleAuth non disponible');
      return false;
    }
    console.log('✅ Plugin GoogleAuth disponible');
    
    console.log('2. Vérification des méthodes...');
    const hasInitialize = typeof GoogleAuth.initialize === 'function';
    const hasSignIn = typeof GoogleAuth.signIn === 'function';
    const hasSignOut = typeof GoogleAuth.signOut === 'function';
    
    console.log('- initialize:', hasInitialize);
    console.log('- signIn:', hasSignIn);
    console.log('- signOut:', hasSignOut);
    
    if (!hasInitialize || !hasSignIn || !hasSignOut) {
      console.error('❌ Méthodes manquantes');
      return false;
    }
    
    console.log('3. Test d\'initialisation...');
    await GoogleAuth.initialize();
    console.log('✅ Initialisation réussie');
    
    console.log('4. Configuration actuelle:');
    console.log('- Plateforme:', Capacitor.getPlatform());
    console.log('- Project ID:', firebaseConfig.projectId);
    console.log('- Auth Domain:', firebaseConfig.authDomain);
    
    console.log('✅ Configuration de base valide');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test rapide:', error);
    console.error('Détails:', {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      type: typeof error
    });
    return false;
  }
}

export { auth, database, provider, storage };