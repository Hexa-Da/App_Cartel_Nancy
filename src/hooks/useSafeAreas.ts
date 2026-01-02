/**
 * @fileoverview Hook pour calculer dynamiquement les safe areas (encoches iOS/Android)
 * 
 * Ce hook fournit :
 * - Calcul dynamique des safe areas via CSS env() ou JavaScript
 * - Valeurs réactives qui se mettent à jour lors des changements
 * - Support multi-plateforme (iOS, Android, Web)
 * 
 * Nécessaire car :
 * - Centralise la logique de calcul des safe areas
 * - Permet d'utiliser les valeurs dans les composants React
 * - Évite la duplication de code inline
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreas {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Hook pour calculer dynamiquement les safe areas
 * 
 * Méthode de calcul :
 * 1. Utilise getComputedStyle pour lire les valeurs CSS env(safe-area-inset-*)
 * 2. Fallback sur des valeurs par défaut si non disponibles
 * 3. Met à jour lors des changements d'orientation ou de taille d'écran
 * 
 * @returns {SafeAreas} Valeurs des safe areas en pixels
 */
export const useSafeAreas = (): SafeAreas => {
  const [safeAreas, setSafeAreas] = useState<SafeAreas>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const calculateSafeAreas = (): void => {
      // Créer un élément temporaire pour lire les valeurs CSS
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.top = '0';
      tempElement.style.left = '0';
      tempElement.style.width = '0';
      tempElement.style.height = '0';
      tempElement.style.visibility = 'hidden';
      tempElement.style.paddingTop = 'env(safe-area-inset-top, 0px)';
      tempElement.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
      tempElement.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
      tempElement.style.paddingRight = 'env(safe-area-inset-right, 0px)';
      
      document.body.appendChild(tempElement);
      
      const computedStyle = window.getComputedStyle(tempElement);
      
      const top = parseFloat(computedStyle.paddingTop) || 0;
      const bottom = parseFloat(computedStyle.paddingBottom) || 0;
      const left = parseFloat(computedStyle.paddingLeft) || 0;
      const right = parseFloat(computedStyle.paddingRight) || 0;
      
      document.body.removeChild(tempElement);
      
      setSafeAreas({ top, bottom, left, right });
    };

    // Calcul initial
    calculateSafeAreas();

    // Recalculer lors des changements d'orientation ou de taille
    const handleResize = (): void => {
      // Délai pour laisser le temps au navigateur de mettre à jour les valeurs
      setTimeout(calculateSafeAreas, 100);
    };

    const handleOrientationChange = (): void => {
      // Délai plus long pour l'orientation car le navigateur a besoin de plus de temps
      setTimeout(calculateSafeAreas, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Pour iOS, écouter aussi les événements spécifiques
    if (Capacitor.getPlatform() === 'ios') {
      // Visual Viewport peut changer lors des rotations
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return safeAreas;
};

