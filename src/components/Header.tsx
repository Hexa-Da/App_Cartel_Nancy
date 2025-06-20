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
          >
            ⬅️
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
          {onEmergency && (
            <button
              className="emergency-button"
              onClick={onEmergency}
              title="Contacts d'urgence"
            >
              🚨
            </button>
          )}
          {onChat && (
            <button
              className="chat-button"
              onClick={onChat}
              title="Messages de l'orga"
            >
              💬
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>
          )}
          <button
            className="header-settings-button"
            onClick={() => setShowSettings(true)}
            title="Paramètres"
          >
            <span role="img" aria-label="Paramètres">⚙️</span>
          </button>
          {onAdmin && (
            <button
              className="admin-button"
              onClick={onAdmin}
              title={user ? "Se déconnecter" : "Se connecter"}
            >
              {user ? (isAdmin ? "🔓" : "🔒") : "🔒"}
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