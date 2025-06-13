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
  { value: 'none', label: 'Tous les sports' },
  { value: 'Football', label: '⚽ Football' },
  { value: 'Basketball', label: '🏀 Basketball' },
  { value: 'Handball', label: '🤾 Handball' },
  { value: 'Rugby', label: '🏉 Rugby' },
  { value: 'Ultimate', label: '🥏 Ultimate' },
  { value: 'Natation', label: '🏊 Natation' },
  { value: 'Badminton', label: '🏸 Badminton' },
  { value: 'Tennis', label: '🎾 Tennis' },
  { value: 'Cross', label: '🏃 Cross' },
  { value: 'Volleyball', label: '🏐 Volleyball' },
  { value: 'Ping-pong', label: '🏓 Ping-pong' },
  { value: 'Boxe', label: '🥊 Boxe' },
  { value: 'Athlétisme', label: '🏃‍♂️ Athlétisme' },
  { value: 'Pétanque', label: '🍹 Pétanque' },
  { value: 'Escalade', label: '🧗‍♂️ Escalade' },
  { value: 'Jeux de société', label: '🎲 Jeux de société' }
];

const hotelOptions = [
  { value: 'none', label: 'Tous les hôtels' },
  { value: '1', label: 'ibis budget Nancy Porte Sud' },
  { value: '2', label: 'KYRIAD DIRECT NANCY SUD - Vandoeuvre' }
];

const restaurantOptions = [
  { value: 'none', label: 'Tous les restaurants' },
  { value: '1', label: 'Crous ARTEM' },
  { value: '2', label: 'Parc Saint-Marie' }
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
  // Hôtel préféré
  const [preferredHotel, setPreferredHotel] = React.useState(() => getInitial('preferredHotel', 'none'));
  // Restaurant préféré
  const [preferredRestaurant, setPreferredRestaurant] = React.useState(() => getInitial('preferredRestaurant', 'none'));

  // Écouter les changements de préférences dans le localStorage
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredDelegation' && e.newValue !== null) {
        setPreferredDelegation(e.newValue);
      }
      if (e.key === 'preferredSport' && e.newValue !== null) {
        setPreferredSport(e.newValue);
      }
      if (e.key === 'preferredHotel' && e.newValue !== null) {
        setPreferredHotel(e.newValue);
      }
      if (e.key === 'preferredRestaurant' && e.newValue !== null) {
        setPreferredRestaurant(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Écouter les changements de préférences dans le même onglet
  React.useEffect(() => {
    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'preferredSport') {
        setPreferredSport(e.detail.value);
      }
      if (e.detail.key === 'preferredDelegation') {
        setPreferredDelegation(e.detail.value);
      }
      if (e.detail.key === 'preferredHotel') {
        setPreferredHotel(e.detail.value);
      }
      if (e.detail.key === 'preferredRestaurant') {
        setPreferredRestaurant(e.detail.value);
      }
    };

    window.addEventListener('preferenceChange', handlePreferenceChange as EventListener);
    return () => window.removeEventListener('preferenceChange', handlePreferenceChange as EventListener);
  }, []);

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

  const handlePreferenceChange = (key: string, value: string) => {
    localStorage.setItem(key, value);
    // Déclencher un événement de stockage pour synchroniser les autres onglets
    const storageEvent = new StorageEvent('storage', {
      key,
      newValue: value,
      oldValue: localStorage.getItem(key),
      storageArea: localStorage
    });
    window.dispatchEvent(storageEvent);

    // Déclencher un événement personnalisé pour la synchronisation dans le même onglet
    const customEvent = new CustomEvent('preferenceChange', {
      detail: {
        key,
        value
      }
    });
    window.dispatchEvent(customEvent);
  };

  const handleSportChange = (sport: string) => {
    setPreferredSport(sport);
    handlePreferenceChange('preferredSport', sport);
  };

  const handleDelegationChange = (delegation: string) => {
    setPreferredDelegation(delegation);
    handlePreferenceChange('preferredDelegation', delegation);
  };

  const handleHotelChange = (hotel: string) => {
    setPreferredHotel(hotel);
    handlePreferenceChange('preferredHotel', hotel);
  };

  const handleRestaurantChange = (restaurant: string) => {
    setPreferredRestaurant(restaurant);
    handlePreferenceChange('preferredRestaurant', restaurant);
  };

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
              onChange={e => handleSportChange(e.target.value)}
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
              onChange={e => handleDelegationChange(e.target.value)}
            >
              <option value="all">Toutes les délégations</option>
              {getAllDelegations().map(delegation => (
                <option key={delegation} value={delegation}>
                  {delegation}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-item">
            <label htmlFor="preferred-hotel">Votre Hôtel</label>
            <select 
              id="preferred-hotel" 
              className="settings-select" 
              value={preferredHotel} 
              onChange={e => handleHotelChange(e.target.value)}
            >
              {hotelOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-item">
            <label htmlFor="preferred-restaurant">Votre Restaurant</label>
            <select 
              id="preferred-restaurant" 
              className="settings-select" 
              value={preferredRestaurant} 
              onChange={e => handleRestaurantChange(e.target.value)}
            >
              {restaurantOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
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