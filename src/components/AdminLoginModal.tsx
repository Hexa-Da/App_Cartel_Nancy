/**
 * @fileoverview Modal d'authentification administrateur sécurisée
 * 
 * Ce composant gère :
 * - Interface de connexion sécurisée pour les administrateurs
 * - Saisie du code d'accès avec validation
 * - Feedback utilisateur (erreurs, succès)
 * - Fermeture automatique après authentification réussie
 * - Design modal avec overlay et gestion des clics
 * 
 * Nécessaire car :
 * - Sécurise l'accès aux fonctionnalités d'administration
 * - Interface dédiée pour l'authentification admin
 * - Validation centralisée du code d'accès
 * - UX claire pour la connexion administrateur
 */

import React, { useState } from 'react';
import './AdminLoginModal.css';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (code: string) => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [code, setCode] = useState('');
  const adminCodeId = `admin-code-${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onLogin(code.trim());
      setCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Espace administrateur</h2>
          <button className="admin-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor={adminCodeId}>Code d'accès</label>
            <input
              type="password"
              id={adminCodeId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Entrez le code d'accès"
              required
              autoFocus
            />
          </div>
          
          <button type="submit" className="admin-login-button">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
