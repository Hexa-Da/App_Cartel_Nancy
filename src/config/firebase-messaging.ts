/**
 * @fileoverview Configuration Firebase Cloud Messaging (FCM) pour les notifications push
 * 
 * Ce fichier configure les notifications push avec :
 * - Initialisation du service de messaging Firebase
 * - Gestion des permissions de notifications
 * - Récupération et sauvegarde des tokens FCM
 * - Écoute des messages en temps réel
 * 
 * Nécessaire car :
 * - Active les notifications push natives (Android/iOS)
 * - Gère les permissions utilisateur
 * - Synchronise les tokens pour l'envoi de notifications
 * - Écoute les messages au premier plan
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';

// Configuration Firebase Cloud Messaging
export const messaging = getMessaging(app);

// Configuration des permissions et récupération du token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return null;
  }
};

// Écouter les messages au premier plan
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

// Sauvegarder le token dans Firebase
export const saveTokenToDatabase = async (token: string, userId?: string) => {
  try {
    // Ici vous devriez sauvegarder le token dans votre base de données Firebase
    // pour pouvoir envoyer des notifications à cet utilisateur
    console.log('Token sauvegardé pour l\'utilisateur:', userId, token);
    
    // Exemple de sauvegarde dans Firebase Realtime Database
    // const tokenRef = ref(database, `userTokens/${userId || 'anonymous'}`);
    // await set(tokenRef, {
    //   token,
    //   platform: 'web',
    //   lastUpdated: Date.now()
    // });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error);
  }
};
