/**
 * @fileoverview Configuration Google Analytics pour l'application
 * 
 * Ce fichier configure et initialise Google Analytics 4 (GA4) :
 * - Récupère l'ID de mesure depuis les variables d'environnement
 * - Initialise ReactGA avec les options appropriées
 * - Envoie un événement de test pour valider la connexion
 * 
 * Nécessaire car :
 * - Centralise la configuration Analytics
 * - Facilite la maintenance et les tests
 * - Permet de désactiver facilement en développement
 */

import ReactGA from 'react-ga4';

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXX';

/**
 * Initialise Google Analytics avec la configuration appropriée
 */
export const initializeAnalytics = () => {
  // Configuration avec mode test activé pour la validation
  ReactGA.initialize(GA_MEASUREMENT_ID, {
    testMode: process.env.NODE_ENV !== 'production',
    gaOptions: {
      sendPageView: false // Nous enverrons manuellement le pageview
    }
  });

  // Envoyer un événement test pour vérifier la connexion
  ReactGA.event({
    category: 'testing',
    action: 'ga_test',
    label: 'Validation de connexion GA4'
  });
};

