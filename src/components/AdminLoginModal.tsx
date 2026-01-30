/**
 * @fileoverview Modal d'authentification administrateur via Google OAuth
 * 
 * Ce composant gère :
 * - Interface de connexion sécurisée pour les administrateurs via Google
 * - Authentification OAuth2 via Capacitor et Firebase Auth
 * - Vérification du statut admin via Custom Claims ou whitelist
 * - Feedback utilisateur (erreurs, chargement, succès)
 * - Fermeture automatique après authentification réussie
 * - Design modal avec overlay et gestion des clics
 * 
 * Nécessaire car :
 * - Sécurise l'accès aux fonctionnalités d'administration
 * - Interface dédiée pour l'authentification admin Google
 * - Remplace le système de code statique par une authentification réelle
 * - UX claire pour la connexion administrateur
 */

import React, { useState, useEffect } from 'react';
import { signInWithGoogle, IAuthUser } from '../services/AuthService';
import logger from '../services/Logger';
import './AdminLoginModal.css';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: IAuthUser) => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser l'état quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Bloquer le scroll du body/html quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;
      const body = document.body;
      const html = document.documentElement;
      
      // Bloquer le scroll au niveau du body et html
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      
      html.style.overflow = 'hidden';
      
      return () => {
        // Restaurer le scroll
        body.style.position = '';
        body.style.top = '';
        body.style.width = '';
        body.style.overflow = '';
        html.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.log('[AdminLoginModal] Démarrage de l\'authentification Google...');
      
      const user = await signInWithGoogle();

      // Vérifier que l'utilisateur est bien admin
      if (!user.isAdmin) {
        logger.warn('[AdminLoginModal] Utilisateur connecté mais non admin:', user.email);
        setError("Votre compte Google n'est pas autorisé en tant qu'administrateur.");
        
        // Déconnecter l'utilisateur immédiatement
        try {
          const { signOut } = await import('../services/AuthService');
          await signOut();
        } catch (signOutError) {
          logger.error('[AdminLoginModal] Erreur lors de la déconnexion:', signOutError);
        }
        
        setLoading(false);
        return;
      }

      logger.log('[AdminLoginModal] Authentification admin réussie:', user.email);
      
      // Notifier le parent du succès
      onLoginSuccess(user);
      
      // Fermer la modale
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      
      if (err instanceof Error) {
        // Gestion des erreurs spécifiques
        if (err.message.includes('annulée') || err.message.includes('cancel')) {
          logger.log('[AdminLoginModal] Authentification annulée par l\'utilisateur');
          setError(null); // Ne pas afficher d'erreur si l'utilisateur a annulé
        } else {
          logger.error('[AdminLoginModal] Erreur lors de l\'authentification:', err.message);
          setError(err.message || 'Erreur lors de la connexion Google. Veuillez réessayer.');
        }
      } else {
        logger.error('[AdminLoginModal] Erreur inconnue:', err);
        setError('Erreur lors de la connexion Google. Veuillez réessayer.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Espace administrateur</h2>
          <button className="admin-modal-close" onClick={onClose} disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="admin-login-form">
          <p className="admin-login-description">
            Connectez-vous avec votre compte Google pour accéder aux fonctionnalités d'administration.
          </p>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <button
            type="button"
            className="admin-login-google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="admin-login-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Connexion en cours...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Se connecter avec Google
              </>
            )}
          </button>

          <button
            type="button"
            className="admin-login-cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginModal;
