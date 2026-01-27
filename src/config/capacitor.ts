/**
 * @fileoverview Configuration centralisée de Capacitor
 * 
 * Ce fichier configure :
 * - StatusBar (barre d'état transparente, mode Edge-to-Edge)
 * - Keyboard (comportement overlay sur iOS)
 * - Platform class sur le body
 * - Prévention du zoom sur iOS (pinch-zoom uniquement)
 * 
 * APPROCHE CHOISIE : Fonction setupCapacitor() appelée dans main.tsx
 * 
 * Pourquoi cette approche plutôt qu'un hook React ?
 * - La configuration Capacitor doit être appliquée AVANT le rendu React
 *   pour éviter les FOUC (Flash of Unstyled Content) et les problèmes visuels
 * - C'est une configuration globale qui ne doit être exécutée qu'une seule fois
 *   au démarrage de l'application, pas à chaque montage de composant
 * - Plus simple et direct : pas besoin de la réactivité React pour cette config
 * - Meilleure performance : configuration synchrone avant le montage de React
 * 
 * Utilisation :
 * - Appelée dans main.tsx AVANT ReactDOM.render()
 * - Ne doit jamais être appelée dans un composant React
 * - Configuration appliquée une seule fois au démarrage
 * 
 * NOTE : Le blocage du scroll global iOS se fait désormais via :
 * 1. capacitor.config.ts -> ios.scrollEnabled = false (désactive le UIScrollView natif)
 * 2. CSS -> overscroll-behavior-y: none (bloque l'effet rebond CSS)
 * Plus besoin de logique JS complexe et instable.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import logger from '../services/Logger';

/**
 * Configure Capacitor au démarrage de l'application
 * 
 * IMPORTANT : Cette fonction doit être appelée AVANT ReactDOM.render() dans main.tsx
 * pour s'assurer que la configuration est appliquée dès le début et éviter les FOUC.
 * 
 * Configuration appliquée :
 * 1. Ajoute la classe de plateforme au body (ios/android/web)
 * 2. Configure le meta viewport pour iOS
 * 3. Configure StatusBar en mode Edge-to-Edge (transparent, overlay)
 * 4. Configure Keyboard en mode overlay sur iOS
 * 5. Détecte et marque les simulateurs iOS
 * 
 * @throws {Error} Log les erreurs mais ne bloque pas le démarrage de l'app
 */
export const setupCapacitor = async (): Promise<void> => {
  const platform = Capacitor.getPlatform();
  
  // 1. Ajouter la classe de la plateforme au body
  document.body.classList.add(platform);
  
  // 2. Gestion Safe Area (Viewport) - Assurez-vous que la meta tag viewport est correcte
  // interactive-widget=overlays-content : Le clavier passe par-dessus sans redimensionner le viewport (iOS 15.4+)
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content');
  }

  // --- CONFIGURATION STATUS BAR ---
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
      if (platform === 'android') {
        await StatusBar.setBackgroundColor({ color: '#00000000' });
      }
    } catch (error) {
      logger.warn('Erreur StatusBar:', error);
    }
  }
  
  // --- CONFIGURATION KEYBOARD ---
  if (platform === 'ios' && Capacitor.isNativePlatform()) {
    try {
      await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      // CRITIQUE : Désactiver le scroll natif pour éviter que la WebView ne scroll
      // Le scroll doit être géré uniquement dans les conteneurs CSS (overflow-y: auto)
      // Le scroll automatique vers l'input est géré par le plugin Keyboard via setScroll(false)
      await Keyboard.setScroll({ isDisabled: true });
      logger.log('[Keyboard] Configuration overlay appliquée sur iOS (scroll natif désactivé)');
    } catch (error) {
      logger.error('Erreur configuration Keyboard:', error);
    }
  }
  
  // --- CONFIGURATION IOS SPÉCIFIQUE SIMPLIFIÉE ---
  if (platform === 'ios') {
    const isSimulator = window.navigator.userAgent.includes('Simulator') || 
                       window.navigator.userAgent.includes('iPhone Simulator');
    if (isSimulator) {
      document.body.classList.add('ios-simulator');
    }
    
    // Le blocage JS complexe a été supprimé au profit de:
    // 1. capacitor.config.ts -> ios.scrollEnabled = false (désactive le UIScrollView natif)
    // 2. CSS -> overscroll-behavior-y: none (bloque l'effet rebond CSS)
    
    logger.log('[iOS] Configuration terminée (Scroll géré nativement via scrollEnabled: false)');
  }
};
