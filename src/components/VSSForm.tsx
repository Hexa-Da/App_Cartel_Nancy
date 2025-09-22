/**
 * @fileoverview Formulaire de signalement VSS (Violences Sexuelles et Sexistes)
 * 
 * Ce composant gère :
 * - Formulaire de signalement avec champs obligatoires et optionnels
 * - Envoi d'emails via EmailJS sans client email externe
 * - Option d'anonymat pour les signalements
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
    contact: '',
    anonymous: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        contact: formData.anonymous ? 'Anonyme' : formData.contact,
        from_name: formData.anonymous ? 'Anonyme' : 'Signalement VSS'
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
Contact (si non anonyme) : ${formData.anonymous ? 'Anonyme' : formData.contact}`;

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
            style={{ position: 'absolute', top: '15px', right: '10px', zIndex: 10 }}
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
            <div className="anonymous-checkbox">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.anonymous}
                onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
              />
              <label htmlFor="anonymous">Je souhaite rester anonyme</label>
            </div>
          </div>

          {!formData.anonymous && (
            <div className="form-group">
              <label htmlFor="contact">Contact (email ou téléphone)</label>
              <input
                type="text"
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Votre contact pour le suivi"
              />
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
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