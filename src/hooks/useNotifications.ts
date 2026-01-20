/**
 * @fileoverview Hook pour initialiser le service de notifications au démarrage de l'app
 * 
 * Ce hook gère :
 * - L'initialisation du NotificationService au démarrage
 * - La protection contre les appels multiples simultanés
 * - Le nettoyage en cas de démontage du composant
 * 
 * Nécessaire car :
 * - Sépare la logique d'initialisation des notifications de la géolocalisation
 * - Centralise l'initialisation au niveau du Layout (composant racine)
 * - Respecte le principe de responsabilité unique
 */

import { useEffect } from 'react';
import NotificationService from '../services/NotificationService';
import logger from '../services/Logger';

/**
 * Hook pour initialiser le service de notifications
 * Doit être appelé au niveau du Layout ou d'un composant racine
 */
export const useNotifications = () => {
  useEffect(() => {
    let isMounted = true;
    let initPromise: Promise<void> | null = null;
    
    const initNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        initPromise = notificationService.initialize();
        await initPromise;
        
        if (!isMounted) return;
      } catch (error) {
        if (!isMounted) return;
        logger.error('[useNotifications] Erreur lors de l\'initialisation des notifications:', error);
      }
    };
    
    initNotifications();
    
    return () => {
      isMounted = false;
    };
  }, []);
};
