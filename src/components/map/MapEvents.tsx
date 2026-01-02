/**
 * @fileoverview Composant pour gérer les événements de la carte
 * 
 * Ce composant :
 * - Écoute les clics sur la carte
 * - Transmet les événements au composant parent
 * 
 * Nécessaire car :
 * - Sépare la logique des événements de la carte du composant principal
 * - Facilite la réutilisation et la maintenance
 */

import { useMapEvents } from 'react-leaflet';

interface MapEventsProps {
  onMapClick: (e: { latlng: { lat: number; lng: number } }) => void;
}

export function MapEvents({ onMapClick }: MapEventsProps) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

