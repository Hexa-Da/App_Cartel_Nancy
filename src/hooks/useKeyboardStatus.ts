/**
 * @fileoverview Hook global pour détecter l'état du clavier virtuel iOS/Android
 * 
 * Ce hook fournit :
 * - Détection fiable de l'ouverture/fermeture du clavier
 * - Hauteur du clavier si disponible
 * - Support multi-plateforme (iOS, Android, Desktop)
 * 
 * Nécessaire car :
 * - Centralise la logique de détection du clavier
 * - Permet d'activer les styles CSS conditionnels (.keyboard-open)
 * - Améliore l'UX sur mobile lors de la saisie
 */

import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface KeyboardStatus {
  isOpen: boolean;
  keyboardHeight: number;
}

/**
 * Hook pour détecter l'état du clavier virtuel
 * 
 * Priorité de détection :
 * 1. @capacitor/keyboard (si disponible et natif)
 * 2. window.visualViewport API (iOS Safari moderne)
 * 3. window.innerHeight (fallback universel)
 * 
 * @returns {KeyboardStatus} État du clavier (isOpen, keyboardHeight)
 */
export const useKeyboardStatus = (): KeyboardStatus => {
  const [status, setStatus] = useState<KeyboardStatus>({
    isOpen: false,
    keyboardHeight: 0
  });

  const initialHeightRef = useRef<number>(window.innerHeight);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialiser la hauteur de référence au montage
    if (!isInitializedRef.current) {
      initialHeightRef.current = window.innerHeight;
      isInitializedRef.current = true;
    }

    const checkKeyboardState = (): void => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeightRef.current - currentHeight;
      
      // Seuil adaptatif : 20% de la hauteur initiale ou minimum 150px
      // Cela fonctionne mieux sur iPad et différents modèles d'iPhone
      const threshold = Math.max(150, initialHeightRef.current * 0.2);
      const keyboardOpen = heightDifference > threshold;
      const keyboardHeight = keyboardOpen ? heightDifference : 0;

      setStatus({
        isOpen: keyboardOpen,
        keyboardHeight
      });
    };

    // Méthode 1 : Capacitor Keyboard Plugin (si disponible et natif)
    let keyboardPlugin: any = null;
    if (Capacitor.isNativePlatform()) {
      try {
        // Import dynamique pour éviter les erreurs si le plugin n'est pas disponible
        import('@capacitor/keyboard').then((module) => {
          keyboardPlugin = module.Keyboard;
          
          // Écouter les événements du plugin Capacitor
          keyboardPlugin.addListener('keyboardWillShow', (info: any) => {
            setStatus({
              isOpen: true,
              keyboardHeight: info.keyboardHeight || 0
            });
          });

          keyboardPlugin.addListener('keyboardWillHide', () => {
            setStatus({
              isOpen: false,
              keyboardHeight: 0
            });
          });

          keyboardPlugin.addListener('keyboardDidShow', (info: any) => {
            setStatus({
              isOpen: true,
              keyboardHeight: info.keyboardHeight || 0
            });
          });

          keyboardPlugin.addListener('keyboardDidHide', () => {
            setStatus({
              isOpen: false,
              keyboardHeight: 0
            });
          });
        }).catch(() => {
          // Plugin non disponible, continuer avec les autres méthodes
        });
      } catch (error) {
        // Ignorer les erreurs d'import
      }
    }

    // Méthode 2 : Visual Viewport API (iOS Safari 13+, Chrome moderne)
    const handleVisualViewportResize = (): void => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDifference = windowHeight - viewportHeight;
        
        // Si la différence est significative, le clavier est ouvert
        if (heightDifference > 150) {
          setStatus({
            isOpen: true,
            keyboardHeight: heightDifference
          });
        } else {
          setStatus({
            isOpen: false,
            keyboardHeight: 0
          });
        }
      } else {
        // Fallback sur checkKeyboardState si visualViewport n'est pas disponible
        checkKeyboardState();
      }
    };

    // Méthode 3 : Window resize (fallback universel)
    const handleResize = (): void => {
      // Délai pour laisser le temps au clavier de s'animer
      setTimeout(checkKeyboardState, 100);
    };

    // Méthode 4 : Focus events (déclencheurs supplémentaires)
    const handleFocusIn = (): void => {
      setTimeout(checkKeyboardState, 150);
    };

    const handleFocusOut = (): void => {
      setTimeout(() => {
        checkKeyboardState();
        // Réinitialiser la hauteur de référence après fermeture
        setTimeout(() => {
          initialHeightRef.current = window.innerHeight;
        }, 300);
      }, 100);
    };

    // Attacher les event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Vérification initiale
    checkKeyboardState();

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      
      // Nettoyer les listeners Capacitor si présents
      if (keyboardPlugin) {
        keyboardPlugin.removeAllListeners?.();
      }
    };
  }, []);

  return status;
};
