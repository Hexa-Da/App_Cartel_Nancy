import React from 'react';
import './SettingsMenu.css';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationChange?: (enabled: boolean) => void;
  getAllDelegations: () => string[];
}

const getInitial = (key: string, fallback: any) => {
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  if (typeof fallback === 'boolean') return stored === 'true';
  return stored;
};

const sportOptions = [
  { value: 'none', label: 'Aucun' },
  { value: 'all', label: 'Tous les événements' },
  { value: 'party', label: 'Soirée et Défilé ⭐' },
  { value: 'Football', label: 'Football ⚽' },
  { value: 'Basketball', label: 'Basketball 🏀' },
  { value: 'Handball', label: 'Handball 🤾' },
  { value: 'Rugby', label: 'Rugby 🏉' },
  { value: 'Volleyball', label: 'Volleyball 🏐' },
  { value: 'Tennis', label: 'Tennis 🎾' },
  { value: 'Badminton', label: 'Badminton 🏸' },
  { value: 'Ping-pong', label: 'Ping-pong 🏓' },
  { value: 'Ultimate', label: 'Ultimate 🥏' },
  { value: 'Natation', label: 'Natation 🏊' },
  { value: 'Cross', label: 'Cross 🏃' },
  { value: 'Boxe', label: 'Boxe 🥊' },
  { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
  { value: 'Pétanque', label: 'Pétanque 🍹' },
  { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
  { value: 'Jeux de société', label: 'Jeux de société 🎲' },
];

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onLocationChange, getAllDelegations }) => {
  // Thème
  const [isDarkMode, setIsDarkMode] = React.useState(() => getInitial('theme', window.matchMedia('(prefers-color-scheme: dark)').matches));
  // Notifications
  const [notifications, setNotifications] = React.useState(() => getInitial('notifications', true));
  // Localisation
  const [shareLocation, setShareLocation] = React.useState(() => getInitial('location', true));
  // Langue
  const [language, setLanguage] = React.useState(() => getInitial('language', 'fr'));
  // Sport préféré
  const [preferredSport, setPreferredSport] = React.useState(() => getInitial('preferredSport', 'all'));
  // Délégation préférée
  const [preferredDelegation, setPreferredDelegation] = React.useState(() => getInitial('preferredDelegation', 'all'));

  // Appliquer le thème à chaque changement
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'true' : 'false');
  }, [isDarkMode]);

  // Notifications
  React.useEffect(() => {
    localStorage.setItem('notifications', notifications ? 'true' : 'false');
    // Ici, on pourrait demander la permission de notification si notifications passe à true
    // if (notifications && 'Notification' in window) Notification.requestPermission();
  }, [notifications]);

  // Localisation
  React.useEffect(() => {
    localStorage.setItem('location', shareLocation ? 'true' : 'false');
    if (onLocationChange) {
      onLocationChange(shareLocation);
    }
    // Déclencher un événement de stockage pour notifier les autres composants
    const event = new StorageEvent('storage', {
      key: 'location',
      newValue: shareLocation ? 'true' : 'false',
      oldValue: shareLocation ? 'false' : 'true',
      storageArea: localStorage
    });
    window.dispatchEvent(event);
  }, [shareLocation, onLocationChange]);

  // Langue
  React.useEffect(() => {
    localStorage.setItem('language', language);
    // Ici, on pourrait déclencher un changement de langue global si l'app est i18n
  }, [language]);

  // Sport préféré
  React.useEffect(() => {
    localStorage.setItem('preferredSport', preferredSport);
  }, [preferredSport]);

  // Délégation préférée
  React.useEffect(() => {
    localStorage.setItem('preferredDelegation', preferredDelegation);
  }, [preferredDelegation]);

  if (!isOpen) return null;

  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div className="settings-menu" onClick={e => e.stopPropagation()}>
        <div className="settings-menu-header">
          <h3>Paramètres</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            style={{ 
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-color)',
              position: 'absolute',
              right: '0.5rem',
              top: '0.5rem',
              padding: '0.5rem',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>
        <div className="settings-menu-content">
          <div className="settings-item">
            <label htmlFor="theme-toggle">Thème sombre</label>
            <label className="switch">
              <input
                type="checkbox"
                id="theme-toggle"
                checked={isDarkMode}
                onChange={() => setIsDarkMode((v: boolean) => !v)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="settings-item">
            <label htmlFor="notifications">Notifications</label>
            <label className="switch">
              <input
                type="checkbox"
                id="notifications"
                checked={notifications}
                onChange={() => setNotifications((v: boolean) => !v)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="settings-item">
            <label htmlFor="location">Localisation</label>
            <label className="switch">
              <input
                type="checkbox"
                id="location"
                checked={shareLocation}
                onChange={() => setShareLocation((v: boolean) => !v)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="settings-item">
            <label htmlFor="language">Langue</label>
            <select id="language" className="settings-select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="settings-item">
            <label htmlFor="preferred-sport">Votre Sport</label>
            <select 
              id="preferred-sport" 
              className="settings-select" 
              value={preferredSport} 
              onChange={e => setPreferredSport(e.target.value)}
            >
              {sportOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-item">
            <label htmlFor="preferred-delegation">Votre Délégation</label>
            <select 
              id="preferred-delegation" 
              className="settings-select" 
              value={preferredDelegation} 
              onChange={e => setPreferredDelegation(e.target.value)}
            >
              <option value="all">Toutes les délégations</option>
              {getAllDelegations().map(delegation => (
                <option key={delegation} value={delegation}>
                  {delegation}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu; 