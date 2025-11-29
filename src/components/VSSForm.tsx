/**
 * @fileoverview Formulaire de signalement VSS (Violences Sexuelles et Sexistes)
 * 
 * Ce composant gère :
 * - Formulaire de signalement avec champs obligatoires
 * - Envoi d'emails via EmailJS sans client email externe
 * - Validation des données et feedback utilisateur
 * - Interface sécurisée et confidentielle
 * - Fallback vers mailto en cas d'échec EmailJS
 * 
 * Nécessaire car :
 * - Obligation légale de fournir un moyen de signalement VSS
 * - Interface sécurisée pour les signalements sensibles
 * - Envoi direct sans exposer l'utilisateur à des clients email
 * - Conformité avec les exigences de protection des victimes
 */

import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import './VSSForm.css';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que la case de certification est cochée
    if (!formData.certified) {
      alert('Veuillez certifier que les coordonnées fournies sont correctes.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Initialiser EmailJS
      emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      
      // Préparer les paramètres de l'email
      const templateParams = {
        to_email: 'pap71@hotmail.fr',
        subject: 'Signalement VSS',
        date: formData.date,
        location: formData.location,
        description: formData.description,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        from_name: `${formData.firstName} ${formData.lastName}`
      };

      // Envoyer l'email directement
      const result = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams
      );

      alert('Signalement envoyé!');
      onClose();

    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      
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

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting || !formData.certified}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le signalement'}
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