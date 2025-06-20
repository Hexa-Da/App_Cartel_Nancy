import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase';
import SettingsMenu from './SettingsMenu';

interface HeaderProps {
  onChat?: () => void;
  onEmergency?: () => void;
  onAdmin?: () => void;
  isAdmin?: boolean;
  user?: any;
  showChat?: boolean;
  unreadCount?: number;
  onBack?: () => void;
  onEditModeToggle?: () => void;
  isEditing?: boolean;
  getAllDelegations: () => string[];
  hasGenderMatches: (sport: string) => { hasFemale: boolean, hasMale: boolean, hasMixed: boolean };
  isBackDisabled?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onChat,
  onEmergency,
  onAdmin,
  isAdmin,
  user,
  showChat,
  unreadCount,
  onBack,
  onEditModeToggle,
  isEditing,
  getAllDelegations,
  hasGenderMatches,
  isBackDisabled
}) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  return (
    <>
      <div className="app-header">
        <div className="header-left">
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
        </div>
        
        <div className="header-right">
          {isAdmin && onEditModeToggle && (
            <button
              className={`edit-button${isEditing ? ' active' : ''}`}
              onClick={onEditModeToggle}
              style={{
                backgroundColor: isEditing ? 'var(--danger-color)' : 'var(--warning-color)',
                padding: '0.2rem 0.5rem', color: 'white'
              }}
              title={isEditing ? 'Quitter le mode édition' : 'Activer le mode édition'}
            >
              {isEditing ? 'Terminer' : 'Editer'}
            </button>
          )}
          {onChat && (
            <button
              className={`chat-button${showChat ? ' active' : ''}`}
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
              onClick={onAdmin}
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
        getAllDelegations={getAllDelegations}
        hasGenderMatches={hasGenderMatches}
      />
    </>
  );
}

export default Header; 