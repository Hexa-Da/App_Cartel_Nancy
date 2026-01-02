/**
 * @fileoverview Composant pour écouter les changements de zoom de la carte
 * 
 * Ce composant :
 * - Écoute les changements de niveau de zoom
 * - Notifie le composant parent des changements
 * 
 * Nécessaire car :
 * - Sépare la logique de zoom du composant principal
 * - Facilite la réutilisation et la maintenance
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface ZoomListenerProps {
  onZoomChange: (zoom: number) => void;
}

export function ZoomListener({ onZoomChange }: ZoomListenerProps) {
  const map = useMap();
  
  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
    };
    
    // Écouter les événements de zoom
    map.on('zoomend', handleZoom);
    // Initialiser avec le zoom actuel
    handleZoom();
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  
  return null;
}

