/**
 * @fileoverview Hook pour configurer Capacitor (StatusBar, Keyboard, etc.)
 * 
 * Ce hook configure :
 * - StatusBar (barre d'état transparente, mode Edge-to-Edge)
 * - Keyboard (comportement overlay sur iOS)
 * - Platform class sur le body
 * - Prévention du zoom sur iOS
 * 
 * Nécessaire car :
 * - Encapsule la configuration Capacitor dans un hook React
 * - Permet une utilisation réactive dans les composants
 * - Centralise la configuration au lieu de la logique inline
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Hook pour configurer Capacitor au montage du composant
 * 
 * Cette fonction configure :
 * - StatusBar pour mode Edge-to-Edge (Plein écran réel)
 * - Keyboard pour comportement overlay sur iOS
 * - Platform class sur le body
 * - Prévention du zoom sur iOS
 * 
 * @param options Options de configuration (optionnel)
 */
export const useCapacitorSetup = (options?: {
  enableKeyboardListeners?: boolean;
  preventZoom?: boolean;
}): void => {
  const {
    enableKeyboardListeners = false,
    preventZoom = true
  } = options || {};

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    
    // Ajouter la classe de la plateforme au body
    document.body.classList.add(platform);
    
    // Configuration StatusBar pour mode Edge-to-Edge (Plein écran réel)
    const setupStatusBar = async (): Promise<void> => {
      if (Capacitor.isNativePlatform()) {
        try {
          // 1. Rend la barre d'état transparente (ou sombre selon le thème)
          await StatusBar.setStyle({ style: Style.Dark });
          
          // 2. CRUCIAL : Dit à l'app de passer SOUS la barre d'état
          await StatusBar.setOverlaysWebView({ overlay: true });
          
          // Configuration spécifique Android
          if (platform === 'android') {
            await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
          }
        } catch (error) {
          console.warn('Erreur StatusBar:', error);
        }
      }
    };

    // Configuration Keyboard pour iOS (comportement overlay)
    const setupKeyboard = async (): Promise<void> => {
      if (platform === 'ios' && Capacitor.isNativePlatform()) {
        try {
          // Mode overlay : le clavier passe par-dessus l'app sans redimensionner
          await Keyboard.setResizeMode({ mode: KeyboardResize.None });
          // Permet le scroll automatique vers l'input focalisé
          await Keyboard.setScroll({ isDisabled: false });
          
          console.log('[Keyboard] Configuration overlay appliquée sur iOS');
          
          // Écouter les événements pour debug (si activé)
          if (enableKeyboardListeners) {
            Keyboard.addListener('keyboardWillShow', (info) => {
              console.log('[Keyboard] Clavier va s\'ouvrir, hauteur:', info.keyboardHeight);
            });
            
            Keyboard.addListener('keyboardWillHide', () => {
              console.log('[Keyboard] Clavier va se fermer');
            });
          }
        } catch (error) {
          console.error('Erreur configuration Keyboard:', error);
        }
      }
    };

    // Détecter si on est dans un simulateur iOS
    const detectSimulator = (): void => {
      if (platform === 'ios') {
        const isSimulator = window.navigator.userAgent.includes('Simulator') || 
                           window.navigator.userAgent.includes('iPhone Simulator') ||
                           window.navigator.userAgent.includes('iPad Simulator');
        
        if (isSimulator) {
          document.body.classList.add('ios-simulator');
        }
      }
    };

    // Prévention du zoom sur iOS
    const preventZoomOnIOS = (): void => {
      if (platform === 'ios' && preventZoom) {
        // Désactiver le zoom sur iOS pour éviter les problèmes de double-tap
        const handleTouchStart = (event: TouchEvent): void => {
          // Ne pas bloquer les clics sur la barre de navigation
          if (event.target && (event.target as Element).closest('.bottom-nav')) {
            return;
          }
          if (event.touches.length > 1) {
            event.preventDefault();
          }
        };
        
        // Prévenir le zoom sur double-tap
        let lastTouchEnd = 0;
        const handleTouchEnd = (event: TouchEvent): void => {
          // Ne pas bloquer les clics sur la barre de navigation
          if (event.target && (event.target as Element).closest('.bottom-nav')) {
            return;
          }
          const now = (new Date()).getTime();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        };
        
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, false);
        
        // Cleanup
        return () => {
          document.removeEventListener('touchstart', handleTouchStart);
          document.removeEventListener('touchend', handleTouchEnd);
        };
      }
    };

    // Exécuter les configurations
    setupStatusBar();
    setupKeyboard();
    detectSimulator();
    const zoomCleanup = preventZoomOnIOS();

    // Cleanup général
    return () => {
      if (zoomCleanup) {
        zoomCleanup();
      }
      // Note: On ne supprime pas la classe platform du body car elle doit rester
      // On ne supprime pas les listeners Keyboard car ils sont globaux
    };
  }, [enableKeyboardListeners, preventZoom]);
};

