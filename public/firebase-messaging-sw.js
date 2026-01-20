// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration Firebase (remplacez par vos propres clés)
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  vapidKey: env.VITE_FIREBASE_VAPID_KEY
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Initialiser Firebase Cloud Messaging
const messaging = firebase.messaging();

// État des notifications (par défaut activé)
// Essayer de récupérer l'état depuis localStorage via IndexedDB ou utiliser la valeur par défaut
let notificationsEnabled = true;

// Fonction pour synchroniser l'état au démarrage
const syncNotificationState = () => {
  // Essayer de récupérer l'état depuis le client via postMessage
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'GET_NOTIFICATIONS_STATE'
    });
  }
};

// Utiliser BroadcastChannel pour synchroniser l'état avec le client
let notificationChannel = null;
try {
  notificationChannel = new BroadcastChannel('notifications-state');
  notificationChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'NOTIFICATIONS_STATE') {
      notificationsEnabled = event.data.enabled !== false;
      console.log('[SW] État des notifications mis à jour via BroadcastChannel:', notificationsEnabled);
    }
  };
} catch (error) {
  console.warn('[SW] BroadcastChannel non supporté, utilisation de la valeur par défaut');
}

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIFICATIONS_STATE') {
    notificationsEnabled = event.data.enabled !== false;
    console.log('[SW] État des notifications mis à jour via message:', notificationsEnabled);
  }
  
  // Répondre aux demandes d'état
  if (event.data && event.data.type === 'GET_NOTIFICATIONS_STATE') {
    // L'état par défaut est true, mais on devrait idéalement le récupérer depuis le client
    notificationsEnabled = true;
  }
});

// Synchroniser l'état au démarrage du service worker
syncNotificationState();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Message reçu en arrière-plan:', payload);

  // Vérifier si les notifications sont activées
  if (!notificationsEnabled) {
    console.log('Notification ignorée car les notifications sont désactivées');
    return;
  }

  const notificationTitle = payload.notification.title || 'Nouveau message';
  const notificationOptions = {
    body: payload.notification.body || 'Vous avez reçu un nouveau message',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: 'chat-message',
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification cliquée:', event);
  
  event.notification.close();
  
  // Ouvrir l'application ou une page spécifique
  event.waitUntil(
    clients.openWindow('/')
  );
});
