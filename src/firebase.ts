/**
 * @fileoverview Configuration et initialisation Firebase pour Cartel Nancy
 * 
 * Ce fichier configure Firebase avec :
 * - Initialisation de l'application Firebase
 * - Configuration de la base de données temps réel
 * - Configuration du stockage de fichiers
 * - Fonction d'authentification administrateur
 * 
 * Nécessaire car :
 * - Centralise la configuration Firebase
 * - Fournit les instances partagées (database, storage)
 * - Gère l'authentification admin sécurisée
 * - Évite la duplication de configuration
 */

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

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
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Fonction simple de vérification admin (à adapter selon vos besoins)
import { ADMIN_CODE } from './config/admin';

export function verifyAdminCode(code: string): boolean {
  return code === ADMIN_CODE;
}

export { database, storage, auth };