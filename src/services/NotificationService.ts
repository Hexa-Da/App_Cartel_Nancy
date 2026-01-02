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

      const endpoint = import.meta.env.VITE_FCM_NOTIFICATION_ENDPOINT;
      if (!endpoint) {
        logger.warn('[NotificationService] VITE_FCM_NOTIFICATION_ENDPOINT manquant : impossible de déclencher la notification distante.');
        return;
      }

      await this.callSecuredEndpoint(endpoint, {
        message,
        sender,
        topic: this.chatTopic,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification de chat:', error);
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
      const endpoint = import.meta.env.VITE_FCM_SUBSCRIBE_ENDPOINT;
      if (!endpoint) {
        logger.warn(`[NotificationService] VITE_FCM_SUBSCRIBE_ENDPOINT manquant : abonnement au topic "${topic}" ignoré.`);
        return;
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const authKey = import.meta.env.VITE_FCM_ENDPOINT_AUTH_KEY;
    if (authKey) {
      headers.Authorization = `Bearer ${authKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`Erreur HTTP ${response.status} (${response.statusText}) : ${errorPayload}`);
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