import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

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
    try {
      console.log('=== DÉBUT AUTHENTIFICATION GOOGLE ===');
      console.log('Plateforme:', Capacitor.getPlatform());
      console.log('Configuration Firebase:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      });
      
      // Vérifier si GoogleAuth est disponible
      if (!GoogleAuth) {
        throw new Error('GoogleAuth plugin non disponible');
      }
      
      console.log('Vérification de la disponibilité du plugin GoogleAuth...');
      console.log('GoogleAuth object:', typeof GoogleAuth);
      console.log('GoogleAuth.initialize:', typeof GoogleAuth.initialize);
      console.log('GoogleAuth.signIn:', typeof GoogleAuth.signIn);
      
      console.log('Initialisation de Google Auth...');
      try {
        await GoogleAuth.initialize();
        console.log('✅ Google Auth initialisé avec succès');
      } catch (initError) {
        console.error('❌ Erreur lors de l\'initialisation:', initError);
        console.error('Détails de l\'erreur d\'initialisation:', {
          message: initError instanceof Error ? initError.message : 'Erreur inconnue',
          stack: initError instanceof Error ? initError.stack : 'Pas de stack trace',
          type: typeof initError
        });
        throw new Error(`Erreur d'initialisation Google Auth: ${initError}`);
      }
      
      console.log('Tentative de connexion Google...');
      let googleUser;
      try {
        // Essayer d'abord sans paramètres spécifiques
        googleUser = await GoogleAuth.signIn();
        console.log('✅ Connexion Google réussie:', {
          id: googleUser.id,
          email: googleUser.email,
          hasIdToken: !!googleUser.authentication?.idToken,
          hasAccessToken: !!googleUser.authentication?.accessToken
        });
      } catch (signInError) {
        console.error('❌ Erreur lors de la connexion Google:', signInError);
        console.error('Détails de l\'erreur de connexion:', {
          message: signInError instanceof Error ? signInError.message : 'Erreur inconnue',
          stack: signInError instanceof Error ? signInError.stack : 'Pas de stack trace',
          type: typeof signInError,
          errorObject: signInError,
          errorKeys: signInError ? Object.keys(signInError) : 'Pas de clés',
          errorStringified: JSON.stringify(signInError, Object.getOwnPropertyNames(signInError), 2)
        });
        
        // Analyser l'erreur pour plus de détails
        if (signInError && typeof signInError === 'object') {
          console.error('🔍 ANALYSE DÉTAILLÉE DE L\'ERREUR:');
          for (const [key, value] of Object.entries(signInError)) {
            console.error(`- ${key}:`, value);
          }
          
          // Essayer de capturer les propriétés non-énumérables
          const allProps = Object.getOwnPropertyNames(signInError);
          console.error('Toutes les propriétés:', allProps);
          
          for (const prop of allProps) {
            try {
              const value = (signInError as any)[prop];
              console.error(`- ${prop}:`, value);
            } catch (e) {
              console.error(`- ${prop}: [Erreur lors de l'accès]`);
            }
          }
        }
        
        throw new Error(`Erreur de connexion Google: ${signInError}`);
      }
      
      if (!googleUser.authentication?.idToken) {
        console.error('❌ Token d\'authentification Google manquant');
        console.error('Détails de l\'utilisateur Google:', googleUser);
        throw new Error('Token d\'authentification Google manquant');
      }
      
      console.log('Création des credentials Firebase...');
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      console.log('✅ Credentials Firebase créés');
      
      console.log('Connexion à Firebase...');
      const result = await signInWithCredential(auth, credential);
      console.log('✅ Connexion Firebase réussie:', {
        uid: result.user.uid,
        email: result.user.email
      });
      
      return result.user;
    } catch (error) {
      console.error('❌ ERREUR DÉTAILLÉE Google Auth native:', error);
      console.error('Type d\'erreur:', typeof error);
      console.error('Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'Pas de stack trace');
      
      // Gestion spécifique des erreurs
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          throw new Error('Erreur de réseau. Vérifiez votre connexion internet.');
        } else if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
          throw new Error('Connexion annulée par l\'utilisateur.');
        } else if (errorMessage.includes('user canceled') || errorMessage.includes('canceled')) {
          throw new Error('Connexion annulée par l\'utilisateur.');
        } else if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
          throw new Error('Erreur de popup. Essayez de redémarrer l\'application.');
        } else if (errorMessage.includes('invalid_client') || errorMessage.includes('client')) {
          throw new Error('Configuration client invalide. Vérifiez les client IDs dans Google Cloud Console.');
        } else if (errorMessage.includes('something went wrong')) {
          throw new Error('Erreur de configuration Google Auth. Vérifiez la configuration dans Google Cloud Console et les permissions. Assurez-vous que les client IDs sont corrects et que l\'application est configurée pour Android.');
        } else if (errorMessage.includes('sign_in_failed') || errorMessage.includes('signin_failed')) {
          throw new Error('Échec de la connexion. Vérifiez que Google Play Services est à jour et que l\'application est correctement configurée.');
        } else if (errorMessage.includes('developer_error')) {
          throw new Error('Erreur de développeur. Vérifiez la configuration OAuth dans Google Cloud Console.');
        } else {
          throw new Error(`Erreur d'authentification: ${error.message}`);
        }
      }
      
      throw error;
    }
  } else {
    // Authentification web (popup)
    try {
      console.log('Tentative de connexion Google Auth web...');
      const result = await signInWithPopup(auth, provider);
      console.log('Connexion web réussie:', result.user);
      return result.user;
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
      await GoogleAuth.signOut();
    }
    await auth.signOut();
    console.log('Déconnexion réussie');
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    throw error;
  }
}

// Fonction de test pour diagnostiquer les problèmes Google Auth
export async function testGoogleAuthConfiguration() {
  console.log('=== TEST CONFIGURATION GOOGLE AUTH ===');
  
  if (!Capacitor.isNativePlatform()) {
    console.log('❌ Test uniquement disponible sur plateforme native');
    return;
  }
  
  try {
    console.log('1. Vérification de la disponibilité du plugin...');
    if (!GoogleAuth) {
      console.error('❌ Plugin GoogleAuth non disponible');
      return;
    }
    console.log('✅ Plugin GoogleAuth disponible');
    
    console.log('2. Vérification des méthodes du plugin...');
    console.log('GoogleAuth.initialize:', typeof GoogleAuth.initialize);
    console.log('GoogleAuth.signIn:', typeof GoogleAuth.signIn);
    console.log('GoogleAuth.signOut:', typeof GoogleAuth.signOut);
    
    console.log('3. Tentative d\'initialisation...');
    await GoogleAuth.initialize();
    console.log('✅ Initialisation réussie');
    
    console.log('4. Configuration actuelle:');
    console.log('- Plateforme:', Capacitor.getPlatform());
    console.log('- Project ID:', firebaseConfig.projectId);
    console.log('- Auth Domain:', firebaseConfig.authDomain);
    
    console.log('5. Tentative de connexion pour test...');
    try {
      const testUser = await GoogleAuth.signIn();
      console.log('✅ Test de connexion réussi:', {
        id: testUser.id,
        email: testUser.email,
        hasIdToken: !!testUser.authentication?.idToken,
        hasAccessToken: !!testUser.authentication?.accessToken
      });
      
      // Déconnecter immédiatement après le test
      await GoogleAuth.signOut();
      console.log('✅ Déconnexion de test réussie');
      
    } catch (signInTestError) {
      console.error('❌ Erreur lors du test de connexion:', signInTestError);
      console.error('Détails complets de l\'erreur:', {
        message: signInTestError instanceof Error ? signInTestError.message : 'Erreur inconnue',
        stack: signInTestError instanceof Error ? signInTestError.stack : 'Pas de stack trace',
        type: typeof signInTestError,
        errorObject: signInTestError,
        errorStringified: JSON.stringify(signInTestError, Object.getOwnPropertyNames(signInTestError), 2)
      });
      
      // Analyser l'erreur pour plus de détails
      if (signInTestError && typeof signInTestError === 'object') {
        console.error('🔍 ANALYSE DÉTAILLÉE DE L\'ERREUR:');
        for (const [key, value] of Object.entries(signInTestError)) {
          console.error(`- ${key}:`, value);
        }
        
        // Essayer de capturer les propriétés non-énumérables
        const allProps = Object.getOwnPropertyNames(signInTestError);
        console.error('Toutes les propriétés:', allProps);
        
        for (const prop of allProps) {
          try {
            const value = (signInTestError as any)[prop];
            console.error(`- ${prop}:`, value);
          } catch (e) {
            console.error(`- ${prop}: [Erreur lors de l'accès]`);
          }
        }
      }
      
      // Analyser le type d'erreur
      if (signInTestError instanceof Error) {
        const errorMessage = signInTestError.message.toLowerCase();
        if (errorMessage.includes('something went wrong')) {
          console.error('🔍 DIAGNOSTIC: Erreur "Something went wrong" détectée');
          console.error('Causes possibles:');
          console.error('- Configuration OAuth incorrecte dans Google Cloud Console');
          console.error('- Client ID Android incorrect');
          console.error('- SHA-1 fingerprint incorrect');
          console.error('- Google Play Services non à jour');
          console.error('- Application non configurée pour Android dans Google Cloud Console');
        }
      }
      
      throw signInTestError;
    }
    
    console.log('✅ Configuration Google Auth valide');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de configuration:', error);
    console.error('Détails:', {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      type: typeof error,
      errorObject: error
    });
    throw error;
  }
}

// Fonction de test alternative pour l'authentification Google
export async function testAlternativeGoogleAuth() {
  console.log('=== TEST ALTERNATIF GOOGLE AUTH ===');
  
  if (!Capacitor.isNativePlatform()) {
    console.log('❌ Test uniquement disponible sur plateforme native');
    return;
  }
  
  try {
    console.log('1. Test avec configuration minimale...');
    
    if (!GoogleAuth) {
      console.error('❌ Plugin GoogleAuth non disponible');
      return;
    }
    
    console.log('2. Initialisation...');
    await GoogleAuth.initialize();
    console.log('✅ Initialisation réussie');
    
    console.log('3. Test de connexion avec configuration minimale...');
    const user = await GoogleAuth.signIn();
    console.log('✅ Connexion réussie avec configuration minimale:', {
      id: user.id,
      email: user.email,
      hasIdToken: !!user.authentication?.idToken
    });
    
    // Déconnecter
    await GoogleAuth.signOut();
    console.log('✅ Déconnexion réussie');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test alternatif:', error);
    console.error('Détails complets:', {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      type: typeof error,
      errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    
    // Analyser l'erreur
    if (error && typeof error === 'object') {
      console.error('🔍 ANALYSE DÉTAILLÉE:');
      const allProps = Object.getOwnPropertyNames(error);
      for (const prop of allProps) {
        try {
          const value = (error as any)[prop];
          console.error(`- ${prop}:`, value);
        } catch (e) {
          console.error(`- ${prop}: [Erreur lors de l'accès]`);
        }
      }
    }
    
    return false;
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