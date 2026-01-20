/**
 * @fileoverview Service centralisé pour la gestion des notifications et permissions
 * 
 * Ce service gère toutes les notifications avec :
 * - Notifications push natives (Android/iOS) via Capacitor
 * - Notifications locales pour les événements in-app
 * - Gestion des permissions (notifications, géolocalisation)
 * - Abonnement aux topics FCM pour le chat
 * - Pattern Singleton pour une instance unique
 * 
 * Nécessaire car :
 * - Centralise la logique de notifications complexe
 * - Gère les différences entre plateformes (web/mobile)
 * - Assure la cohérence des permissions
 * - Évite la duplication de code de notifications
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { ref, set, get } from 'firebase/database';
import { database } from '../firebase';
import logger from './Logger';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private isInitializing = false; // Protection contre les appels multiples simultanés
  private fcmToken: string | null = null;
  private readonly chatTopic = 'chat';
  private lastNetworkErrorTime: number = 0;
  private readonly NETWORK_ERROR_LOG_INTERVAL = 60000; // Logger l'erreur réseau max 1 fois par minute
  private subscriptionAttempts = new Map<string, number>(); // Suivi des tentatives de subscription par token
  private readonly MAX_SUBSCRIPTION_ATTEMPTS = 5; // Nombre max de tentatives
  private readonly SUBSCRIPTION_RETRY_DELAYS = [1000, 3000, 5000, 10000, 20000]; // Délais progressifs en ms
  private isSubscribing = false; // Protection contre les subscriptions multiples simultanées

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(forceReinit = false) {
    // Protection contre les appels multiples simultanés
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    if (this.isInitialized && !forceReinit) {
      return;
    }

    this.isInitializing = true;

    try {
      // Détecter si c'est la première ouverture
      const isFirstLaunch = localStorage.getItem('notifications') === null;
      
      // S'assurer que les notifications sont activées par défaut
      if (isFirstLaunch) {
        localStorage.setItem('notifications', 'true');
      }

      // Synchroniser l'état avec le service worker
      const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      this.notifyServiceWorker(notificationsEnabled);

      if (Capacitor.isNativePlatform()) {
        await this.initializeNativePush();
      } else {
        await this.initializeWebPush();
      }

      await this.requestLocationPermission();
      this.isInitialized = true;
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de l\'initialisation:', error);
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Déclenche l'envoi d'une notification push pour un nouveau message de chat.
   * La distribution finale est gérée côté serveur (Cloud Function / API sécurisée).
   * Note: Cette fonction envoie toujours les notifications aux autres utilisateurs,
   * même si l'expéditeur a désactivé les notifications localement.
   */
  async notifyChatMessage(message: string, sender: string) {
    try {
      // Confirmer à l'expéditeur localement seulement si les notifications sont activées
      const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      if (notificationsEnabled) {
        await this.sendLocalNotification(
          'Message envoyé',
          'Votre message a été envoyé avec succès'
        );
      }

      // Construire l'URL de l'endpoint si elle n'est pas définie
      let endpoint = import.meta.env.VITE_FCM_NOTIFICATION_ENDPOINT;
      if (!endpoint) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          logger.warn('[NotificationService] VITE_FCM_NOTIFICATION_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants : impossible de déclencher la notification distante.');
          return;
        }
        // Format par défaut pour Firebase Functions v2 (région: europe-west1)
        endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/sendChatNotification`;
        }

      await this.callSecuredEndpoint(endpoint, {
        message,
        sender,
        topic: this.chatTopic,
        timestamp: Date.now()
      });
      
      // Réinitialiser le cache d'erreur en cas de succès
      this.lastNetworkErrorTime = 0;
    } catch (error) {
      // L'erreur est loggée mais ne bloque pas l'envoi du message (déjà sauvegardé dans Firebase)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError = errorMessage.includes('réseau') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Timeout');
      
      // Logger les erreurs réseau max 1 fois par minute pour éviter le spam
      const now = Date.now();
      const shouldLog = !isNetworkError || (now - this.lastNetworkErrorTime) > this.NETWORK_ERROR_LOG_INTERVAL;
      
      if (shouldLog) {
        if (isNetworkError) {
          logger.warn(`[NotificationService] Endpoint de notification non disponible: ${errorMessage}. Les notifications push peuvent être indisponibles.`);
          this.lastNetworkErrorTime = now;
        } else {
          logger.error(`[NotificationService] Erreur lors de l'envoi de la notification de chat: ${errorMessage}`);
        }
      }
      // Ne pas propager l'erreur pour ne pas bloquer l'utilisateur
    }
  }

  private async saveTokenToFirebase(token: string) {
    try {
      const tokenKey = this.getTokenKey(token);
      const tokenRef = ref(database, `fcmTokens/${tokenKey}`);

      await set(tokenRef, {
        token,
        platform: Capacitor.getPlatform(),
        updatedAt: Date.now()
      });

    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du token:', error);
    }
  }

  private getTokenKey(token: string) {
    return token.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private showInAppNotification(notification: any) {
    if (Capacitor.isNativePlatform()) {
      this.sendLocalNotification(
        notification.title || 'Nouveau message',
        notification.body || 'Vous avez reçu un nouveau message'
      );
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'Nouveau message', {
        body: notification.body || 'Vous avez reçu un nouveau message'
      });
    }
  }

  private async subscribeToTopic(topic: string, retryCount = 0): Promise<void> {
    if (!this.fcmToken) {
      logger.warn('[NotificationService] Impossible de s\'abonner au topic: token FCM manquant');
      throw new Error('Token FCM manquant');
    }

    // Protection contre les subscriptions multiples simultanées
    if (this.isSubscribing) {
      while (this.isSubscribing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isSubscribing = true;

    // Déclarer attemptCount avant le try pour qu'il soit accessible dans le catch
    const attemptCount = this.subscriptionAttempts.get(this.fcmToken) || 0;
    
    try {
      // Vérifier si on a déjà trop de tentatives pour ce token
      if (attemptCount >= this.MAX_SUBSCRIPTION_ATTEMPTS) {
        logger.error(`[NotificationService] Nombre maximum de tentatives (${this.MAX_SUBSCRIPTION_ATTEMPTS}) atteint`);
        throw new Error(`Échec de l'abonnement après ${this.MAX_SUBSCRIPTION_ATTEMPTS} tentatives`);
      }

      // Construire l'URL de l'endpoint si elle n'est pas définie
      let endpoint = import.meta.env.VITE_FCM_SUBSCRIBE_ENDPOINT;
      if (!endpoint) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          logger.error(`[NotificationService] VITE_FCM_SUBSCRIBE_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants : abonnement au topic "${topic}" ignoré.`);
          throw new Error('Configuration Firebase manquante');
        }
        // Format par défaut pour Firebase Functions v2 (région: europe-west1)
        endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/subscribeToTopic`;
      }

      await this.callSecuredEndpoint(endpoint, {
        token: this.fcmToken,
        topic
      });
        
      // Réinitialiser le compteur de tentatives en cas de succès
      this.subscriptionAttempts.delete(this.fcmToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const newAttemptCount = attemptCount + 1;
      this.subscriptionAttempts.set(this.fcmToken, newAttemptCount);
      
      logger.warn(`[NotificationService] Erreur abonnement topic ${topic} (${newAttemptCount}/${this.MAX_SUBSCRIPTION_ATTEMPTS}):`, errorMessage);
      
      // Retry intelligent avec délais progressifs
      if (newAttemptCount < this.MAX_SUBSCRIPTION_ATTEMPTS) {
        const delay = this.SUBSCRIPTION_RETRY_DELAYS[newAttemptCount - 1] || 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.subscribeToTopic(topic, retryCount + 1);
      }
      
      throw error; // Propager l'erreur après épuisement des tentatives
    } finally {
      this.isSubscribing = false;
    }
  }

  private async callSecuredEndpoint(url: string, payload: Record<string, unknown>) {
    // Validation de l'URL
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error(`URL invalide pour l'endpoint: ${url}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const authKey = import.meta.env.VITE_FCM_ENDPOINT_AUTH_KEY;
    if (!authKey) {
      throw new Error('VITE_FCM_ENDPOINT_AUTH_KEY manquant dans les variables d\'environnement. Configurez cette variable dans votre fichier .env');
    }
    
    headers.Authorization = `Bearer ${authKey}`;

    try {
      // Timeout de 10 secondes pour éviter les blocages
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorPayload = await response.text().catch(() => 'Impossible de lire le message d\'erreur');
        throw new Error(`Erreur HTTP ${response.status} (${response.statusText}) : ${errorPayload}`);
      }
    } catch (error) {
      // Gestion spécifique des erreurs réseau
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Timeout lors de l'appel à l'endpoint ${url} (délai dépassé)`);
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`Erreur réseau : impossible de contacter l'endpoint ${url}. Vérifiez votre connexion internet.`);
        }
        // Propager les autres erreurs telles quelles
        throw error;
      }
      throw new Error(`Erreur inconnue lors de l'appel à l'endpoint: ${String(error)}`);
    }
  }

  private async initializeNativePush() {
    // 1. Permissions
    await LocalNotifications.requestPermissions();

    const permissionStatus = await PushNotifications.checkPermissions();
    if (permissionStatus.receive === 'prompt') {
      await PushNotifications.requestPermissions();
    }

    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!notificationsEnabled) {
      return;
    }

    // Vérification immédiate du cache AVANT d'attendre l'événement registration
    const cachedToken = localStorage.getItem('fcm_token');
    
    // Enregistrer les listeners EN PREMIER pour capturer TOUS les événements
    await this.registerNativeListeners();
    
    if (cachedToken) {
      // Token présent dans le cache : action préventive immédiate
      this.fcmToken = cachedToken;
      
      try {
        await this.saveTokenToFirebase(cachedToken);
        await this.subscribeToTopic(this.chatTopic);
        this.notifyServiceWorker(true);
        
        // Enregistrer quand même pour obtenir un nouveau token si nécessaire (rafraîchissement)
        await PushNotifications.register();
        return; // Succès, on s'arrête là
      } catch (error) {
        logger.error('[NotificationService] Échec de la subscription avec token en cache:', error);
        // Continuer avec la logique normale si la subscription échoue
      }
    }
    
    // Pas de token en cache ou échec de la subscription avec cache : mode normal
    await PushNotifications.register();

    // Filet de sécurité : si l'événement registration ne se déclenche pas dans les 5 secondes
    setTimeout(async () => {
      const finalCachedToken = localStorage.getItem('fcm_token');
      
      if (!this.fcmToken && finalCachedToken) {
        this.fcmToken = finalCachedToken;
        
        try {
          await this.saveTokenToFirebase(finalCachedToken);
          await this.subscribeToTopic(this.chatTopic);
          this.notifyServiceWorker(true);
        } catch (error) {
          logger.error('[NotificationService] Échec du filet de sécurité:', error);
        }
      } else if (!this.fcmToken && !finalCachedToken) {
        logger.error('[NotificationService] Aucun token disponible après timeout');
      }
    }, 5000);
  }

  private async registerNativeListeners() {
    // 1. On attend VRAIMENT que le nettoyage soit fini
    await PushNotifications.removeAllListeners();

    // 2. On attache le listener 'registration' et on attend qu'il soit prêt
    await PushNotifications.addListener('registration', async (token) => {
      try {
        this.fcmToken = token.value;
        localStorage.setItem('fcm_token', token.value);
        
        const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        
        if (notificationsEnabled) {
          try {
            // Attendre un court délai pour s'assurer que le token est valide côté Firebase
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await this.saveTokenToFirebase(token.value);
            await this.subscribeToTopic(this.chatTopic);
            this.notifyServiceWorker(true);
          } catch (error) {
            logger.error('[NotificationService] Échec de l\'abonnement:', error);
            // Le retry est géré dans subscribeToTopic avec délais progressifs
          }
        }
      } catch (error) {
        logger.error('[NotificationService] Erreur critique dans listener registration:', error);
      }
    });

    // 3. On attache les autres listeners
    await PushNotifications.addListener('registrationError', (error) => {
      logger.error('Erreur lors de l\'enregistrement FCM:', error.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.log('Notification reçue:', notification);
        const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        if (notificationsEnabled) {
          this.showInAppNotification(notification);
        }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        logger.log('Action notification:', notification);
        const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        if (!notificationsEnabled) return;
        // Navigation ici...
    });

  }

  private async initializeWebPush() {
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await Geolocation.checkPermissions();
        
        if (permissionStatus.location === 'prompt') {
          const result = await Geolocation.requestPermissions();
          return result.location === 'granted';
        }
        return permissionStatus.location === 'granted';
      } else {
        if ('geolocation' in navigator) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              { enableHighAccuracy: true }
            );
          });
        }
        return false;
      }
    } catch (error) {
      logger.error('Error requesting location permission:', error);
      return false;
    }
  }

  async checkLocationPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await Geolocation.checkPermissions();
        return permissionStatus.location === 'granted';
      } else {
        if ('geolocation' in navigator) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              { enableHighAccuracy: true }
            );
          });
        }
        return false;
      }
    } catch (error) {
      logger.error('Error checking location permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await PushNotifications.checkPermissions();
        if (permissionStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions();
          return result.receive === 'granted';
        }
        return permissionStatus.receive === 'granted';
      } else {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await PushNotifications.checkPermissions();
        return permissionStatus.receive === 'granted';
      } else {
        if ('Notification' in window) {
          return Notification.permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      logger.error('Error checking notification permission:', error);
      return false;
    }
  }

  async sendLocalNotification(title: string, body: string) {
    // Vérifier si les notifications sont activées dans les paramètres
    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!notificationsEnabled) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) }
            }
          ]
        });
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.png'
          });
        }
      }
    } catch (error) {
      logger.error('Error sending local notification:', error);
    }
  }

  /**
   * Désactive les notifications en désabonnant du topic et en supprimant le token
   */
  async disable() {
    try {
      // Essayer de récupérer le token depuis Firebase si on ne l'a pas en mémoire
      let tokenToUnsubscribe = this.fcmToken;
      if (!tokenToUnsubscribe) {
        tokenToUnsubscribe = await this.getTokenFromFirebase();
        if (tokenToUnsubscribe) {
          this.fcmToken = tokenToUnsubscribe;
        }
      }

      // Désabonner du topic chat si on a un token
      if (tokenToUnsubscribe) {
        await this.unsubscribeFromTopic(this.chatTopic, tokenToUnsubscribe);
      }

      // Supprimer le token de Firebase si on a un token
      if (tokenToUnsubscribe) {
        await this.removeTokenFromFirebase(tokenToUnsubscribe);
      }

      // Réinitialiser le token en mémoire UNIQUEMENT (garder dans localStorage pour réactivation)
      this.fcmToken = null;

      // Notifier le service worker
      this.notifyServiceWorker(false);
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la désactivation des notifications:', error);
      this.notifyServiceWorker(false);
      this.fcmToken = null;
    }
  }

  /**
   * Récupère le token FCM depuis Firebase Database
   */
  private async getTokenFromFirebase(): Promise<string | null> {
    try {
      const tokensRef = ref(database, 'fcmTokens');
      const snapshot = await get(tokensRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      const tokens = snapshot.val();
      const platform = Capacitor.getPlatform();
      
      // Chercher un token pour cette plateforme
      for (const tokenKey in tokens) {
        const tokenData = tokens[tokenKey];
        if (tokenData && tokenData.platform === platform && tokenData.token) {
          return tokenData.token;
        }
      }

      // Si aucun token pour cette plateforme, prendre le premier disponible
      const firstTokenKey = Object.keys(tokens)[0];
      if (firstTokenKey && tokens[firstTokenKey]?.token) {
        return tokens[firstTokenKey].token;
      }

      return null;
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la récupération du token depuis Firebase:', error);
      return null;
    }
  }

  /**
   * Réactive les notifications en réabonnant au topic et en réenregistrant le token
   */
  async enable() {
    try {
      this.notifyServiceWorker(true);

      // Récupérer le token existant (Mémoire ou Storage)
      let tokenToRestore = this.fcmToken || localStorage.getItem('fcm_token');

      if (tokenToRestore) {
        this.fcmToken = tokenToRestore;
        
        // Il faut remettre les écouteurs car removeAllListeners() les a tués
        if (Capacitor.isNativePlatform()) {
          this.registerNativeListeners();
        }

        await this.saveTokenToFirebase(tokenToRestore);
        await this.subscribeToTopic(this.chatTopic);
        return;
      }

      // Sinon, continuer avec la logique standard (Nouvel Enregistrement)
      if (Capacitor.isNativePlatform()) {
        this.registerNativeListeners();
        await PushNotifications.register();
      } else {
        await this.requestPermission();
      }
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la réactivation des notifications:', error);
      throw error; // Propager l'erreur pour que toggleNotifications puisse la gérer
    }
  }

  /**
   * Notifie le service worker de l'état des notifications
   */
  private notifyServiceWorker(enabled: boolean) {
    try {
      // Utiliser BroadcastChannel si disponible
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('notifications-state');
        channel.postMessage({ type: 'NOTIFICATIONS_STATE', enabled });
        channel.close();
      }

      // Aussi envoyer un message direct au service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'NOTIFICATIONS_STATE',
          enabled
        });
      }
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la notification du service worker:', error);
    }
  }

  private async unsubscribeFromTopic(topic: string, token?: string) {
    const tokenToUse = token || this.fcmToken;
    
    if (!tokenToUse) {
      logger.warn('[NotificationService] Impossible de désabonner: token FCM manquant');
      return;
    }

    try {
      let endpoint = import.meta.env.VITE_FCM_UNSUBSCRIBE_ENDPOINT;
      if (!endpoint) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          logger.error(`[NotificationService] VITE_FCM_UNSUBSCRIBE_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants : désabonnement du topic "${topic}" ignoré.`);
          return;
        }
        // Utiliser le même endpoint que subscribe mais avec une action différente
        endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/unsubscribeFromTopic`;
      }

      await this.callSecuredEndpoint(endpoint, {
        token: tokenToUse,
        topic
      });
        
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[NotificationService] Erreur lors du désabonnement du topic ${topic}:`, errorMessage);
      throw error; // Propager l'erreur pour que disable() puisse la gérer
    }
  }

  private async removeTokenFromFirebase(token: string) {
    try {
      const tokenKey = this.getTokenKey(token);
      const tokenRef = ref(database, `fcmTokens/${tokenKey}`);
      await set(tokenRef, null);
    } catch (error) {
      logger.error('Erreur lors de la suppression du token:', error);
    }
  }

  /**
   * Toggle les notifications (active/désactive)
   * Gère la persistance, les listeners et évite les race conditions
   * 
   * @param enabled - true pour activer, false pour désactiver
   * @returns Promise<boolean> - true si l'opération a réussi, false sinon
   */
  async toggleNotifications(enabled: boolean): Promise<boolean> {
    try {
      const previousState = localStorage.getItem('notifications') !== 'false';
      
      // Sauvegarder immédiatement dans localStorage
      localStorage.setItem('notifications', enabled ? 'true' : 'false');
      this.notifyServiceWorker(enabled);

      if (enabled) {
        const permissionGranted = await this.requestPermission();
        
        if (!permissionGranted) {
          localStorage.setItem('notifications', previousState ? 'true' : 'false');
          this.notifyServiceWorker(previousState);
          return false;
        }
        
        await this.enable();
        return true;
        
      } else {
        await this.disable();
        
        if (Capacitor.isNativePlatform()) {
          try {
            await PushNotifications.removeAllListeners();
          } catch (error) {
            logger.error('[NotificationService] Erreur lors du retrait des listeners:', error);
          }
        }
        
        return true;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[NotificationService] Erreur dans toggleNotifications: ${errorMessage}`);
      
      const restoredState = !enabled;
      localStorage.setItem('notifications', restoredState ? 'true' : 'false');
      this.notifyServiceWorker(restoredState);
      
      return false;
    }
  }
}

export default NotificationService; 