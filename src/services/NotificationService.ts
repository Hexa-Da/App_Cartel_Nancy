import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private fcmToken: string | null = null;

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
        
        // Vérifier et demander les permissions pour les notifications push
        const permissionStatus = await PushNotifications.checkPermissions();
        if (permissionStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions();
          console.log('Permission notifications push:', result.receive);
        }

        // Écouter les événements de notification
        PushNotifications.addListener('registration', async (token) => {
          console.log('Token FCM reçu:', token.value);
          this.fcmToken = token.value;
          
          // S'abonner au topic 'chat' pour recevoir les notifications de chat
          try {
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('Notification reçue:', notification);
              // Afficher une notification locale si l'app est au premier plan
              this.showInAppNotification(notification);
            });
            
            // S'abonner au topic 'chat'
            await this.subscribeToTopic('chat');
            console.log('Abonné au topic chat');
          } catch (error) {
            console.error('Erreur lors de l\'abonnement au topic:', error);
          }
          
          // Ici vous pourriez envoyer le token à votre serveur Firebase
          this.saveTokenToFirebase(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Erreur lors de l\'enregistrement FCM:', error.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Notification reçue:', notification);
          // Afficher une notification locale si l'app est au premier plan
          this.showInAppNotification(notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Action sur notification:', notification);
          // Gérer l'action sur la notification (ex: ouvrir le chat)
        });

        // Enregistrer pour les notifications push
        await PushNotifications.register();

        // Demander la permission de géolocalisation
        await this.requestLocationPermission();
      } else {
        // Gestion des notifications web
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          console.log('Permission notifications web:', permission);
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

  private async saveTokenToFirebase(token: string) {
    try {
      // Sauvegarder le token dans Firebase pour pouvoir envoyer des notifications
      // Cette fonction devrait être implémentée selon votre structure Firebase
      console.log('Token sauvegardé:', token);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }
  }

  private showInAppNotification(notification: any) {
    // Afficher une notification dans l'application si elle est au premier plan
    if (Capacitor.isNativePlatform()) {
      this.sendLocalNotification(
        notification.title || 'Nouveau message',
        notification.body || 'Vous avez reçu un nouveau message'
      );
    }
  }

  // S'abonner à un topic FCM
  private async subscribeToTopic(topic: string) {
    try {
      // Pour Capacitor, on utilise l'API FCM directement
      if (Capacitor.isNativePlatform()) {
        // S'abonner au topic via l'API FCM
        const response = await fetch(`https://iid.googleapis.com/iid/v1/${this.fcmToken}/rel/topics/${topic}`, {
          method: 'POST',
          headers: {
            'Authorization': `key=${import.meta.env.VITE_FIREBASE_SERVER_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur lors de l'abonnement au topic: ${response.status}`);
        }
        
        console.log(`Abonné au topic ${topic}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'abonnement au topic ${topic}:`, error);
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