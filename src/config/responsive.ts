/**
 * Constantes et utilitaires pour le responsive design
 * Utilisé pour standardiser les breakpoints et dimensions adaptatives
 */

// Breakpoints standards
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200
} as const;

// Dimensions adaptatives recommandées pour les modales
export const MODAL_SIZES = {
  small: 'min(350px, 90vw)',
  medium: 'min(500px, 90vw)',
  large: 'min(800px, 95vw)'
} as const;

// Dimensions adaptatives pour les cartes
export const CARD_SIZES = {
  event: 'min(350px, 85vw)',
  small: 'min(280px, 90vw)',
  medium: 'min(300px, 85vw)'
} as const;

// Hauteurs adaptatives pour le calendrier
export const CALENDAR_HEIGHTS = {
  events: 'clamp(400px, calc(100vh - var(--header-height) - var(--bottom-nav-height) - 200px), 700px)',
  maxHeight: 'calc(100vh - var(--header-height) - var(--bottom-nav-height) - 150px)'
} as const;

// Utilitaires pour générer des valeurs clamp
export const clamp = (min: number, preferred: string, max: number): string => {
  return `clamp(${min}px, ${preferred}, ${max}px)`;
};

// Utilitaires pour générer des valeurs min
export const minSize = (fixed: number, viewport: number): string => {
  return `min(${fixed}px, ${viewport}vw)`;
};
