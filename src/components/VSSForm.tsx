/**
 * @fileoverview Formulaire de signalement VSS (Violences Sexuelles et Sexistes)
 * 
 * Ce composant gère :
 * - Formulaire de signalement avec champs obligatoires
 * - Envoi de notifications via Bot Telegram
 * - Validation des données avec le profil participant Firebase
 * - Système anti-spam avec détection de trolls
 * - Interface sécurisée et confidentielle
 * - Fallback vers mailto en cas d'échec Telegram
 * 
 * Nécessaire car :
 * - Obligation légale de fournir un moyen de signalement VSS
 * - Interface sécurisée pour les signalements sensibles
 * - Envoi direct sans exposer l'utilisateur à des clients email
 * - Conformité avec les exigences de protection des victimes
 */

import React, { useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import logger from '../services/Logger';
import './VSSForm.css';

// Configuration anti-spam
const SPAM_CONFIG = {
  MAX_SUBMISSIONS_PER_HOUR: 5,      // Max 5 envois par heure
  MAX_VIOLATIONS_BEFORE_BLOCK: 3,   // Blocage après 3 violations
  BLOCK_DURATION_HOURS: 24,         // Durée du blocage en heures
};

interface ParticipantData {
  nom: string;
  prenom: string;
  telephone: string;
}

interface SpamData {
  submissions: number[];  // Timestamps des envois
  violations: number;     // Nombre de violations
  blockedUntil: number | null;  // Timestamp de fin de blocage
}

interface VSSFormProps {
  onClose: () => void;
}

const VSSForm: React.FC<VSSFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    description: '',
    date: '',
    location: '',
    firstName: '',
    lastName: '',
    phone: '',
    certified: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ============ SYSTÈME ANTI-SPAM ============

  // Récupérer les données de spam depuis localStorage
  const getSpamData = (braceletNumber: string): SpamData => {
    const data = localStorage.getItem(`vss_spam_${braceletNumber}`);
    if (data) {
      return JSON.parse(data);
    }
    return { submissions: [], violations: 0, blockedUntil: null };
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

  // Détecter si le contenu est suspect (troll)
  const detectSuspiciousContent = (): { isSuspicious: boolean; reason: string } => {
    const description = formData.description.toLowerCase();
    const location = formData.location.toLowerCase();
    
    // Liste de patterns suspects
    const suspiciousPatterns = [
      /(.)\1{5,}/,  // Caractères répétés 5+ fois (aaaaaaa, !!!!!!)
      /^[a-z]{1,3}$/,  // Texte trop court (abc, ab)
      /test|troll|fake|lol|mdr|ptdr|xd|haha/i,  // Mots suspects
    ];

    // Vérifier la description
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(description)) {
        return { isSuspicious: true, reason: 'Contenu suspect détecté dans la description' };
      }
    }

    // Vérifier le lieu
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(location)) {
        return { isSuspicious: true, reason: 'Contenu suspect détecté dans le lieu' };
      }
    }

    return { isSuspicious: false, reason: '' };
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

  // Enregistrer une soumission réussie
  const recordSubmission = (braceletNumber: string) => {
    const spamData = getSpamData(braceletNumber);
    spamData.submissions.push(Date.now());
    // Garder seulement les soumissions des dernières 24h
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    spamData.submissions = spamData.submissions.filter(ts => ts > oneDayAgo);
    saveSpamData(braceletNumber, spamData);
  };

  // Envoyer une alerte troll sur Telegram
  const sendTrollAlert = async (braceletNumber: string, reason: string, wasBlocked: boolean) => {
    const message = `⚠️ <b>ALERTE TROLL DÉTECTÉ</b> ⚠️

🎫 <b>Bracelet n° :</b> ${braceletNumber}
📝 <b>Raison :</b> ${reason}
🚫 <b>Statut :</b> ${wasBlocked ? 'BLOQUÉ pour 24h' : 'Avertissement'}

<b>Contenu soumis :</b>
• Lieu : ${formData.location}
• Description : ${formData.description.substring(0, 100)}${formData.description.length > 100 ? '...' : ''}`;

    try {
      await sendToTelegram(message);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de l\'alerte troll:', error);
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

  // Fonction pour normaliser les numéros de téléphone
  const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s.-]/g, '').replace(/^(\+33|0033)/, '0');
  };

  // Vérifier les données du formulaire avec Firebase
  const verifyParticipantData = async (): Promise<boolean> => {
    const storedBracelet = localStorage.getItem('userBraceletNumber');
    
    if (!storedBracelet) {
      setValidationError('Participant non valide');
      return false;
    }

    try {
      const participantRef = ref(database, `participants/${storedBracelet}`);
      const snapshot = await get(participantRef);
      
      if (!snapshot.exists()) {
        setValidationError('Participant non valide');
        return false;
      }

      const data = snapshot.val() as ParticipantData;
      
      // Comparer les données saisies avec celles de Firebase
      const nomMatch = normalizeString(formData.lastName) === normalizeString(data.nom || '');
      const prenomMatch = normalizeString(formData.firstName) === normalizeString(data.prenom || '');
      const phoneMatch = normalizePhone(formData.phone) === normalizePhone(data.telephone || '');

      if (!nomMatch || !prenomMatch || !phoneMatch) {
        setValidationError('Participant non valide');
        return false;
      }

      setValidationError(null);
      return true;
    } catch (error) {
      logger.error('Erreur lors de la vérification:', error);
      setValidationError('Participant non valide');
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
      alert('Veuillez certifier que les coordonnées fournies sont correctes.');
      return;
    }
    
    setIsSubmitting(true);
    setValidationError(null);

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
      await sendTrollAlert(braceletNumber, 'Rate limit dépassé', wasBlocked);
      setValidationError(wasBlocked ? 'Accès temporairement suspendu' : 'Trop de signalements. Veuillez patienter.');
      setIsSubmitting(false);
      return;
    }

    // 3. Détecter le contenu suspect
    const suspiciousCheck = detectSuspiciousContent();
    if (suspiciousCheck.isSuspicious) {
      const wasBlocked = recordViolation(braceletNumber);
      await sendTrollAlert(braceletNumber, suspiciousCheck.reason, wasBlocked);
      setValidationError(wasBlocked ? 'Accès temporairement suspendu' : 'Contenu non valide');
      setIsSubmitting(false);
      return;
    }

    // ============ FIN VÉRIFICATIONS ANTI-SPAM ============

    // Vérifier les données avec Firebase
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

    // Préparer le message Telegram
    const message = `<b>NOUVEAU SIGNALEMENT VSS</b>

<b>Date :</b> ${formatDate(formData.date)}
<b>Lieu :</b> ${formData.location}

<b>Description :</b>
${formData.description}

<b>Contact :</b>
• Nom : ${formData.lastName}
• Prénom : ${formData.firstName}
• Tél : ${formData.phone}
• Bracelet n° : ${braceletNumber}`;

    try {
      await sendToTelegram(message);
      // Enregistrer la soumission réussie pour le rate limiting
      recordSubmission(braceletNumber);
      alert('Signalement envoyé!');
      onClose();

    } catch (error) {
      logger.error('Erreur lors de l\'envoi:', error);
      
      // Fallback: Méthode traditionnelle avec client mail
      const emailContent = `Nouveau signalement VSS :

Date de l'incident : ${formData.date}
Lieu : ${formData.location}
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
          <h2 style={{ margin: 0 }}>Signalement VSS</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
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
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description de l'incident</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez la situation..."
              required
              rows={5}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Nom *</label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Votre nom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="firstName">Prénom *</label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Votre prénom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Numéro de téléphone *</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Votre numéro de téléphone"
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
              <label htmlFor="certified">Je certifie que les coordonnées fournies sont correctes *</label>
            </div>
          </div>

          {validationError && (
            <div className="validation-error">
              {validationError}
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