import React, { useState } from 'react';

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
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              position: 'absolute',
              right: '1rem',
              top: '1rem',
              color: 'var(--text-color)'
            }}
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

      <style>{`
        .vss-form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          backdrop-filter: blur(5px);
        }

        .vss-form-container {
          background-color: var(--bg-color);
          padding: 2rem;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .vss-form-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .vss-form-header h2 {
          margin: 0;
          color: var(--text-color);
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--text-color);
          font-weight: 500;
        }

        .form-group input[type="text"],
        .form-group input[type="datetime-local"],
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background-color: var(--bg-secondary);
          color: var(--text-color);
          font-size: 0.9rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .anonymous-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .anonymous-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .form-actions {
          margin-top: 2rem;
        }

        .submit-button {
          width: 100%;
          padding: 1rem;
          background-color: #e74c3c;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .submit-button:hover {
          background-color: #c0392b;
        }

        .form-note {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-color-light);
          text-align: center;
        }

        @media (max-width: 480px) {
          .vss-form-container {
            padding: 1rem;
            width: 95%;
          }

          .form-group {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default VSSForm; 