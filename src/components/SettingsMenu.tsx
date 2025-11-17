import React, { useEffect } from 'react';
import './SettingsMenu.css';
import NotificationService from '../services/NotificationService';
import { useApp } from '../AppContext';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationChange?: (enabled: boolean) => void;
}

// Fonction utilitaire pour obtenir la valeur initiale depuis localStorage
const getInitial = (key: string, defaultValue: any) => {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  if (typeof defaultValue === 'boolean') return stored === 'true';
  if (typeof defaultValue === 'number') return Number(stored);
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
  { value: 'Cross', label: '👟 Cross' },
  { value: 'Volleyball', label: '🏐 Volleyball' },
  { value: 'Ping-pong', label: '🏓 Ping-pong' },
  { value: 'Boxe', label: '🥊 Boxe' },
  { value: 'Athlétisme', label: '🏃‍♂️ Athlétisme' },
  { value: 'Spikeball', label: '⚡️ Spikeball' },
  { value: 'Escalade', label: '🧗‍♂️ Escalade' },
];

const hotelOptions = [
  { value: '0000', label: 'Aucun' },
  { value: 'none', label: 'Tous les hôtels' },
  { value: '1', label: 'Ibis Styles Nancy Sud' },
  { value: '2', label: 'Nemea Home Suite Nancy Centre' },
  { value: '3', label: 'Nemea Grand Coeur Nancy Centre' },
  { value: '4', label: 'Hotel Ibis Nancy Brabois' },
  { value: '5', label: 'Hotel Residome Nancy' },
  { value: '6', label: 'Ibis Budget Nancy Laxou' },
  { value: '7', label: 'Hotel Revotel Nancy Centre' },
  { value: '8', label: 'Hotel Cerise Nancy' }
];

const restaurantOptions = [
  { value: 'none', label: 'Tous les restaurants' },
  { value: '1', label: 'Crous ARTEM' },
  { value: '2', label: 'Parc Saint-Marie' }
];

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onLocationChange }) => {
  const { getAllDelegations, hasGenderMatches } = useApp();
  // Thème
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === null) {
      // Si aucune préférence n'est stockée, on met le thème sombre par défaut
      localStorage.setItem('theme', 'true');
      document.documentElement.setAttribute('data-theme', 'dark');
      return true;
    }
    const isDark = stored === 'true';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });
  // Notifications
  const [notifications, setNotifications] = React.useState(() => getInitial('notifications', true));
  // Localisation
  const [shareLocation, setShareLocation] = React.useState(() => getInitial('location', true));

  // Sport préféré
  const [favoriteSports, setFavoriteSports] = React.useState<string[]>(() => {
    const stored = localStorage.getItem('preferredSport');
    if (!stored) {
      // Si aucune préférence n'est stockée, on met "Tous les sports" par défaut
      localStorage.setItem('preferredSport', JSON.stringify(['none']));
      return ['none'];
    }
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // En cas d'erreur de parsing, on met "Tous les sports" par défaut
      localStorage.setItem('preferredSport', JSON.stringify(['none']));
      return ['none'];
    }
  });
  // Championnat préféré
  const [preferredChampionship, setPreferredChampionship] = React.useState<string[]>(() => {
    const stored = localStorage.getItem('preferredChampionship');
    if (!stored) return ['none'];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [stored];
    }
  });
  // Délégation préférée
  const [preferredDelegation, setPreferredDelegation] = React.useState(() => getInitial('preferredDelegation', 'all'));
  // Hôtel préféré
  const [preferredHotel, setPreferredHotel] = React.useState(() => getInitial('preferredHotel', 'none'));
  // Restaurant préféré
  const [preferredRestaurant, setPreferredRestaurant] = React.useState(() => getInitial('preferredRestaurant', 'none'));

  const notificationService = NotificationService.getInstance();

  // Gérer le changement d'état des notifications
  const handleNotificationChange = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setNotifications(true);
        handlePreferenceChange('notifications', 'true');
      } else {
        setNotifications(false);
        handlePreferenceChange('notifications', 'false');
        alert('Les notifications ont été refusées. Veuillez les activer dans les paramètres de votre appareil.');
      }
    } else {
      setNotifications(false);
      handlePreferenceChange('notifications', 'false');
    }
  };

  // Gérer le changement de thème
  const handleThemeChange = (enabled: boolean) => {
    setIsDarkMode(enabled);
    handlePreferenceChange('theme', enabled ? 'true' : 'false');
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  };

  // Gérer le changement de localisation
  const handleLocationChange = (enabled: boolean) => {
    setShareLocation(enabled);
    handlePreferenceChange('location', enabled ? 'true' : 'false');
    if (onLocationChange) {
      onLocationChange(enabled);
    }
  };



  // Gérer le changement de sport
  const handleSportChange = (sport: string) => {
    const newFavoriteSports = sport === 'none' ? [] : [sport];
    setFavoriteSports(newFavoriteSports);
    handlePreferenceChange('preferredSport', JSON.stringify(newFavoriteSports));
    
    // Réinitialiser le championnat si le sport change
    if (sport === 'none') {
      setPreferredChampionship(['none']);
      handlePreferenceChange('preferredChampionship', JSON.stringify(['none']));
    }
  };

  // Gérer le changement de championnat
  const handleChampionshipChange = (championship: string) => {
    const newChampionships = championship === 'none' ? ['none'] : [championship];
    setPreferredChampionship(newChampionships);
    handlePreferenceChange('preferredChampionship', JSON.stringify(newChampionships));
  };

  // Gérer le changement de délégation
  const handleDelegationChange = (delegation: string) => {
    setPreferredDelegation(delegation);
    handlePreferenceChange('preferredDelegation', delegation);
  };

  // Gérer le changement d'hôtel
  const handleHotelChange = (hotel: string) => {
    setPreferredHotel(hotel);
    handlePreferenceChange('preferredHotel', hotel);
  };

  // Gérer le changement de restaurant
  const handleRestaurantChange = (restaurant: string) => {
    setPreferredRestaurant(restaurant);
    handlePreferenceChange('preferredRestaurant', restaurant);
  };

  // Fonction générique pour gérer les changements de préférences
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

  // Écouter les changements de préférences dans le localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue !== null) {
        setIsDarkMode(e.newValue === 'true');
        document.documentElement.setAttribute('data-theme', e.newValue === 'true' ? 'dark' : 'light');
      }
      if (e.key === 'notifications' && e.newValue !== null) {
        setNotifications(e.newValue === 'true');
      }
      if (e.key === 'location' && e.newValue !== null) {
        setShareLocation(e.newValue === 'true');
        if (onLocationChange) {
          onLocationChange(e.newValue === 'true');
        }
      }

      if (e.key === 'preferredSport' && e.newValue !== null) {
        setFavoriteSports(JSON.parse(e.newValue));
      }
      if (e.key === 'preferredChampionship' && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          setPreferredChampionship(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setPreferredChampionship([e.newValue]);
        }
      }
      if (e.key === 'preferredDelegation' && e.newValue !== null) {
        setPreferredDelegation(e.newValue);
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
  }, [onLocationChange]);

  // Écouter les changements de préférences dans le même onglet
  useEffect(() => {
    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'theme') {
        setIsDarkMode(e.detail.value === 'true');
        document.documentElement.setAttribute('data-theme', e.detail.value === 'true' ? 'dark' : 'light');
      }
      if (e.detail.key === 'notifications') {
        setNotifications(e.detail.value === 'true');
      }
      if (e.detail.key === 'location') {
        setShareLocation(e.detail.value === 'true');
        if (onLocationChange) {
          onLocationChange(e.detail.value === 'true');
        }
      }

      if (e.detail.key === 'preferredSport') {
        setFavoriteSports(JSON.parse(e.detail.value));
      }
      if (e.detail.key === 'preferredChampionship') {
        try {
          const parsed = JSON.parse(e.detail.value);
          setPreferredChampionship(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setPreferredChampionship([e.detail.value]);
        }
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
  }, [onLocationChange]);

  if (!isOpen) return null;

  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div className="settings-menu" onClick={e => e.stopPropagation()}>
        <div className="settings-menu-header">
          <h3>Paramètres</h3>
          <button 
            className="close-button" 
            onClick={onClose}
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
                onChange={(e) => handleThemeChange(e.target.checked)}
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
                onChange={(e) => handleNotificationChange(e.target.checked)}
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
                onChange={(e) => handleLocationChange(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-item">
            <label htmlFor="preferred-sport">Votre Sport</label>
            <select 
              id="preferred-sport" 
              className="settings-select" 
              value={favoriteSports[0] || 'none'} 
              onChange={e => handleSportChange(e.target.value)}
            >
              {sportOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {favoriteSports[0] && favoriteSports[0] !== 'none' && (() => {
            const { hasFemale, hasMale, hasMixed } = hasGenderMatches(favoriteSports[0]);
            if (!hasFemale && !hasMale && !hasMixed) return null;
            return (
              <div className="settings-item">
                <label htmlFor="preferred-championship">Votre Championnat</label>
                <select 
                  id="preferred-championship" 
                  className="settings-select" 
                  value={preferredChampionship[0] || 'none'} 
                  onChange={e => handleChampionshipChange(e.target.value)}
                >
                  <option value="none">Tous les championnats</option>
                  {hasFemale && <option value="female">Féminin</option>}
                  {hasMale && <option value="male">Masculin</option>}
                  {hasMixed && <option value="mixed">Mixte</option>}
                </select>
              </div>
            );
          })()}
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