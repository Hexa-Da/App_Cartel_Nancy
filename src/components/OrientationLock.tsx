/**
 * @fileoverview Composant pour verrouiller l'orientation de l'écran en mode portrait
 * 
 * Ce composant :
 * - Verrouille l'écran en mode portrait au démarrage de l'application
 * - Fonctionne sur les plateformes natives (iOS/Android) et web
 * - Gère les erreurs silencieusement si le verrouillage n'est pas supporté
 * 
 * Nécessaire car :
 * - Évite les problèmes d'affichage en mode paysage
 * - Améliore l'expérience utilisateur sur mobile
 * - Centralise la logique de verrouillage d'orientation
 */

import { useEffect } from 'react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import logger from '../services/Logger';

/**
 * Composant qui verrouille l'orientation de l'écran en mode portrait
 * S'exécute une seule fois au montage du composant
 */
export default function OrientationLock() {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        // Verrouiller en mode portrait
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } catch (error) {
        // Le verrouillage d'orientation n'est pas supporté sur ce device ou navigateur
        // On ignore l'erreur silencieusement
        if (Capacitor.isNativePlatform()) {
          logger.warn("Le verrouillage d'orientation n'est pas supporté sur ce device");
        }
      }
    };

    lockOrientation();
  }, []);

  // Ce composant ne rend rien
  return null;
}
