import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Préparer le contenu de l'email
    const emailContent = `
      Nouveau signalement VSS :
      
      Date de l'incident : ${formData.date}
      Lieu : ${formData.location}
      Description : ${formData.description}
      Contact (si non anonyme) : ${formData.anonymous ? 'Anonyme' : formData.contact}
    `;

    // Créer l'URL mailto avec le contenu
    const mailtoUrl = `mailto:signalement@cartelnancy2026.fr?subject=Signalement VSS&body=${encodeURIComponent(emailContent)}`;
    
    // Ouvrir le client mail par défaut
    window.location.href = mailtoUrl;
    
    // Fermer le formulaire
    onClose();
  };

  return (
    <div className="vss-form-overlay" onClick={onClose}>
      <div className="vss-form-container" onClick={e => e.stopPropagation()}>
        <div className="vss-form-header">
          <h2>Signalement VSS</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

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
            <button type="submit" className="submit-button">
              Envoyer le signalement
            </button>
          </div>
        </form>

        <p className="form-note">
          Ce formulaire est strictement confidentiel. Les informations seront transmises uniquement aux personnes responsables.
        </p>
      </div>
    </div>
  );
};

export default VSSForm; 