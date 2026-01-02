/**
 * @fileoverview Composant de la vue de carte Leaflet
 * 
 * Ce composant gère uniquement l'affichage de la carte Leaflet avec :
 * - MapContainer et TileLayer
 * - Composants enfants (LocationMarker, MapEvents, etc.)
 */

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ReactNode } from 'react';

interface MapViewProps {
  center: [number, number];
  zoom: number;
  mapRef: React.RefObject<L.Map | null>;
  mapStyle: string;
  children: ReactNode;
  onMapClick?: (e: { latlng: { lat: number; lng: number } }) => void;
  onZoomChange?: (zoom: number) => void;
}

const mapStyles = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  }
};

export const MapView: React.FC<MapViewProps> = ({
  center,
  zoom,
  mapRef,
  mapStyle,
  children,
  onMapClick,
  onZoomChange
}) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      ref={(map) => { mapRef.current = map || null; }}
      zoomControl={false}
    >
      <TileLayer
        url={mapStyles[mapStyle as keyof typeof mapStyles]?.url || mapStyles.default.url}
        attribution={mapStyles[mapStyle as keyof typeof mapStyles]?.attribution || mapStyles.default.attribution}
      />
      {children}
    </MapContainer>
  );
};

