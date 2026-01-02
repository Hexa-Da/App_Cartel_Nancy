/**
 * @fileoverview Configuration centralisée de Capacitor
 * 
 * Ce fichier configure :
 * - StatusBar (barre d'état transparente, mode Edge-to-Edge)
 * - Keyboard (comportement overlay sur iOS)
 * - Platform class sur le body
 * 
 * Nécessaire car :
 * - Évite les duplications de code entre App.tsx et Layout.tsx
 * - Centralise la configuration Capacitor au démarrage de l'app
 * - Assure une configuration cohérente sur toutes les plateformes
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Configure Capacitor au démarrage de l'application
 * 
 * Cette fonction doit être appelée AVANT ReactDOM.render dans main.tsx
 * pour s'assurer que la configuration est appliquée dès le début.
 */
export const setupCapacitor = async (): Promise<void> => {
  const platform = Capacitor.getPlatform();
  
  // Ajouter la classe de la plateforme au body
  document.body.classList.add(platform);
  
  // Configuration StatusBar pour mode Edge-to-Edge (Plein écran réel)
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
  
  // Configuration Keyboard pour iOS (comportement overlay)
  if (platform === 'ios' && Capacitor.isNativePlatform()) {
    try {
      // Mode overlay : le clavier passe par-dessus l'app sans redimensionner
      await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      // Permet le scroll automatique vers l'input focalisé
      await Keyboard.setScroll({ isDisabled: false });
      
      console.log('[Keyboard] Configuration overlay appliquée sur iOS');
      
      // Écouter les événements pour debug
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('[Keyboard] Clavier va s\'ouvrir, hauteur:', info.keyboardHeight);
      });
      
      Keyboard.addListener('keyboardWillHide', () => {
        console.log('[Keyboard] Clavier va se fermer');
      });
    } catch (error) {
      console.error('Erreur configuration Keyboard:', error);
    }
  }
  
  // Détecter si on est dans un simulateur iOS
  if (platform === 'ios') {
    const isSimulator = window.navigator.userAgent.includes('Simulator') || 
                       window.navigator.userAgent.includes('iPhone Simulator') ||
                       window.navigator.userAgent.includes('iPad Simulator');
    
    if (isSimulator) {
      document.body.classList.add('ios-simulator');
    }
    
    // Désactiver le zoom sur iOS pour éviter les problèmes de double-tap
    document.addEventListener('touchstart', function(event) {
      // Ne pas bloquer les clics sur la barre de navigation
      if (event.target && (event.target as Element).closest('.bottom-nav')) {
        return;
      }
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
    
    // Prévenir le zoom sur double-tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      // Ne pas bloquer les clics sur la barre de navigation
      if (event.target && (event.target as Element).closest('.bottom-nav')) {
        return;
      }
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
};

