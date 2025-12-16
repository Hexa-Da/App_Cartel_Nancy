/**
 * @fileoverview Modal pour la saisie du numéro de bracelet
 * 
 * Ce composant gère :
 * - Interface de saisie du numéro de bracelet
 * - Validation du numéro
 * - Feedback utilisateur (erreurs)
 * - Design modal avec overlay et gestion des clics
 */

import React, { useState, useEffect } from 'react';
import './BraceletModal.css';

interface BraceletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (braceletNumber: string) => void;
  error?: string;
  initialValue?: string;
}

const BraceletModal: React.FC<BraceletModalProps> = ({ isOpen, onClose, onSubmit, error, initialValue = '' }) => {
  const [braceletNumber, setBraceletNumber] = useState('');
  const braceletInputId = `bracelet-input-${Math.random().toString(36).substr(2, 9)}`;

  // Réinitialiser avec la valeur initiale quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setBraceletNumber(initialValue);
    }
  }, [isOpen, initialValue]);

  // Bloquer le scroll de l'app quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      // Trouver l'élément qui scroll (.app-main)
      const appMain = document.querySelector('.app-main') as HTMLElement;
      if (appMain) {
        // Sauvegarder la position de scroll actuelle
        const scrollY = appMain.scrollTop;
        // Bloquer le scroll
        appMain.style.overflow = 'hidden';
        appMain.style.position = 'relative';
        
        return () => {
          // Restaurer le scroll
          appMain.style.overflow = '';
          appMain.style.position = '';
          appMain.scrollTop = scrollY;
        };
      }
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (braceletNumber.trim()) {
      onSubmit(braceletNumber.trim());
      setBraceletNumber('');
    }
  };

  const handleClose = () => {
    setBraceletNumber('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bracelet-modal-overlay" onClick={handleClose}>
      <div className="bracelet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="bracelet-modal-header">
          <h2>Numéro de bracelet</h2>
          <button className="bracelet-modal-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="bracelet-form">
          <div className="form-group">
            <label htmlFor={braceletInputId}>Veuillez saisir votre numéro de bracelet</label>
            <input
              type="text"
              id={braceletInputId}
              value={braceletNumber}
              onChange={(e) => setBraceletNumber(e.target.value)}
              placeholder="Ex: 12345"
              required
              autoFocus
            />
          </div>
          
          {error && <p className="bracelet-error">{error}</p>}
          
          <button type="submit" className="bracelet-submit-button">
            Valider
          </button>
        </form>
      </div>
    </div>
  );
};

export default BraceletModal;

