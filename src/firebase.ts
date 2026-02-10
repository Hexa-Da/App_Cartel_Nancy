/**
 * @fileoverview Configuration et initialisation Firebase pour Cartel Nancy
 * 
 * Ce fichier configure Firebase avec :
 * - Initialisation de l'application Firebase (explicite et validée)
 * - Configuration de la base de données temps réel
 * - Configuration du stockage de fichiers
 * - Fonction d'authentification administrateur
 * 
 * Nécessaire car :
 * - Centralise la configuration Firebase
 * - Fournit les instances partagées (database, storage)
 * - Gère l'authentification admin sécurisée
 * - Évite la duplication de configuration
 * - Assure l'initialisation précoce sur iOS pour éviter les problèmes de chargement
 */

import { initializeApp, FirebaseApp, getApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import logger from './services/Logger';

/**
 * Valide que toutes les clés Firebase sont présentes dans les variables d'environnement
 * @throws {Error} Si une clé est manquante
 */
function validateFirebaseConfig(): void {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_DATABASE_URL'
  ];

  const missingKeys: string[] = [];

  for (const key of requiredKeys) {
    const value = import.meta.env[key];
    if (!value || value.trim() === '') {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    const errorMessage = `Clés Firebase manquantes: ${missingKeys.join(', ')}. Vérifiez votre fichier .env`;
    logger.error('[Firebase]', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Initialise Firebase de manière explicite avec validation des clés
 * 
 * IMPORTANT : Cette fonction doit être appelée AVANT le rendu React dans main.tsx
 * pour s'assurer que Firebase est prêt avant que les composants ne tentent d'y accéder.
 * 
 * Sur iOS, cela garantit que les clés sont disponibles avant toute tentative de connexion.
 * 
 * @throws {Error} Si la configuration est invalide ou si l'initialisation échoue
 */
export function initializeFirebase(): void {
  // Valider que toutes les clés sont présentes
  validateFirebaseConfig();

  // Construire la configuration Firebase
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
  };

  // Initialiser Firebase (ou récupérer l'instance existante)
  try {
    _app = initializeApp(firebaseConfig);
    logger.log('[Firebase] Application initialisée avec succès');
  } catch (error: any) {
    // Si l'app existe déjà (double initialisation), récupérer l'instance existante
    if (error.code === 'app/already-initialized') {
      _app = getApp();
      logger.log('[Firebase] Application déjà initialisée, réutilisation de l\'instance');
    } else {
      logger.error('[Firebase] Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  // Initialiser les services Firebase
  _database = getDatabase(_app);
  _storage = getStorage(_app);
  _auth = getAuth(_app);
  _isInitialized = true;

  logger.log('[Firebase] Tous les services Firebase sont prêts (Database, Storage, Auth)');
}

// Variables pour stocker les instances Firebase
let _app: FirebaseApp | null = null;
let _database: Database | null = null;
let _storage: FirebaseStorage | null = null;
let _auth: Auth | null = null;
let _isInitialized = false;

/**
 * Vérifie si Firebase est initialisé
 */
export function isFirebaseInitialized(): boolean {
  return _isInitialized && _app !== null && _database !== null;
}

// Initialisation synchrone au moment de l'import (avec validation)
// Cette initialisation garantit que Firebase est prêt dès le chargement du module
try {
  validateFirebaseConfig();
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
  };

  try {
    _app = initializeApp(firebaseConfig);
    _database = getDatabase(_app);
    _storage = getStorage(_app);
    _auth = getAuth(_app);
    _isInitialized = true;
    logger.log('[Firebase] Initialisation synchrone réussie');
  } catch (error: any) {
    if (error.code === 'app/already-initialized') {
      _app = getApp();
      _database = getDatabase(_app);
      _storage = getStorage(_app);
      _auth = getAuth(_app);
      _isInitialized = true;
      logger.log('[Firebase] Réutilisation de l\'instance existante');
    } else {
      throw error;
    }
  }
} catch (error) {
  // Log l'erreur mais ne bloque pas le chargement du module
  // L'initialisation explicite dans main.tsx pourra corriger le problème
  logger.warn('[Firebase] Erreur lors de l\'initialisation synchrone:', error);
  _isInitialized = false;
}

// Export des instances avec guards de sécurité
// Ces getters vérifient que Firebase est initialisé avant de retourner les instances
function getDatabaseSafe(): Database {
  if (!_database || !_isInitialized) {
    throw new Error('Firebase Database n\'est pas initialisé. Appelez initializeFirebase() en premier.');
  }
  return _database;
}

function getStorageSafe(): FirebaseStorage {
  if (!_storage || !_isInitialized) {
    throw new Error('Firebase Storage n\'est pas initialisé. Appelez initializeFirebase() en premier.');
  }
  return _storage;
}

function getAuthSafe(): Auth {
  if (!_auth || !_isInitialized) {
    throw new Error('Firebase Auth n\'est pas initialisé. Appelez initializeFirebase() en premier.');
  }
  return _auth;
}

function getAppSafe(): FirebaseApp {
  if (!_app || !_isInitialized) {
    throw new Error('Firebase App n\'est pas initialisé. Appelez initializeFirebase() en premier.');
  }
  return _app;
}

// Export des instances pour compatibilité avec le code existant
// Utilisation de getters pour garantir la sécurité
export const database = new Proxy({} as Database, {
  get(_target, prop) {
    return (getDatabaseSafe() as any)[prop];
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    return (getStorageSafe() as any)[prop];
  }
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAuthSafe() as any)[prop];
  }
});

export const app = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    return (getAppSafe() as any)[prop];
  }
});

// Fonction simple de vérification admin (à adapter selon vos besoins)
import { ADMIN_CODE, RESPOSPORT_CODE } from './config/admin';

export type UserRole = 'admin' | 'respoSport' | null;

export function verifyAdminCode(code: string): UserRole {
  if (code === ADMIN_CODE) {
    return 'admin';
  }
  if (code === RESPOSPORT_CODE) {
    return 'respoSport';
  }
  return null;
}