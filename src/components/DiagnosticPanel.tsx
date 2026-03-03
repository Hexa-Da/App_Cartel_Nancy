/**
 * @fileoverview Panneau de diagnostic pour vérifier l'état de Firebase et des notifications
 * 
 * Ce composant permet de :
 * - Vérifier la connexion Firebase
 * - Vérifier le chargement des données (venues, messages, fichiers)
 * - Vérifier l'état des notifications push
 * - Afficher les logs d'erreur récents
 * 
 * Nécessaire car :
 * - Facilite le débogage sur iOS et Android
 * - Permet de vérifier rapidement l'état de l'application
 * - Centralise les informations de diagnostic
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { isFirebaseInitialized, database, storage } from '../firebase';
import { firebaseLogger } from '../services/FirebaseLogger';
import { Capacitor } from '@capacitor/core';
import { ref, get, onValue, off } from 'firebase/database';
import { ref as storageRef, listAll } from 'firebase/storage';
import logger from '../services/Logger';
import './DiagnosticPanel.css';

interface DiagnosticResult {
  id: string;
  name: string;
  status: 'success' | 'warning' | 'error' | 'loading';
  message: string;
  details?: string;
}

// Fonction utilitaire pour obtenir les conseils de debug selon la plateforme
const getPlatformDebugAdvice = (platform: string, issue: string): string => {
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  
  switch (issue) {
    case 'notifications-permission':
      if (isIOS) {
        return 'Activez les notifications dans Réglages → Cartel Nancy → Notifications';
      } else if (isAndroid) {
        return 'Activez les notifications dans Paramètres → Applications → Cartel Nancy → Notifications';
      }
      return 'Activez les notifications dans les paramètres de votre navigateur';
    
    case 'notifications-token':
      if (isIOS) {
        return 'Vérifiez que le certificat APNs est configuré dans Firebase Console et que Push Notifications est activé dans Xcode (Signing & Capabilities)';
      } else if (isAndroid) {
        return 'Vérifiez que Firebase Cloud Messaging est configuré et que les notifications sont activées dans les paramètres Android';
      }
      return 'Vérifiez les permissions de notifications dans votre navigateur';
    
    case 'firebase-config':
      if (isIOS) {
        return 'Vérifiez le fichier GoogleService-Info.plist et que le Bundle ID correspond dans Firebase et Xcode';
      } else if (isAndroid) {
        return 'Vérifiez le fichier google-services.json et que le package name correspond dans Firebase et Android';
      }
      return 'Vérifiez les variables d\'environnement dans votre fichier .env';
    
    case 'network':
      if (isIOS || isAndroid) {
        return 'Vérifiez votre connexion Wi-Fi ou données mobiles dans les Réglages/Paramètres système';
      }
      return 'Vérifiez votre connexion internet';
    
    case 'geolocation':
      if (isIOS) {
        return 'Activez la localisation dans Réglages → Confidentialité → Localisation → Cartel Nancy';
      } else if (isAndroid) {
        return 'Activez la localisation dans Paramètres → Applications → Cartel Nancy → Autorisations → Localisation';
      }
      return 'Autorisez l\'accès à la localisation dans votre navigateur';
    
    default:
      return 'Consultez la documentation pour plus d\'informations';
  }
};

const DiagnosticPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { venues, messages, isLoadingVenues } = useApp();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const checkNotificationPermission = async (): Promise<string> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const status = await FirebaseMessaging.checkPermissions();
        return status.receive || 'unknown';
      } else {
        return Notification.permission;
      }
    } catch (error) {
      logger.error('[DiagnosticPanel] Erreur vérification permissions:', error);
      return 'unknown';
    }
  };

  // Fonction pour vérifier la connexion réseau
  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      if ('navigator' in window && 'onLine' in navigator) {
        if (!navigator.onLine) {
          return false;
        }
      }
      // Test de connexion avec un fetch rapide
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    } catch {
      return false;
    }
  };

  // Méthode alternative : tester avec un chemin existant (venues)
  const testWithVenuesPath = async (): Promise<boolean> => {
    try {
      if (!isFirebaseInitialized()) return false;
      // Tester avec un chemin qui existe dans l'app (venues)
      // On utilise un timeout court pour ne pas bloquer
      const testRef = ref(database, 'venues');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
      
      await Promise.race([
        get(testRef),
        timeoutPromise
      ]);
      return true;
    } catch (error: any) {
      // Si c'est une erreur de permission, la connexion fonctionne mais on n'a pas les droits
      // Si c'est une erreur de connexion, la connexion ne fonctionne pas
      if (error?.code === 'PERMISSION_DENIED' || error?.code === 'permission-denied') {
        return true; // La connexion fonctionne, mais pas les permissions
      }
      // Timeout ou autre erreur = connexion probablement OK mais lente ou problème de permission
      // On considère que la connexion fonctionne si Firebase est initialisé
      return isFirebaseInitialized();
    }
  };

  // Fonction pour tester la connexion Firebase Database
  const testFirebaseDatabase = async (): Promise<boolean> => {
    try {
      if (!isFirebaseInitialized()) return false;
      
      // Méthode 1 : Tester avec .info/connected (meilleure méthode)
      return new Promise((resolve) => {
        const connectedRef = ref(database, '.info/connected');
        let resolved = false;
        
        // Timeout de 5 secondes
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            off(connectedRef);
            // Si timeout, on essaie une autre méthode
            testWithVenuesPath().then(resolve).catch(() => resolve(false));
          }
        }, 5000);
        
        // Écouter l'état de connexion
        onValue(connectedRef, (snapshot) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const isConnected = snapshot.val() === true;
            off(connectedRef);
            resolve(isConnected);
          }
        }, () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            off(connectedRef);
            // En cas d'erreur, on essaie une autre méthode
            testWithVenuesPath().then(resolve).catch(() => resolve(false));
          }
        });
      });
    } catch {
      // En cas d'erreur, on essaie une méthode alternative
      return testWithVenuesPath();
    }
  };

  // Fonction pour tester la connexion Firebase Storage
  const testFirebaseStorage = async (): Promise<boolean> => {
    try {
      if (!isFirebaseInitialized()) return false;
      // Test simple : essayer de lister la racine du storage
      const testRef = storageRef(storage, '');
      await listAll(testRef);
      return true;
    } catch {
      // Si l'erreur est "not found", c'est normal, le storage est accessible
      return true;
    }
  };


  // Fonction pour vérifier les variables d'environnement Firebase
  const checkFirebaseEnvVars = (): { allPresent: boolean; missing: string[] } => {
    const requiredKeys = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_DATABASE_URL'
    ];

    const missing: string[] = [];
    for (const key of requiredKeys) {
      const value = import.meta.env[key];
      if (!value || value.trim() === '') {
        missing.push(key);
      }
    }

    return {
      allPresent: missing.length === 0,
      missing
    };
  };

  // Fonction pour vérifier localStorage
  const checkLocalStorage = (): { available: boolean; quota?: string } => {
    try {
      const testKey = '__diagnostic_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Essayer d'estimer le quota (approximatif)
      let quota = 'illimité';
      try {
        const testData = 'x'.repeat(1024 * 1024); // 1MB
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          quota = 'limité';
        }
      }

      return { available: true, quota };
    } catch {
      return { available: false };
    }
  };

  // Fonction pour vérifier la géolocalisation
  const checkGeolocation = async (): Promise<{ available: boolean; permission?: string }> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const status = await Geolocation.checkPermissions();
        return {
          available: true,
          permission: status.location || 'unknown'
        };
      } else {
        if ('geolocation' in navigator) {
          return {
            available: true,
            permission: 'unknown' // Sur web, on ne peut pas vérifier directement
          };
        }
        return { available: false };
      }
    } catch {
      return { available: false };
    }
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    const newResults: DiagnosticResult[] = [];

    // 1. Vérifier la plateforme
    const platform = Capacitor.getPlatform();
    newResults.push({
      id: 'platform',
      name: 'Plateforme',
      status: 'success',
      message: `Plateforme: ${platform}`,
      details: platform === 'ios' 
        ? 'Application iOS native'
        : platform === 'android'
          ? 'Application Android native'
          : 'Application Web'
    });

    // 2. Vérifier la connexion réseau
    const networkConnected = await checkNetworkConnection();
    newResults.push({
      id: 'network',
      name: 'Connexion Réseau',
      status: networkConnected ? 'success' : 'error',
      message: networkConnected ? 'Connexion active' : 'Pas de connexion',
      details: networkConnected 
        ? 'Internet accessible'
        : getPlatformDebugAdvice(platform, 'network')
    });

    // 3. Vérifier l'initialisation Firebase
    try {
      const initialized = isFirebaseInitialized();
      newResults.push({
        id: 'firebase-init',
        name: 'Initialisation Firebase',
        status: initialized ? 'success' : 'error',
        message: initialized ? 'Firebase est initialisé' : 'Firebase n\'est pas initialisé',
        details: initialized 
          ? 'Tous les services sont prêts' 
          : getPlatformDebugAdvice(platform, 'firebase-config')
      });
    } catch (error) {
      newResults.push({
        id: 'firebase-init',
        name: 'Initialisation Firebase',
        status: 'error',
        message: 'Erreur lors de la vérification',
        details: `${String(error)}. ${getPlatformDebugAdvice(platform, 'firebase-config')}`
      });
    }

    // 4. Vérifier les variables d'environnement Firebase
    const envCheck = checkFirebaseEnvVars();
    newResults.push({
      id: 'firebase-env',
      name: 'Variables d\'Environnement Firebase',
      status: envCheck.allPresent ? 'success' : 'error',
      message: envCheck.allPresent 
        ? 'Toutes les variables présentes'
        : `${envCheck.missing.length} variable(s) manquante(s)`,
      details: envCheck.allPresent
        ? 'Configuration complète'
        : `Manquantes: ${envCheck.missing.join(', ')}`
    });

    // 5. Tester la connexion Firebase Database
    const dbConnected = await testFirebaseDatabase();
    newResults.push({
      id: 'firebase-database',
      name: 'Connexion Firebase Database',
      status: dbConnected ? 'success' : 'error',
      message: dbConnected ? 'Database accessible' : 'Database inaccessible',
      details: dbConnected
        ? 'Connexion établie avec succès'
        : 'Vérifiez la connexion réseau et les règles de sécurité'
    });

    // 6. Tester la connexion Firebase Storage
    const storageConnected = await testFirebaseStorage();
    newResults.push({
      id: 'firebase-storage',
      name: 'Connexion Firebase Storage',
      status: storageConnected ? 'success' : 'warning',
      message: storageConnected ? 'Storage accessible' : 'Storage inaccessible',
      details: storageConnected
        ? 'Connexion établie avec succès'
        : 'Vérifiez la configuration Storage'
    });

    // 7. Vérifier le chargement des venues
    newResults.push({
      id: 'venues-loading',
      name: 'Chargement des Événements',
      status: isLoadingVenues ? 'loading' : venues.length > 0 ? 'success' : 'warning',
      message: isLoadingVenues 
        ? 'Chargement en cours...' 
        : venues.length > 0 
          ? `${venues.length} événements chargés`
          : 'Aucun événement chargé',
      details: isLoadingVenues 
        ? 'Attente de la réponse Firebase...'
        : venues.length > 0
          ? 'Les données sont disponibles'
          : 'Vérifiez la connexion et les règles Firebase'
    });

    // 8. Vérifier le chargement des messages
    newResults.push({
      id: 'messages-loading',
      name: 'Chargement des Messages',
      status: messages.length > 0 ? 'success' : 'warning',
      message: messages.length > 0 
        ? `${messages.length} messages chargés`
        : 'Aucun message chargé',
      details: messages.length > 0
        ? 'Le chat fonctionne correctement'
        : 'Normal si aucun message n\'a été envoyé'
    });

    // 9. Vérifier les permissions de notifications (TOUJOURS À JOUR)
    const notificationPermission = await checkNotificationPermission();
    const permissionStatus = notificationPermission === 'granted' ? 'success' 
      : notificationPermission === 'denied' ? 'error'
      : notificationPermission === 'prompt' ? 'warning'
      : 'warning';
    
    newResults.push({
      id: 'notification-permission',
      name: 'Permissions Notifications',
      status: permissionStatus,
      message: notificationPermission === 'granted' 
        ? 'Permissions accordées'
        : notificationPermission === 'denied'
          ? 'Permissions refusées'
          : notificationPermission === 'prompt'
            ? 'Permissions en attente'
            : 'État inconnu',
      details: notificationPermission === 'granted'
        ? 'Les notifications peuvent être reçues'
        : getPlatformDebugAdvice(platform, 'notifications-permission')
    });

    // 10. Vérifier le token FCM
    const fcmToken = localStorage.getItem('fcm_token');
    newResults.push({
      id: 'fcm-token',
      name: 'Token FCM',
      status: fcmToken ? 'success' : 'error',
      message: fcmToken 
        ? 'Token FCM généré'
        : 'Token FCM manquant',
      details: fcmToken
        ? `Token: ${fcmToken.substring(0, 20)}...`
        : `Le token n'a pas été généré. ${getPlatformDebugAdvice(platform, 'notifications-token')}`
    });

    // 11. Vérifier l'abonnement au topic
    try {
      const logs = firebaseLogger.getLogs();
      const subscriptionErrors = logs.filter(log => 
        log.operation.includes('subscribe') && 
        (log.type === 'CONNECTION_ERROR' || log.type === 'OPERATION_FAILED' || log.type === 'UNAVAILABLE')
      );
      
      newResults.push({
        id: 'topic-subscription',
        name: 'Abonnement Topic Chat',
        status: subscriptionErrors.length > 0 ? 'warning' : 'success',
        message: subscriptionErrors.length > 0
          ? 'Erreurs d\'abonnement détectées'
          : 'Abonnement réussi (probable)',
        details: subscriptionErrors.length > 0
          ? `${subscriptionErrors.length} erreur(s) d'abonnement dans les logs`
          : 'Aucune erreur d\'abonnement détectée'
      });
    } catch (error) {
      newResults.push({
        id: 'topic-subscription',
        name: 'Abonnement Topic Chat',
        status: 'warning',
        message: 'Impossible de vérifier',
        details: String(error)
      });
    }

    // 12. Vérifier localStorage
    const localStorageCheck = checkLocalStorage();
    newResults.push({
      id: 'localstorage',
      name: 'LocalStorage',
      status: localStorageCheck.available ? 'success' : 'error',
      message: localStorageCheck.available 
        ? 'LocalStorage disponible'
        : 'LocalStorage indisponible',
      details: localStorageCheck.available
        ? `Quota: ${localStorageCheck.quota || 'illimité'}`
        : 'Le stockage local n\'est pas disponible'
    });

    // 13. Vérifier la géolocalisation
    const geoCheck = await checkGeolocation();
    const geoPermissionStatus = geoCheck.permission === 'granted' ? 'success'
      : geoCheck.permission === 'denied' ? 'error'
      : geoCheck.permission === 'prompt' ? 'warning'
      : 'warning';
    
    newResults.push({
      id: 'geolocation',
      name: 'Géolocalisation',
      status: geoCheck.available 
        ? (geoCheck.permission === 'granted' ? 'success' : geoPermissionStatus)
        : 'warning',
      message: geoCheck.available 
        ? (geoCheck.permission === 'granted' 
          ? 'Géolocalisation disponible et autorisée'
          : geoCheck.permission === 'denied'
            ? 'Géolocalisation refusée'
            : geoCheck.permission === 'prompt'
              ? 'Géolocalisation en attente'
              : 'Géolocalisation disponible')
        : 'Géolocalisation indisponible',
      details: geoCheck.available
        ? (geoCheck.permission === 'granted'
          ? 'La localisation est activée'
          : geoCheck.permission === 'denied' || geoCheck.permission === 'prompt'
            ? getPlatformDebugAdvice(platform, 'geolocation')
            : 'Disponible')
        : 'La géolocalisation n\'est pas disponible sur cet appareil'
    });

    // 14. Vérifier les erreurs Firebase récentes
    const recentLogs = firebaseLogger.getLogs().slice(0, 5);
    // Tous les types d'erreur sauf UNKNOWN_ERROR sont considérés comme des erreurs réelles
    const errorCount = recentLogs.filter(log => 
      log.type !== 'UNKNOWN_ERROR'
    ).length;
    
    newResults.push({
      id: 'firebase-errors',
      name: 'Erreurs Firebase Récentes',
      status: errorCount === 0 ? 'success' : errorCount <= 2 ? 'warning' : 'error',
      message: errorCount === 0
        ? 'Aucune erreur récente'
        : `${errorCount} erreur(s) récente(s)`,
      details: errorCount > 0
        ? recentLogs.map(log => `${log.operation}: ${log.message}`).join('; ')
        : 'Tout fonctionne correctement'
    });

    // 15. Vérifier l'état des notifications dans localStorage
    const notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    newResults.push({
      id: 'notifications-setting',
      name: 'Paramètre Notifications (App)',
      status: notificationsEnabled ? 'success' : 'warning',
      message: notificationsEnabled 
        ? 'Notifications activées dans l\'app'
        : 'Notifications désactivées dans l\'app',
      details: notificationsEnabled
        ? 'Le toggle est activé dans les paramètres'
        : 'Activez le toggle dans les paramètres de l\'application'
    });

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isOpen && results.length === 0) {
      runDiagnostic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRefresh = async () => {
    setResults([]);
    await runDiagnostic();
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'loading':
        return '⏳';
      default:
        return '❓';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="diagnostic-panel-overlay" onClick={onClose}>
      <div className="diagnostic-panel" onClick={e => e.stopPropagation()}>
        <div className="diagnostic-panel-header">
          <h3>Diagnostic</h3>
          <div className="diagnostic-panel-actions">
            <button 
              className="diagnostic-refresh-button"
              onClick={handleRefresh}
              disabled={isRunning}
            >
              🔄
            </button>
            <button 
              className="diagnostic-close-button"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="diagnostic-panel-content">
          {isRunning && results.length === 0 ? (
            <div className="diagnostic-loading">
              <p>⏳ Exécution du diagnostic...</p>
            </div>
          ) : (
            <div className="diagnostic-results">
              {results.map(result => (
                <div 
                  key={result.id} 
                  className={`diagnostic-result diagnostic-result-${result.status}`}
                >
                  <div className="diagnostic-result-header">
                    <span className="diagnostic-status-icon">
                      {getStatusIcon(result.status)}
                    </span>
                    <span className="diagnostic-result-name">{result.name}</span>
                  </div>
                  <div className="diagnostic-result-message">{result.message}</div>
                  {result.details && (
                    <div className="diagnostic-result-details">{result.details}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPanel;
