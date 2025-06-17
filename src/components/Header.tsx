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
  hasGenderMatches
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
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem'}}>
        {/* Bouton retour complètement à gauche */}
        <button
          className="header-back-button"
          onClick={onBack || (() => navigate(-1))}
          style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', marginRight: 0, marginLeft: -30, marginTop: 20 }}
          title="Retour"
        >
          ⬅️
        </button>
        {/* Espace central (titre ou vide) */}
        <div style={{ flex: 1 }}></div>
        {/* Boutons à droite : admin (collé à droite), puis paramètres, chat, urgence (ordre demandé, gap 10px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 10 }}>
          {isAdmin && onEditModeToggle && (
            <button
              className={`edit-button${isEditing ? ' active' : ''}`}
              onClick={onEditModeToggle}
              style={{ marginLeft: 0, marginTop: 10 }}
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
              style={{ padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: '#e74c3c', marginTop: 10 }}
            >
              🚨
            </button>
          )}
          {onChat && (
            <button
              className="chat-button"
              onClick={onChat}
              title="Messages de l'orga"
              style={{ padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, position: 'relative', marginTop: 10 }}
            >
              💬
              {unreadCount !== undefined && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: 18,
                  height: 18,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  zIndex: 10,
                  fontWeight: 700,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                }}
                >{unreadCount}</span>
              )}
            </button>
          )}
          <button
            className="header-settings-button"
            onClick={() => setShowSettings(true)}
            style={{ padding: 0, background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', marginLeft: 0, marginTop: 10 }}
            title="Paramètres"
          >
            <span role="img" aria-label="Paramètres">⚙️</span>
          </button>
          {onAdmin && (
            <button
              className="admin-button"
              onClick={onAdmin}
              title={user ? "Se déconnecter" : "Se connecter"}
              style={{ padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 0, marginTop: 10 }}
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
};

export default Header; 