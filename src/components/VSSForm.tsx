/**
* @fileoverview Formulaire de signalement VSS (Violences Sexuelles et Sexistes)
* 
* Ce composant gère :
* - Formulaire de signalement avec champs obligatoires
* - Envoi de notifications via Bot Telegram
* - Validation des données avec le profil participant Firebase
* - Système anti-spam avec rate limiting
* - Interface sécurisée et confidentielle
* - Fallback vers mailto en cas d'échec Telegram
* 
* Nécessaire car :
* - Obligation légale de fournir un moyen de signalement VSS
* - Interface sécurisée pour les signalements sensibles
* - Envoi direct sans exposer l'utilisateur à des clients email
* - Conformité avec les exigences de protection des victimes
*/

import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import logger from '../services/Logger';
import { useModal } from '../contexts/ModalContext';
import {
  onModalSingleLineInputEnterKey,
  onModalTextareaEnterKeyDone,
} from '../utils/mobileFormKeyboard';
import './VSSForm.css';

// Configuration anti-spam
const SPAM_CONFIG = {
  MAX_SUBMISSIONS_PER_HOUR: 3,      // Max 3 envois par heure
  MAX_VIOLATIONS_BEFORE_BLOCK: 3,   // Blocage après 3 violations
  BLOCK_DURATION_HOURS: 6,         // Durée du blocage en heures
  DUPLICATE_CHECK_HOURS: 24,        // Vérifier les doublons sur les dernières 24h
};

interface ParticipantData {
  nom: string;
  prenom: string;
}

/** Incident categories for VSS reporting (value = stable id for backend, label = user-facing). */
const INCIDENT_TYPE_OPTIONS = [
  { value: 'sexual_harassment', label: 'Harcèlement sexuel' },
  { value: 'sexual_assault', label: 'Agression sexuelle' },
  { value: 'rape_or_attempt', label: 'Viol ou tentative de viol' },
  { value: 'exposure', label: 'Exposition / masturbation non consentie' },
  { value: 'sexist_behavior', label: 'Propos ou comportements sexistes' },
  { value: 'online', label: 'Cyberviolence (messages, images, réseaux)' },
  { value: 'other', label: 'Autre (à préciser dans la description)' },
] as const;

const getIncidentTypeLabel = (value: string): string => {
  const opt = INCIDENT_TYPE_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? 'Non renseigné';
};

/** User/supplied text for Telegram parse_mode HTML (avoids broken markup). */
const escapeTelegramHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface SpamData {
  submissions: number[];  // Timestamps des envois
  violations: number;     // Nombre de violations
  blockedUntil: number | null;  // Timestamp de fin de blocage
  contentHashes: Array<{ hash: string; timestamp: number }>;  // Hashs des contenus soumis pour détection de doublons
}

interface VSSFormProps {
  onClose: () => void;
}

const VSSForm: React.FC<VSSFormProps> = ({ onClose }) => {
  const { setShowChat } = useModal();
  
  const [formData, setFormData] = useState({
    incidentType: '',
    description: '',
    date: '',
    location: '',
    firstName: '',
    lastName: '',
    phone: '',
    certified: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Fermer le chat quand le formulaire VSS s'ouvre
  useEffect(() => {
    setShowChat(false);
  }, [setShowChat]);
  
  // ============ SYSTÈME ANTI-SPAM ============
  
  // Récupérer les données de spam depuis localStorage
  const getSpamData = (braceletNumber: string): SpamData => {
    const data = localStorage.getItem(`vss_spam_${braceletNumber}`);
    if (data) {
      const parsed = JSON.parse(data);
      // Migration: ajouter contentHashes si absent
      if (!parsed.contentHashes) {
        parsed.contentHashes = [];
      }
      return parsed;
    }
    return { submissions: [], violations: 0, blockedUntil: null, contentHashes: [] };
  };
  
  // Sauvegarder les données de spam
  const saveSpamData = (braceletNumber: string, data: SpamData) => {
    localStorage.setItem(`vss_spam_${braceletNumber}`, JSON.stringify(data));
  };
  
  // Vérifier si le bracelet est bloqué
  const isBlocked = (braceletNumber: string): boolean => {
    const spamData = getSpamData(braceletNumber);
    if (spamData.blockedUntil && Date.now() < spamData.blockedUntil) {
      return true;
    }
    // Si le blocage est expiré, on le reset
    if (spamData.blockedUntil && Date.now() >= spamData.blockedUntil) {
      spamData.blockedUntil = null;
      spamData.violations = 0;
      saveSpamData(braceletNumber, spamData);
    }
    return false;
  };
  
  // Vérifier le rate limit (max X envois par heure)
  const checkRateLimit = (braceletNumber: string): boolean => {
    const spamData = getSpamData(braceletNumber);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Filtrer les soumissions de la dernière heure
    const recentSubmissions = spamData.submissions.filter(ts => ts > oneHourAgo);
    
    return recentSubmissions.length < SPAM_CONFIG.MAX_SUBMISSIONS_PER_HOUR;
  };
  
  
  // Enregistrer une violation et potentiellement bloquer
  const recordViolation = (braceletNumber: string) => {
    const spamData = getSpamData(braceletNumber);
    spamData.violations += 1;
    
    // Bloquer si trop de violations
    if (spamData.violations >= SPAM_CONFIG.MAX_VIOLATIONS_BEFORE_BLOCK) {
      spamData.blockedUntil = Date.now() + (SPAM_CONFIG.BLOCK_DURATION_HOURS * 60 * 60 * 1000);
    }
    
    saveSpamData(braceletNumber, spamData);
    return spamData.violations >= SPAM_CONFIG.MAX_VIOLATIONS_BEFORE_BLOCK;
  };
  
  // Générer un hash du contenu pour détection de doublons
  const generateContentHash = (): string => {
    // Normaliser le contenu pour détecter les doublons même avec variations mineures
    const normalizedDescription = normalizeString(formData.description)
    .replace(/\s+/g, ' ')  // Normaliser les espaces multiples
    .trim();
    const normalizedLocation = normalizeString(formData.location)
    .replace(/\s+/g, ' ')
    .trim();
    const normalizedDate = formData.date.trim();
    
    // Créer un hash simple basé sur le contenu
    const normalizedType = normalizeString(formData.incidentType).trim();
    const contentString = `${normalizedType}|${normalizedDate}|${normalizedLocation}|${normalizedDescription}`;
    
    // Hash simple mais efficace (peut être amélioré avec crypto.subtle si nécessaire)
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  };
  
  // Vérifier si le contenu est un doublon
  const isDuplicate = (braceletNumber: string): boolean => {
    const spamData = getSpamData(braceletNumber);
    const contentHash = generateContentHash();
    const checkWindow = Date.now() - (SPAM_CONFIG.DUPLICATE_CHECK_HOURS * 60 * 60 * 1000);
    
    // Vérifier si ce hash existe dans les dernières 24h
    const recentHashes = spamData.contentHashes.filter(
      entry => entry.timestamp > checkWindow && entry.hash === contentHash
    );
    
    return recentHashes.length > 0;
  };
  
  // Enregistrer une soumission réussie
  const recordSubmission = (braceletNumber: string) => {
    const spamData = getSpamData(braceletNumber);
    const now = Date.now();
    
    spamData.submissions.push(now);
    
    // Enregistrer le hash du contenu pour détection de doublons
    const contentHash = generateContentHash();
    spamData.contentHashes.push({ hash: contentHash, timestamp: now });
    
    // Garder seulement les soumissions et hashs des dernières 24h
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    spamData.submissions = spamData.submissions.filter(ts => ts > oneDayAgo);
    spamData.contentHashes = spamData.contentHashes.filter(entry => entry.timestamp > oneDayAgo);
    
    saveSpamData(braceletNumber, spamData);
  };
  
  // Envoyer une alerte spam sur Telegram
  const sendSpamAlert = async (braceletNumber: string, reason: string, wasBlocked: boolean) => {
    const message = `⚠️ <b>ALERTE SPAM DÉTECTÉ</b> ⚠️
    
🎫 <b>Bracelet n° :</b> ${braceletNumber}
📝 <b>Raison :</b> ${reason}
🚫 <b>Statut :</b> ${wasBlocked ? `BLOQUÉ pour ${SPAM_CONFIG.BLOCK_DURATION_HOURS}h` : 'Avertissement'}`;
    
    try {
      await sendToTelegram(message);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de l\'alerte spam:', error);
    }
  };
  
  // ============ FIN SYSTÈME ANTI-SPAM ============
  
  // Fonction pour normaliser les chaînes (enlever accents, espaces, minuscules)
  const normalizeString = (str: string): string => {
    return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  };
  
  // Vérifier les données du formulaire avec Firebase
  const verifyParticipantData = async (): Promise<boolean> => {
    const storedBracelet = localStorage.getItem('userBraceletNumber');
    
    if (!storedBracelet) {
      setValidationError('Informations participant non valide');
      return false;
    }
    
    try {
      const participantRef = ref(database, `participants/${storedBracelet}`);
      const snapshot = await get(participantRef);
      
      if (!snapshot.exists()) {
        setValidationError('Erreur lors de la vérification des informations participant');
        return false;
      }
      
      const data = snapshot.val() as ParticipantData;
      
      // Comparer les données saisies avec celles de Firebase
      const nomMatch = normalizeString(formData.lastName) === normalizeString(data.nom || '');
      const prenomMatch = normalizeString(formData.firstName) === normalizeString(data.prenom || '');
      
      if (!nomMatch || !prenomMatch) {
        setValidationError('Informations participant non valide');
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      logger.error('Erreur lors de la vérification:', error);
      setValidationError('Informations participant non valide');
      return false;
    }
  };
  
  const sendToTelegram = async (message: string) => {
    const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'envoi Telegram');
    }
    
    return response.json();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que la case de certification est cochée
    if (!formData.certified) {
      alert('Veuillez certifier que les coordonnées fournies sont les vôtres.');
      return;
    }
    
    setIsSubmitting(true);
    setValidationError(null);
    setSuccessMessage(null);
    
    // Récupérer le numéro de bracelet
    const braceletNumber = localStorage.getItem('userBraceletNumber') || 'Inconnu';
    
    // ============ VÉRIFICATIONS ANTI-SPAM ============
    
    // 1. Vérifier si le bracelet est bloqué
    if (isBlocked(braceletNumber)) {
      setValidationError('Accès temporairement suspendu');
      setIsSubmitting(false);
      return;
    }
    
    // 2. Vérifier le rate limit
    if (!checkRateLimit(braceletNumber)) {
      const wasBlocked = recordViolation(braceletNumber);
      await sendSpamAlert(braceletNumber, 'Rate limit dépassé', wasBlocked);
      setValidationError(wasBlocked ? 'Accès temporairement suspendu' : 'Trop de signalements. Veuillez patienter.');
      setIsSubmitting(false);
      return;
    }
    
    // 3. Vérifier les doublons
    if (isDuplicate(braceletNumber)) {
      const wasBlocked = recordViolation(braceletNumber);
      await sendSpamAlert(braceletNumber, 'Doublon détecté', wasBlocked);
      setValidationError(wasBlocked ? 'Accès temporairement suspendu' : 'Ce signalement a déjà été envoyé récemment.');
      setIsSubmitting(false);
      return;
    }
    
    // ============ FIN VÉRIFICATIONS ANTI-SPAM ============
    
    // Vérifier les données personnelles avec Firebase (nom et prénom)
    const isValid = await verifyParticipantData();
    if (!isValid) {
      setIsSubmitting(false);
      return;
    }
    
    // Formater la date pour un affichage plus lisible
    const formatDate = (dateString: string) => {
      if (!dateString) return 'Non spécifiée';
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short'
      });
    };
    
    // Telegram: all form fields (HTML-escaped user content)
    const message = `<b>NOUVEAU SIGNALEMENT VSS</b>
    
<b>Date de l'incident :</b> ${escapeTelegramHtml(formatDate(formData.date))}
<b>Lieu de l'incident :</b> ${escapeTelegramHtml(formData.location)}
<b>Type d'incident :</b> ${escapeTelegramHtml(getIncidentTypeLabel(formData.incidentType))}
    
<b>Description de l'incident :</b>
${escapeTelegramHtml(formData.description)}
    
<b>Coordonnées :</b>
• Nom : ${escapeTelegramHtml(formData.lastName)}
• Prénom : ${escapeTelegramHtml(formData.firstName)}
• Téléphone : ${escapeTelegramHtml(formData.phone)}
• Bracelet n° : ${escapeTelegramHtml(braceletNumber)}`;
    
    try {
      await sendToTelegram(message);
      // Enregistrer la soumission réussie pour le rate limiting
      recordSubmission(braceletNumber);
      setSuccessMessage('Signalement envoyé avec succès!');
      setIsSubmitting(false);
      
      // Réinitialiser le formulaire après 3 secondes
      setTimeout(() => {
        setFormData({
          incidentType: '',
          description: '',
          date: '',
          location: '',
          firstName: '',
          lastName: '',
          phone: '',
          certified: false,
        });
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      logger.error('Erreur lors de l\'envoi:', error);
      
      // Fallback: Méthode traditionnelle avec client mail
      const emailContent = `Nouveau signalement :
      
Date de l'incident : ${formData.date}
Lieu : ${formData.location}
Type d'incident : ${getIncidentTypeLabel(formData.incidentType)}
Description : ${formData.description}
Nom : ${formData.lastName}
Prénom : ${formData.firstName}
Téléphone : ${formData.phone}`;
      
      try {
        const mailtoUrl = `mailto:pap71@hotmail.fr?subject=Signalement%20VSS&body=${encodeURIComponent(emailContent)}`;
        window.location.href = mailtoUrl;
        alert('Le client mail par défaut va s\'ouvrir. Veuillez envoyer le message.');
      } catch (mailtoError) {
        alert(`Erreur lors de l'envoi automatique. Veuillez copier ce contenu et l'envoyer manuellement à pap71@hotmail.fr :
          
          ${emailContent}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    };
    
    return (
      <div className="vss-form-overlay" onClick={onClose}>
      <div className="vss-form-container" onClick={e => e.stopPropagation()}>
      <div className="vss-form-header">
      <h2>Faire un signalement</h2>
      <button 
      className="close-button"
      onClick={onClose}
      >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      </button>
      </div>
      
      <div className="vss-form-content">
      <form onSubmit={handleSubmit}>
      <div className="form-group">
      <label htmlFor="date">Date de l'incident</label>
      <input
      type="datetime-local"
      id="date"
      value={formData.date}
      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
      enterKeyHint="done"
      onKeyDown={onModalSingleLineInputEnterKey}
      required
      />
      </div>
      
      <div className="form-group">
      <label htmlFor="location">Lieu de l'incident</label>
      <input
      type="text"
      id="location"
      value={formData.location}
      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
      placeholder="Ex: Gymnase, Bar, etc."
      enterKeyHint="done"
      onKeyDown={onModalSingleLineInputEnterKey}
      required
      />
      </div>
      
      <div className="form-group">
      <label htmlFor="incidentType">Type d&apos;incident</label>
      <select
      id="incidentType"
      value={formData.incidentType}
      onChange={(e) =>
        setFormData({ ...formData, incidentType: e.target.value })
      }
      required
      >
      <option value="" disabled>
      Sélectionner un type
      </option>
      {INCIDENT_TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
        {option.label}
        </option>
      ))}
      </select>
      </div>
      
      <div className="form-group">
      <label htmlFor="description">
      Description de l&apos;incident
      </label>
      <textarea
      id="description"
      value={formData.description}
      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      placeholder="Décrivez la situation..."
      enterKeyHint="done"
      onKeyDown={onModalTextareaEnterKeyDone}
      required
      rows={5}
      />
      </div>
      
      <div className="form-group">
      <label htmlFor="lastName">Votre nom *</label>
      <input
      type="text"
      id="lastName"
      value={formData.lastName}
      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
      placeholder="Votre nom"
      enterKeyHint="done"
      onKeyDown={onModalSingleLineInputEnterKey}
      required
      />
      </div>
      
      <div className="form-group">
      <label htmlFor="firstName">Votre prénom *</label>
      <input
      type="text"
      id="firstName"
      value={formData.firstName}
      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
      placeholder="Votre prénom"
      enterKeyHint="done"
      onKeyDown={onModalSingleLineInputEnterKey}
      required
      />
      </div>
      
      <div className="form-group">
      <label htmlFor="phone">Votre numéro de téléphone *</label>
      <input
      type="tel"
      id="phone"
      value={formData.phone}
      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      placeholder="Votre numéro de téléphone"
      enterKeyHint="done"
      onKeyDown={onModalSingleLineInputEnterKey}
      required
      />
      </div>
      
      <div className="form-group">
      <div className="certification-checkbox">
      <input
      type="checkbox"
      id="certified"
      checked={formData.certified}
      onChange={(e) => setFormData({ ...formData, certified: e.target.checked })}
      required
      />
      <label htmlFor="certified">Je certifie avoir saisie correctement mes coordonnées*</label>
      </div>
      </div>
      
      {validationError && (
        <div className="validation-error">
        {validationError}
        </div>
      )}
      
      {successMessage && (
        <div className="validation-success">
        {successMessage}
        </div>
      )}
      
      <div className="form-actions">
      <button 
      type="submit" 
      className="submit-button"
      disabled={isSubmitting || !formData.certified}
      >
      {isSubmitting ? 'Vérification en cours...' : 'Envoyer le signalement'}
      </button>
      </div>
      </form>
      
      <p className="form-note">
      Ce formulaire est strictement confidentiel. Les informations seront transmises uniquement aux personnes responsables.
      </p>
      </div>
      </div>
      </div>
    );
  };
  
  export default VSSForm; 