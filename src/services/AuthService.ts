/**
 * @fileoverview Service d'authentification Google via Firebase et Capacitor
 * 
 * Ce service gère :
 * - Authentification Google OAuth via Capacitor (natif) et Firebase Auth
 * - Vérification des emails admin via whitelist
 * - Gestion de la session utilisateur
 * - Déconnexion sécurisée
 * 
 * Nécessaire car :
 * - Centralise la logique d'authentification Google
 * - Remplace le système de code admin statique par une authentification réelle
 * - Fournit une interface unifiée pour l'auth admin
 * - Gère les erreurs d'authentification (fermeture popup, etc.)
 */

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { signInWithCredential, GoogleAuthProvider, signOut as firebaseSignOut, User, getIdTokenResult, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { ref, get, onValue, off } from 'firebase/database';
import { Capacitor } from '@capacitor/core';
import { auth, database, isFirebaseInitialized } from '../firebase';
import logger from './Logger';

/**
 * Interface pour l'utilisateur authentifié
 */
export interface IAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

/**
 * Cache des emails admin chargés depuis Firebase
 * Structure: { email: true } pour un accès rapide
 */
let adminEmailsCache: Record<string, boolean> = {};
let adminEmailsLoaded = false;
let adminEmailsListener: (() => void) | null = null;

/**
 * État d'initialisation du plugin GoogleAuth Capacitor
 */
let googleAuthInitialized = false;
let googleAuthInitializing = false;

/**
 * Initialise le plugin GoogleAuth Capacitor (requis pour Android/iOS)
 * Cette fonction doit être appelée au démarrage de l'app avant toute tentative de connexion
 * 
 * @returns Promise<void>
 */
export const initializeGoogleAuth = async (): Promise<void> => {
  // Ne rien faire sur web
  if (!Capacitor.isNativePlatform()) {
    logger.log('[AuthService] Plateforme web, initialisation GoogleAuth non nécessaire');
    googleAuthInitialized = true;
    return;
  }

  // Éviter les initialisations multiples
  if (googleAuthInitialized) {
    logger.log('[AuthService] GoogleAuth déjà initialisé');
    return;
  }

  if (googleAuthInitializing) {
    logger.log('[AuthService] GoogleAuth initialisation en cours, attente...');
    // Attendre que l'initialisation en cours se termine
    while (googleAuthInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    googleAuthInitializing = true;
    logger.log('[AuthService] Initialisation du plugin GoogleAuth Capacitor...');

    // Vérifier que le plugin est disponible
    if (!GoogleAuth || typeof GoogleAuth.initialize !== 'function') {
      logger.warn('[AuthService] Méthode initialize() non disponible sur GoogleAuth, le plugin peut être déjà initialisé');
      googleAuthInitialized = true;
      return;
    }

    // Initialiser le plugin
    await GoogleAuth.initialize();
    googleAuthInitialized = true;
    logger.log('[AuthService] Plugin GoogleAuth initialisé avec succès');
  } catch (error: unknown) {
    logger.error('[AuthService] Erreur lors de l\'initialisation de GoogleAuth:', error);
    // Ne pas bloquer l'app si l'initialisation échoue
    // On marquera quand même comme initialisé pour éviter les boucles infinies
    googleAuthInitialized = true;
  } finally {
    googleAuthInitializing = false;
  }
};

/**
 * Charge la liste des emails admin depuis Firebase Realtime Database
 * Les emails doivent être stockés dans `/admins` avec la structure :
 * {
 *   "email1@exemple.com": true,
 *   "email2@exemple.com": true
 * }
 * 
 * @returns Promise<void>
 */
export const loadAdminEmails = async (): Promise<void> => {
  if (!isFirebaseInitialized()) {
    logger.warn('[AuthService] Firebase non initialisé, impossible de charger les emails admin');
    return;
  }

  try {
    const adminsRef = ref(database, 'admins');
    
    // Écouter les changements en temps réel
    if (adminEmailsListener) {
      off(adminsRef, 'value', adminEmailsListener);
    }

    adminEmailsListener = onValue(
      adminsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        adminEmailsCache = {};
        
        // Convertir l'objet Firebase en cache
        Object.keys(data).forEach((email) => {
          if (data[email] === true) {
            adminEmailsCache[email.toLowerCase()] = true;
          }
        });

        adminEmailsLoaded = true;
        logger.log('[AuthService] Emails admin chargés:', Object.keys(adminEmailsCache).length);
      },
      (error) => {
        logger.error('[AuthService] Erreur lors du chargement des emails admin:', error);
        adminEmailsLoaded = false;
      }
    );

    // Chargement initial synchrone (si déjà disponible)
    const snapshot = await get(adminsRef);
    if (snapshot.exists()) {
      const data = snapshot.val() || {};
      adminEmailsCache = {};
      Object.keys(data).forEach((email) => {
        if (data[email] === true) {
          adminEmailsCache[email.toLowerCase()] = true;
        }
      });
      adminEmailsLoaded = true;
      logger.log('[AuthService] Emails admin chargés initialement:', Object.keys(adminEmailsCache).length);
    } else {
      logger.warn('[AuthService] Aucune collection "admins" trouvée dans Firebase. Créez-la dans Realtime Database.');
    }
  } catch (error) {
    logger.error('[AuthService] Erreur lors du chargement des emails admin:', error);
    adminEmailsLoaded = false;
  }
};

/**
 * Vérifie si un utilisateur est admin via Custom Claims Firebase Auth
 * @param user - Utilisateur Firebase
 * @returns Promise<boolean> true si l'utilisateur est admin selon les Custom Claims
 */
const checkAdminFromCustomClaims = async (user: User): Promise<boolean> => {
  try {
    const tokenResult = await getIdTokenResult(user, true); // Force refresh pour avoir les claims à jour
    return tokenResult.claims.admin === true || tokenResult.claims.admin === 'true';
  } catch (error) {
    logger.debug('[AuthService] Erreur lors de la vérification des Custom Claims:', error);
    return false;
  }
};

/**
 * Vérifie si un email est dans la whitelist des admins (fallback si pas de Custom Claims)
 * @param email - Email à vérifier
 * @returns true si l'email est admin, false sinon
 */
const isAdminEmail = (email: string | null): boolean => {
  if (!email) return false;
  
  // Si les emails ne sont pas encore chargés, retourner false par sécurité
  if (!adminEmailsLoaded) {
    logger.debug('[AuthService] Emails admin non chargés, vérification impossible');
    return false;
  }
  
  return adminEmailsCache[email.toLowerCase()] === true;
};

/**
 * Mappe un User Firebase vers IAuthUser
 * Vérifie d'abord les Custom Claims Firebase Auth (plus sécurisé),
 * puis fallback sur la whitelist d'emails dans Realtime Database
 * @param user - Utilisateur Firebase
 * @returns Promise<IAuthUser> avec le statut admin calculé
 */
const mapUser = async (user: User): Promise<IAuthUser> => {
  // 1. Vérifier d'abord les Custom Claims Firebase Auth (méthode recommandée)
  let isAdmin = false;
  try {
    isAdmin = await checkAdminFromCustomClaims(user);
    if (isAdmin) {
      logger.log('[AuthService] Statut admin confirmé via Custom Claims pour:', user.email);
    }
  } catch (error) {
    logger.debug('[AuthService] Custom Claims non disponibles, utilisation du fallback DB');
  }

  // 2. Fallback : vérifier la whitelist d'emails dans Realtime Database
  if (!isAdmin && adminEmailsLoaded) {
    isAdmin = isAdminEmail(user.email);
    if (isAdmin) {
      logger.log('[AuthService] Statut admin confirmé via whitelist DB pour:', user.email);
    }
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAdmin,
  };
};

/**
 * Authentifie l'utilisateur avec Google via Capacitor (natif) ou Firebase Auth (web)
 * 
 * Flux selon la plateforme :
 * - **Natif (iOS/Android)** : OAuth via Capacitor GoogleAuth → Firebase Credential
 * - **Web** : Popup Firebase Auth directement
 * 
 * @returns IAuthUser avec les informations de l'utilisateur connecté
 * @throws Error si l'authentification échoue (popup fermée, erreur réseau, etc.)
 */
export const signInWithGoogle = async (): Promise<IAuthUser> => {
  try {
    logger.log('[AuthService] Démarrage de l\'authentification Google...');
    logger.log('[AuthService] Plateforme:', Capacitor.getPlatform());

    let result: { user: User };

    // Détecter la plateforme et utiliser la méthode appropriée
    if (Capacitor.isNativePlatform()) {
      // === PLATEFORME NATIVE (iOS/Android) ===
      logger.log('[AuthService] Utilisation du plugin Capacitor GoogleAuth...');

      // Vérifier que le plugin est initialisé
      if (!googleAuthInitialized) {
        logger.warn('[AuthService] GoogleAuth non initialisé, tentative d\'initialisation...');
        await initializeGoogleAuth();
      }

      // Vérifier que le plugin est disponible
      if (!GoogleAuth || typeof GoogleAuth.signIn !== 'function') {
        throw new Error('Plugin GoogleAuth non disponible. Vérifiez que le plugin est bien installé et synchronisé avec Capacitor.');
      }

      // 1. OAuth natif via Capacitor (maintenant que l'initialisation est garantie)
      let googleUser;
      try {
        googleUser = await GoogleAuth.signIn();
      } catch (signInError: unknown) {
        // Gestion spécifique des erreurs Android
        if (signInError && typeof signInError === 'object') {
          const errorMessage = String(signInError);
          const errorCode = 'code' in signInError ? String(signInError.code) : '';
          
          // Erreur code 10 (DEVELOPER_ERROR) : Configuration SHA-1 ou Client ID incorrecte
          if (errorCode === '10' || errorMessage.includes('code: 10') || errorMessage.includes('DEVELOPER_ERROR')) {
            logger.error('[AuthService] Erreur code 10 (DEVELOPER_ERROR) - Configuration Google Sign-In incorrecte');
            throw new Error(
              'Erreur de configuration Google Sign-In (code 10). ' +
              'Vérifiez que:\n' +
              '1. Le SHA-1 de votre keystore debug est ajouté dans Firebase Console > Project Settings > Your apps > Android app\n' +
              '2. Le SHA-1 correspond bien à celui généré avec: cd android && ./gradlew signingReport\n' +
              '3. Vous avez attendu 5-10 minutes après avoir ajouté le SHA-1\n' +
              '4. Le google-services.json est à jour (téléchargé depuis Firebase Console)\n' +
              '5. Vous avez nettoyé et reconstruit le projet: cd android && ./gradlew clean && ./gradlew assembleDebug'
            );
          }
          
          // NullPointerException : Plugin non initialisé
          if (errorMessage.includes('NullPointerException') || 
              errorMessage.includes('null object reference') ||
              errorMessage.includes('GoogleSignInClient')) {
            logger.error('[AuthService] Plugin GoogleAuth non initialisé correctement malgré initialize()');
            throw new Error(
              'Le plugin Google Auth n\'est pas correctement configuré sur Android. ' +
              'Vérifiez que:\n' +
              '1. Les credentials Google sont bien configurés dans capacitor.config.ts\n' +
              '2. Vous avez exécuté: npx cap sync android\n' +
              '3. Le fichier google-services.json est présent dans android/app/\n' +
              '4. Le plugin a été correctement initialisé au démarrage de l\'app'
            );
          }
        }
        throw signInError;
      }

      if (!googleUser || !googleUser.authentication) {
        throw new Error('Aucune donnée d\'authentification reçue de Google');
      }

      const idToken = googleUser.authentication.idToken;
      if (!idToken) {
        throw new Error('Token d\'identification Google manquant');
      }

      logger.log('[AuthService] Token Google reçu, connexion à Firebase...');

      // 2. Créer une credential Firebase avec le token Google
      const credential = GoogleAuthProvider.credential(idToken);
      
      // 3. Se connecter à Firebase Auth avec la credential
      result = await signInWithCredential(auth, credential);
    } else {
      // === PLATEFORME WEB ===
      logger.log('[AuthService] Utilisation de Firebase Auth popup (web)...');

      // Utiliser directement Firebase Auth avec popup Google
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      result = await signInWithPopup(auth, provider);
    }

    if (!result.user) {
      throw new Error('Aucun utilisateur retourné par Firebase Auth');
    }

    // 4. Mapper l'utilisateur et vérifier le statut admin (Custom Claims ou whitelist DB)
    const authUser = await mapUser(result.user);

    logger.log('[AuthService] Authentification réussie:', {
      email: authUser.email,
      isAdmin: authUser.isAdmin,
    });

    // 5. Stocker le statut admin dans localStorage (temporaire, pour compatibilité)
    // TODO: À terme, utiliser uniquement Firebase Auth + Custom Claims
    localStorage.setItem('isAdmin', authUser.isAdmin ? 'true' : 'false');

    return authUser;
  } catch (error: unknown) {
    // Gestion des erreurs spécifiques Firebase Auth et Capacitor Google Auth
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string | number; message: string };
      const errorCode = String(firebaseError.code);
      
      // Erreur code 10 (DEVELOPER_ERROR) du plugin Capacitor Google Auth
      if (errorCode === '10' || errorCode === 'DEVELOPER_ERROR') {
        logger.error('[AuthService] Erreur code 10 (DEVELOPER_ERROR) - Configuration Google Sign-In incorrecte');
        throw new Error(
          'Erreur de configuration Google Sign-In (code 10). ' +
          'Vérifiez que:\n' +
          '1. Le SHA-1 de votre keystore debug est ajouté dans Firebase Console > Project Settings > Your apps > Android app\n' +
          '2. Le SHA-1 correspond bien à celui généré avec: cd android && ./gradlew signingReport\n' +
          '3. Vous avez attendu 5-10 minutes après avoir ajouté le SHA-1\n' +
          '4. Le google-services.json est à jour (téléchargé depuis Firebase Console)\n' +
          '5. Vous avez nettoyé et reconstruit le projet: cd android && ./gradlew clean && ./gradlew assembleDebug'
        );
      }
      
      // Codes d'erreur Firebase Auth pour annulation/fermeture popup
      const cancellationCodes = [
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/popup-blocked',
      ];
      
      if (cancellationCodes.includes(errorCode)) {
        logger.warn('[AuthService] Authentification annulée par l\'utilisateur:', errorCode);
        throw new Error('Authentification annulée');
      }
      
      logger.error('[AuthService] Erreur Firebase Auth:', errorCode, firebaseError.message);
      throw new Error(firebaseError.message || 'Erreur lors de l\'authentification Google');
    }
    
    // Gestion des erreurs génériques
    if (error instanceof Error) {
      // Erreur de fermeture de popup ou annulation utilisateur (fallback)
      if (error.message.includes('cancel') || 
          error.message.includes('popup_closed') ||
          error.message.includes('popup-blocked')) {
        logger.warn('[AuthService] Authentification annulée par l\'utilisateur');
        throw new Error('Authentification annulée');
      }
      
      logger.error('[AuthService] Erreur lors de l\'authentification:', error.message);
      throw error;
    }
    
    logger.error('[AuthService] Erreur inconnue lors de l\'authentification:', error);
    throw new Error('Erreur lors de l\'authentification Google');
  }
};

/**
 * Déconnecte l'utilisateur de Firebase Auth et nettoie le localStorage
 * 
 * @returns Promise<void>
 */
export const signOut = async (): Promise<void> => {
  try {
    logger.log('[AuthService] Déconnexion en cours...');

    // Déconnexion Firebase Auth
    await firebaseSignOut(auth);

    // Déconnexion Google Auth Capacitor (si nécessaire)
    try {
      await GoogleAuth.signOut();
    } catch (error) {
      // Ignorer les erreurs si l'utilisateur n'était pas connecté via Capacitor
      logger.debug('[AuthService] Erreur lors de la déconnexion Google Auth (ignorée):', error);
    }

    // Nettoyer le localStorage
    localStorage.removeItem('isAdmin');

    logger.log('[AuthService] Déconnexion réussie');
  } catch (error: unknown) {
    logger.error('[AuthService] Erreur lors de la déconnexion:', error);
    throw error;
  }
};

/**
 * Récupère l'utilisateur actuellement connecté
 * 
 * @returns Promise<IAuthUser | null> si un utilisateur est connecté, null sinon
 */
export const getCurrentUser = async (): Promise<IAuthUser | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return await mapUser(user);
};

/**
 * Vérifie si un utilisateur est actuellement connecté
 * 
 * @returns true si un utilisateur est connecté, false sinon
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

/**
 * Vérifie s'il y a un résultat de redirection Firebase Auth en attente
 * À appeler au démarrage de l'app pour récupérer le résultat après signInWithRedirect
 * 
 * @returns Promise<IAuthUser | null> L'utilisateur connecté si une redirection était en attente, null sinon
 */
export const checkRedirectResult = async (): Promise<IAuthUser | null> => {
  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult && redirectResult.user) {
      logger.log('[AuthService] Résultat de redirection trouvé au démarrage');
      const authUser = await mapUser(redirectResult.user);
      localStorage.setItem('isAdmin', authUser.isAdmin ? 'true' : 'false');
      return authUser;
    }
    return null;
  } catch (error) {
    logger.debug('[AuthService] Aucun résultat de redirection:', error);
    return null;
  }
};

/**
 * Nettoie les listeners Firebase (à appeler lors du démontage de l'app)
 */
export const cleanupAuthService = (): void => {
  if (adminEmailsListener && isFirebaseInitialized()) {
    const adminsRef = ref(database, 'admins');
    off(adminsRef, 'value', adminEmailsListener);
    adminEmailsListener = null;
  }
};
