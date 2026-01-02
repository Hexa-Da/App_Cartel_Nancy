/**
 * @fileoverview Hook personnalisé pour gérer l'état de la carte
 * 
 * Ce hook centralise la gestion de l'état de la carte :
 * - Style de la carte (osm, cyclosm, etc.)
 * - Niveau de zoom actuel
 * - Références aux marqueurs
 * - Actions de mise à jour des marqueurs
 * 
 * Nécessaire car :
 * - Sépare la logique de l'état de la carte du composant principal
 * - Facilite la réutilisation et les tests
 * - Améliore la lisibilité du code
 */

import { useState, useRef, useCallback } from 'react';
import { Map } from 'leaflet';
import L from 'leaflet';

export interface MapStyles {
  [key: string]: {
    url: string;
    attribution: string;
  };
}

export const mapStyles: MapStyles = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  cyclosm: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  osmfr: {
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
};

export const useMapState = () => {
  const [mapStyle, setMapStyle] = useState('osm');
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const indicationMarkersRef = useRef<L.Marker[]>([]);
  const [appAction, setAppAction] = useState(0);

  const triggerMarkerUpdate = useCallback((updateMapMarkers: () => void) => {
    setAppAction(prev => prev + 1);
    if (mapRef.current) {
      updateMapMarkers();
    }
  }, []);

  return {
    mapStyle,
    setMapStyle,
    currentZoom,
    setCurrentZoom,
    mapRef,
    markersRef,
    indicationMarkersRef,
    appAction,
    triggerMarkerUpdate
  };
};

