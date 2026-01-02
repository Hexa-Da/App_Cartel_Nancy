/**
 * @fileoverview Composant pour afficher et gérer la position de l'utilisateur sur la carte
 * 
 * Ce composant :
 * - Affiche un marqueur à la position de l'utilisateur
 * - Gère la géolocalisation via le hook useLocationTracking
 * - Affiche les états de chargement et d'erreur
 * - Fournit un bouton pour recentrer la carte sur la position
 * 
 * Nécessaire car :
 * - Sépare la logique de géolocalisation du composant principal
 * - Facilite la réutilisation et la maintenance
 */

import { Marker } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const UserIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'user-location-icon'
});

export function LocationMarker() {
  const map = useMap();
  const { position, error, isLoading, requestLocation, disableLocation } = useLocationTracking();

  const handleRecenter = () => {
    if (position) {
      map.flyTo(position, 16, {
        duration: 1.5
      });
    } else {
      requestLocation();
    }
  };

  if (isLoading) {
    return (
      <div className="location-loading">
        <div className="location-loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="location-error">
        <p>{error}</p>
        <div className="location-error-buttons">
          <button 
            className="retry-button" 
            onClick={() => {
              requestLocation();
            }}
          >
            Réessayer
          </button>
          <button 
            className="retry-button" 
            onClick={disableLocation}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {position === null ? null : (
        <>
          <Marker position={position} icon={UserIcon} interactive={false} />
          <button className="recenter-button" onClick={handleRecenter} title="Me localiser">
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
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </button>
        </>
      )}
    </>
  );
}

