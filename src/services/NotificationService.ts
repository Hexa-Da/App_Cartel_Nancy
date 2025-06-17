import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

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
        // Initialiser les notifications locales
        const localPermission = await LocalNotifications.requestPermissions();
        
        // Vérifier les permissions sur iOS
        if (Capacitor.getPlatform() === 'ios') {
          const permissionStatus = await PushNotifications.checkPermissions();
          if (permissionStatus.receive === 'prompt') {
            await PushNotifications.requestPermissions();
          }
        }

        // Écouter les événements de notification
        PushNotifications.addListener('registration', (token) => {
          // Gérer l'enregistrement réussi
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration:', error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          // Gérer la réception de notification
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          // Gérer l'action sur la notification
        });

        // Enregistrer pour les notifications push
        await PushNotifications.register();

        // Demander la permission de géolocalisation
        await this.requestLocationPermission();
      } else {
        // Gestion des notifications web
        if ('Notification' in window) {
          await Notification.requestPermission();
        }
        // Demander la permission de géolocalisation web
        await this.requestLocationPermission();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      // Ne pas bloquer l'application si l'initialisation des notifications échoue
      this.isInitialized = true;
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
      console.error('Error requesting location permission:', error);
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
      console.error('Error checking location permission:', error);
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
      console.error('Error requesting notification permission:', error);
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
      console.error('Error checking notification permission:', error);
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
      console.error('Error sending local notification:', error);
    }
  }
}

export default NotificationService; 