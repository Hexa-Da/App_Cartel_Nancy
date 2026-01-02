/**
 * @fileoverview Configuration Google Analytics (gtag.js)
 * 
 * Ce fichier configure Google Analytics via gtag.js :
 * - Charge le script gtag.js de manière asynchrone
 * - Initialise dataLayer et la fonction gtag
 * - Configure GA avec l'ID de mesure
 * 
 * Nécessaire car :
 * - Centralise la configuration Analytics
 * - S'exécute avant le rendu React pour un tracking optimal
 * - Complète la configuration ReactGA dans analytics.ts
 */

const GA_MEASUREMENT_ID = 'G-C7EB2DWKD0';

/**
 * Configure Google Analytics via gtag.js
 * Cette fonction doit être appelée avant le rendu React
 */
export const setupAnalytics = (): void => {
  // Initialiser dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Définir la fonction gtag
  function gtag(...args: unknown[]): void {
    window.dataLayer.push(args);
  }
  
  // Exposer gtag globalement
  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
  
  // Initialiser avec la date actuelle
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  
  // Charger le script gtag.js de manière asynchrone
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

