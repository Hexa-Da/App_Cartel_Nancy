/**
 * @fileoverview Service centralisé pour la gestion des notifications et permissions
 * 
 * Ce service gère toutes les notifications avec :
 * - Notifications push natives (Android/iOS) via @capacitor-firebase/messaging
 * - Notifications locales pour les événements in-app
 * - Gestion des permissions (notifications, géolocalisation)
 * - Abonnement aux topics FCM pour le chat (natif via Firebase SDK)
 * - Pattern Singleton pour une instance unique
 */

import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import logger from './Logger';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private isInitializing = false;
  private fcmToken: string | null = null;
  private readonly chatTopic = 'chat';
  private lastNetworkErrorTime: number = 0;
  private readonly NETWORK_ERROR_LOG_INTERVAL = 60000;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(forceReinit = false) {
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
      const isFirstLaunch = localStorage.getItem('notifications') === null;
      if (isFirstLaunch) {
        localStorage.setItem('notifications', 'true');
      }

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
   */
  async notifyChatMessage(message: string, sender: string) {
    try {
      const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      if (notificationsEnabled) {
        await this.sendLocalNotification(
          'Message envoyé',
          'Votre message a été envoyé avec succès'
        );
      }

      let endpoint = import.meta.env.VITE_FCM_NOTIFICATION_ENDPOINT;
      if (!endpoint) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          logger.warn('[NotificationService] VITE_FCM_NOTIFICATION_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants : impossible de déclencher la notification distante.');
          return;
        }
        endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/sendChatNotification`;
      }

      await this.callSecuredEndpoint(endpoint, {
        message,
        sender,
        topic: this.chatTopic,
        timestamp: Date.now()
      });

      this.lastNetworkErrorTime = 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError = errorMessage.includes('réseau') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Timeout');

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

  private showInAppNotification(notification: { title?: string; body?: string }) {
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

  /**
   * Abonnement natif au topic via Firebase SDK (plus besoin de Cloud Function)
   */
  private async subscribeToTopicNative(topic: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await FirebaseMessaging.subscribeToTopic({ topic });
      logger.log(`[NotificationService] Abonné au topic "${topic}" via Firebase SDK natif`);
    } else {
      await this.subscribeToTopicViaEndpoint(topic);
    }
  }

  /**
   * Désabonnement natif du topic via Firebase SDK
   */
  private async unsubscribeFromTopicNative(topic: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await FirebaseMessaging.unsubscribeFromTopic({ topic });
      logger.log(`[NotificationService] Désabonné du topic "${topic}" via Firebase SDK natif`);
    } else {
      await this.unsubscribeFromTopicViaEndpoint(topic);
    }
  }

  /**
   * Fallback web : abonnement via Cloud Function
   */
  private async subscribeToTopicViaEndpoint(topic: string): Promise<void> {
    if (!this.fcmToken) {
      throw new Error('Token FCM manquant');
    }

    let endpoint = import.meta.env.VITE_FCM_SUBSCRIBE_ENDPOINT;
    if (!endpoint) {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) {
        logger.error(`[NotificationService] VITE_FCM_SUBSCRIBE_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants`);
        throw new Error('Configuration Firebase manquante');
      }
      endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/subscribeToTopic`;
    }

    await this.callSecuredEndpoint(endpoint, { token: this.fcmToken, topic });
  }

  /**
   * Fallback web : désabonnement via Cloud Function
   */
  private async unsubscribeFromTopicViaEndpoint(topic: string): Promise<void> {
    const tokenToUse = this.fcmToken;
    if (!tokenToUse) {
      logger.warn('[NotificationService] Impossible de désabonner: token FCM manquant');
      return;
    }

    let endpoint = import.meta.env.VITE_FCM_UNSUBSCRIBE_ENDPOINT;
    if (!endpoint) {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      if (!projectId) {
        logger.error(`[NotificationService] VITE_FCM_UNSUBSCRIBE_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants`);
        return;
      }
      endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/unsubscribeFromTopic`;
    }

    await this.callSecuredEndpoint(endpoint, { token: tokenToUse, topic });
  }

  private async callSecuredEndpoint(url: string, payload: Record<string, unknown>) {
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
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Timeout lors de l'appel à l'endpoint ${url} (délai dépassé)`);
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`Erreur réseau : impossible de contacter l'endpoint ${url}. Vérifiez votre connexion internet.`);
        }
        throw error;
      }
      throw new Error(`Erreur inconnue lors de l'appel à l'endpoint: ${String(error)}`);
    }
  }

  private async initializeNativePush() {
    const platform = Capacitor.getPlatform();
    logger.log(`[NotificationService] Initialisation des notifications natives (${platform})`);

    await LocalNotifications.requestPermissions();

    const permissionStatus = await FirebaseMessaging.checkPermissions();
    logger.log(`[NotificationService] État des permissions (${platform}):`, permissionStatus);

    if (permissionStatus.receive === 'prompt') {
      const result = await FirebaseMessaging.requestPermissions();
      logger.log(`[NotificationService] Résultat de la demande de permission (${platform}):`, result);
    }

    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!notificationsEnabled) {
      return;
    }

    await this.registerNativeListeners();

    try {
      const { token } = await FirebaseMessaging.getToken();
      logger.log(`[NotificationService] Token FCM obtenu (${platform}):`, token.substring(0, 20) + '...');

      this.fcmToken = token;
      localStorage.setItem('fcm_token', token);

      await this.saveTokenToFirebase(token);
      await this.subscribeToTopicNative(this.chatTopic);
      this.notifyServiceWorker(true);

      logger.log(`[NotificationService] Notifications activées avec succès (${platform})`);
    } catch (error) {
      logger.error(`[NotificationService] Erreur lors de l'obtention du token FCM (${platform}):`, error);

      const cachedToken = localStorage.getItem('fcm_token');
      if (cachedToken) {
        logger.log('[NotificationService] Utilisation du token en cache');
        this.fcmToken = cachedToken;
        try {
          await this.saveTokenToFirebase(cachedToken);
          await this.subscribeToTopicNative(this.chatTopic);
          this.notifyServiceWorker(true);
        } catch (cacheError) {
          logger.error('[NotificationService] Échec avec le token en cache:', cacheError);
        }
      }
    }
  }

  private async registerNativeListeners() {
    await FirebaseMessaging.removeAllListeners();

    await FirebaseMessaging.addListener('tokenReceived', async (event) => {
      try {
        const platform = Capacitor.getPlatform();
        logger.log(`[NotificationService] Nouveau token FCM reçu (${platform}):`, event.token.substring(0, 20) + '...');

        this.fcmToken = event.token;
        localStorage.setItem('fcm_token', event.token);

        const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
        if (notificationsEnabled) {
          await this.saveTokenToFirebase(event.token);
        }
      } catch (error) {
        logger.error('[NotificationService] Erreur dans listener tokenReceived:', error);
      }
    });

    await FirebaseMessaging.addListener('notificationReceived', (event) => {
      logger.log('Notification reçue:', event.notification);
      const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      if (notificationsEnabled) {
        this.showInAppNotification(event.notification);
      }
    });

    await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      logger.log('Action notification:', event);
      const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
      if (!notificationsEnabled) return;
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
        const permissionStatus = await FirebaseMessaging.checkPermissions();
        if (permissionStatus.receive === 'prompt') {
          const result = await FirebaseMessaging.requestPermissions();
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
        const permissionStatus = await FirebaseMessaging.checkPermissions();
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

  async disable() {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await this.unsubscribeFromTopicNative(this.chatTopic);
        } catch (error) {
          logger.error('[NotificationService] Erreur désabonnement topic:', error);
        }
      }

      if (this.fcmToken) {
        await this.removeTokenFromFirebase(this.fcmToken);
      }

      this.fcmToken = null;
      this.notifyServiceWorker(false);
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la désactivation des notifications:', error);
      this.notifyServiceWorker(false);
      this.fcmToken = null;
    }
  }

  async enable() {
    try {
      this.notifyServiceWorker(true);

      let tokenToRestore = this.fcmToken || localStorage.getItem('fcm_token');

      if (tokenToRestore) {
        this.fcmToken = tokenToRestore;

        if (Capacitor.isNativePlatform()) {
          await this.registerNativeListeners();
        }

        await this.saveTokenToFirebase(tokenToRestore);
        await this.subscribeToTopicNative(this.chatTopic);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        await this.registerNativeListeners();
        const { token } = await FirebaseMessaging.getToken();
        this.fcmToken = token;
        localStorage.setItem('fcm_token', token);
        await this.saveTokenToFirebase(token);
        await this.subscribeToTopicNative(this.chatTopic);
      } else {
        await this.requestPermission();
      }
    } catch (error) {
      logger.error('[NotificationService] Erreur lors de la réactivation des notifications:', error);
      throw error;
    }
  }

  private notifyServiceWorker(enabled: boolean) {
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('notifications-state');
        channel.postMessage({ type: 'NOTIFICATIONS_STATE', enabled });
        channel.close();
      }

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
   */
  async toggleNotifications(enabled: boolean): Promise<boolean> {
    try {
      const previousState = localStorage.getItem('notifications') !== 'false';

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
            await FirebaseMessaging.removeAllListeners();
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
