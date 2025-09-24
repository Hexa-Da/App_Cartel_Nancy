/**
 * @fileoverview En-tête de l'application avec navigation et authentification admin
 * 
 * Ce composant gère :
 * - Affichage conditionnel du bouton retour selon la page
 * - Logo et titre "Cartel Nancy" (masqués pour les admins)
 * - Boutons d'action (paramètres, urgence)
 * - Modal d'authentification administrateur
 * - Gestion de l'état admin avec localStorage
 * - Navigation contextuelle selon la page active
 * 
 * Nécessaire car :
 * - Interface de navigation principale de l'application
 * - Point d'accès pour l'authentification administrateur
 * - Gère l'affichage conditionnel des éléments selon le contexte
 * - Assure la cohérence de la navigation entre les pages
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsMenu from './SettingsMenu';
import AdminLoginModal from './AdminLoginModal';
import { verifyAdminCode } from '../firebase';
import { useApp } from '../AppContext';
import { useAppPanels } from '../AppPanelsContext';

interface HeaderProps {
  onChat?: () => void;
  onEmergency?: () => void;
  onAdmin?: () => void;
  showChat?: boolean;
  unreadCount?: number;
  onBack?: () => void;
  onEditModeToggle?: () => void;
  isEditing?: boolean;
  isBackDisabled?: boolean;
  hideBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onChat,
  onEmergency,
  onAdmin,
  showChat,
  unreadCount,
  onBack,
  onEditModeToggle,
  isEditing,
  isBackDisabled,
  hideBackButton
}) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { isAdmin, user, setIsAdmin, setUser } = useApp();
  const { setIsEditing } = useAppPanels();

  const handleAdminLogin = (code: string) => {
    if (verifyAdminCode(code)) {
      // Stocker l'état admin dans localStorage
      localStorage.setItem('isAdmin', 'true');
      // Mettre à jour l'état global directement
      setUser({ isAdmin: true });
      setIsAdmin(true);
      // Appeler la fonction onAdmin pour indiquer la connexion
      if (onAdmin) {
        onAdmin();
      }
      setShowAdminModal(false);
      
      // Déclencher un rafraîchissement global de l'application
      window.dispatchEvent(new CustomEvent('adminLoginSuccess'));
    } else {
      alert('Code d\'accès incorrect');
    }
  };

  return (
    <>
      <div className="app-header">
        <div className="header-left">
          {!hideBackButton && (
            <button
              className="header-back-button"
              onClick={isBackDisabled ? undefined : (onBack || (() => navigate(-1)))}
              title={isBackDisabled ? "Retour non disponible" : "Retour"}
              disabled={isBackDisabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          
          {hideBackButton && !isAdmin && (
            <div className="header-logo">
              <img 
                src="/logo-Photoroom.png" 
                alt="Cartel Nancy Logo" 
                style={{
                  height: '32px',
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <span className="header-logo-text">Cartel Nancy</span>
            </div>
          )}
          
          {isAdmin && onEditModeToggle && (
            <button
              className={`edit-button${isEditing ? ' active' : ''}`}
              style={{ 
                marginTop: '2px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: isEditing ? 'var(--danger-color)' : 'var(--warning-color)', 
                padding: '0.2rem 0.5rem', 
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
              onClick={onEditModeToggle}
              title={isEditing ? 'Quitter le mode édition' : 'Activer le mode édition'}
            >
              {isEditing ? 'Terminer' : 'Editer'}
            </button>
          )}
        </div>
        
        <div className="header-right">
          {onChat && (
            <button
              className={`chat-button${showChat ? ' active' : ''}`}
              style={{ right: '135px', top: '40px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
              onClick={onChat}
              title="Messages de l'orga"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>
          )}
          {onEmergency && (
            <button
              className="emergency-button"
              style={{ right: '95px', top: '40px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
              onClick={onEmergency}
              title="Contacts d'urgence"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          )}
          <button
            className="header-settings-button"
            style={{ right: '55px', top: '40px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
            onClick={() => setShowSettings(true)}
            title="Paramètres"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          {onAdmin && (
            <button
              className="admin-button"
              style={{ right: '15px', top: '40px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
              onClick={user ? () => {
                // Déconnexion directe
                localStorage.removeItem('isAdmin');
                setUser(null);
                setIsAdmin(false);
                setIsEditing(false); // Désactiver le mode édition lors de la déconnexion
                if (onAdmin) onAdmin();
              } : () => setShowAdminModal(true)}
              title={user ? "Se déconnecter" : "Se connecter"}
            >
              {user ? (
                isAdmin ? (
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="9,17 4,12 9,7"/>
                    <line x1="20" y1="12" x2="4" y2="12"/>
                  </svg>
                ) : (
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )
              ) : (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10,17 15,12 10,7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      <SettingsMenu 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onLogin={handleAdminLogin}
      />
    </>
  );
}

export default Header; 