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
import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import logger from './Logger';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private fcmToken: string | null = null;
  private readonly chatTopic = 'chat';
  private lastNetworkErrorTime: number = 0;
  private readonly NETWORK_ERROR_LOG_INTERVAL = 60000; // Logger l'erreur réseau max 1 fois par minute

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await this.initializeNativePush();
      } else {
        await this.initializeWebPush();
        }

        await this.requestLocationPermission();
      this.isInitialized = true;
    } catch (error) {
      logger.error('Error initializing notifications:', error);
      // Ne pas bloquer l'application si l'initialisation des notifications échoue
      this.isInitialized = true;
    }
  }

  /**
   * Déclenche l'envoi d'une notification push pour un nouveau message de chat.
   * La distribution finale est gérée côté serveur (Cloud Function / API sécurisée).
   */
  async notifyChatMessage(message: string, sender: string) {
    try {
      // Confirmer à l'expéditeur localement (même si l'appel distant échoue)
      await this.sendLocalNotification(
        'Message envoyé',
        'Votre message a été envoyé avec succès'
      );

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
        logger.warn('[NotificationService] URL Cloud Function construite automatiquement:', endpoint);
        logger.warn('[NotificationService] Pour utiliser une région différente, définissez VITE_FCM_NOTIFICATION_ENDPOINT dans .env');
      }

      await this.callSecuredEndpoint(endpoint, {
        message,
        sender,
        topic: this.chatTopic,
        timestamp: Date.now()
      });
      
      // Réinitialiser le cache d'erreur en cas de succès
      this.lastNetworkErrorTime = 0;
      logger.log('[NotificationService] Notification de chat envoyée avec succès');
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

      logger.log('Token FCM enregistré dans la base:', tokenKey);
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

  private async subscribeToTopic(topic: string) {
    if (!this.fcmToken) return;

    try {
      // Construire l'URL de l'endpoint si elle n'est pas définie
      let endpoint = import.meta.env.VITE_FCM_SUBSCRIBE_ENDPOINT;
      if (!endpoint) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          logger.warn(`[NotificationService] VITE_FCM_SUBSCRIBE_ENDPOINT et VITE_FIREBASE_PROJECT_ID manquants : abonnement au topic "${topic}" ignoré.`);
          return;
        }
        // Format par défaut pour Firebase Functions v2 (région: europe-west1)
        endpoint = `https://europe-west1-${projectId}.cloudfunctions.net/subscribeToTopic`;
        logger.warn('[NotificationService] URL Cloud Function construite automatiquement:', endpoint);
      }

      await this.callSecuredEndpoint(endpoint, {
        token: this.fcmToken,
        topic
      });
        
      logger.log(`Abonné au topic ${topic}`);
    } catch (error) {
      logger.error(`Erreur lors de l'abonnement au topic ${topic}:`, error);
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
    await LocalNotifications.requestPermissions();

    const permissionStatus = await PushNotifications.checkPermissions();
    if (permissionStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      logger.log('Permission notifications push:', result.receive);
    }

    this.registerNativeListeners();
    await PushNotifications.register();
  }

  private registerNativeListeners() {
    PushNotifications.addListener('registration', async (token) => {
      try {
        this.fcmToken = token.value;
        logger.log('Token FCM reçu:', token.value);

        await this.saveTokenToFirebase(token.value);
        await this.subscribeToTopic(this.chatTopic);
      } catch (error) {
        logger.error('Erreur lors du traitement du token FCM:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      logger.error('Erreur lors de l\'enregistrement FCM:', error.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      logger.log('Notification reçue:', notification);
      this.showInAppNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      logger.log('Action sur notification:', notification);
      // TODO: implémenter une navigation vers l'écran de chat si nécessaire
    });
  }

  private async initializeWebPush() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      logger.log('Permission notifications web:', permission);
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
}

export default NotificationService; 