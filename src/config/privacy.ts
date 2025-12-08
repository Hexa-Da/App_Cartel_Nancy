/**
 * @fileoverview Configuration de la politique de confidentialité et conformité RGPD
 * 
 * Ce fichier définit la configuration de confidentialité avec :
 * - Informations de contact et URLs légales
 * - Services tiers utilisés (Firebase, Google, Telegram)
 * - Types de données collectées et leur utilisation
 * - Conformité réglementaire (RGPD, loi française)
 * 
 * Nécessaire car :
 * - Assure la conformité RGPD obligatoire
 * - Centralise la configuration des services tiers
 * - Définit clairement l'utilisation des données
 * - Facilite la mise à jour de la politique
 */

// Configuration de la politique de confidentialité
export const PRIVACY_CONFIG = {
  // Informations de contact
  contact: {
    email: 'pap71530@outlook.com',
    phone: '0767786330',
    privacyPolicyUrl: '/privacy-policy.html',
    termsOfServiceUrl: '/terms-of-service.html'
  },

  // Services tiers utilisés
  thirdPartyServices: [
    {
      name: 'Firebase',
      purpose: 'Base de données pour les événements publics',
      dataType: 'Données publiques des événements (non personnelles)',
      privacyPolicy: 'https://firebase.google.com/support/privacy'
    },
    {
      name: 'Google Analytics',
      purpose: 'Analyse d\'utilisation anonymisée',
      dataType: 'Données d\'utilisation anonymisées',
      privacyPolicy: 'https://policies.google.com/privacy'
    },
    {
      name: 'Google Maps',
      purpose: 'Intégration cartographique',
      dataType: 'Redirection externe (aucune donnée collectée)',
      privacyPolicy: 'https://policies.google.com/privacy'
    },
    {
      name: 'Nominatim OpenStreetMap',
      purpose: 'Géocodage des adresses',
      dataType: 'Adresses pour conversion en coordonnées GPS',
      privacyPolicy: 'https://operations.osmfoundation.org/policies/nominatim/'
    },
    {
      name: 'Telegram Bot',
      purpose: 'Notification des signalements VSS',
      dataType: 'Contenu des signalements VSS',
      privacyPolicy: 'https://telegram.org/privacy'
    }
  ],

  // Types de données collectées
  dataTypes: {
    location: {
      collected: true,
      purpose: 'Affichage de la position sur la carte',
      storage: 'local',
      shared: false,
      consentRequired: true
    },
    preferences: {
      collected: true,
      purpose: 'Personnalisation de l\'expérience utilisateur',
      storage: 'local',
      shared: false,
      consentRequired: false
    },
    usage: {
      collected: true,
      purpose: 'Amélioration de l\'application',
      storage: 'anonymized',
      shared: true,
      sharedWith: 'Google Analytics',
      consentRequired: false
    },
    adminAuth: {
      collected: true,
      purpose: 'Accès aux fonctionnalités d\'administration',
      storage: 'local_encrypted',
      shared: false,
      consentRequired: true
    },
    vssReports: {
      collected: true,
      purpose: 'Transmission des signalements aux autorités compétentes',
      storage: 'telegram_transmission',
      shared: true,
      sharedWith: 'Destinataires des signalements VSS (via Telegram)',
      consentRequired: true
    }
  },

  // Conformité réglementaire
  compliance: {
    gdpr: true,
    frenchLaw: true,
    coppa: false, // Pas d'utilisation par des mineurs de moins de 13 ans
    dataMinimization: true,
    userRights: {
      access: true,
      rectification: true,
      erasure: true,
      portability: true,
      objection: true
    }
  },

  // Métriques de rétention des données
  dataRetention: {
    localData: 'Supprimée lors de la désinstallation de l\'application',
    analyticsData: 'Anonymisée et conservée selon les politiques Google Analytics',
    serverData: 'Aucune donnée personnelle stockée sur nos serveurs'
  }
};

// Fonction pour obtenir l'URL de la politique de confidentialité
export const getPrivacyPolicyUrl = (): string => {
  // Politique de confidentialité personnalisée
  return '/privacy-policy.html';
};

// Fonction pour obtenir l'URL des conditions générales d'utilisation
export const getTermsOfServiceUrl = (): string => {
  // Conditions générales d'utilisation personnalisées
  return '/terms-of-service.html';
};

// Note: Pas de bannière de consentement dans l'application
// La politique de confidentialité est accessible via l'URL externe
