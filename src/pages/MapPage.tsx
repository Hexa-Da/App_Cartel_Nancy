/**
 * @fileoverview Page principale de la carte - Orchestre tous les composants et hooks
 * 
 * Cette page :
 * - Utilise les hooks custom (useMapState, useEventFilters, useLocationTracking)
 * - Utilise les composants extraits (LocationMarker, MapEvents, ZoomListener)
 * - Contient la logique principale de la carte
 * 
 * Nécessaire car :
 * - Sépare la logique de la carte du composant App.tsx
 * - Facilite la maintenance et les tests
 * - Améliore la lisibilité du code
 */

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapState, mapStyles } from '../hooks/useMapState';
import { useEventFilters } from '../hooks/useEventFilters';
import { LocationMarker } from '../components/map/LocationMarker';
import { MapEvents } from '../components/map/MapEvents';
import { ZoomListener } from '../components/map/ZoomListener';
import BusLines from '../components/BusLines';
import { useNavigation } from '../contexts/NavigationContext';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Note: Cette page est une version simplifiée qui utilise les hooks et composants extraits.
// La logique complète reste dans App.tsx pour l'instant.
// Pour réduire App.tsx à ~500 lignes, il faudrait déplacer toute la logique métier ici.

export default function MapPage() {
  const { mapStyle, setMapStyle, currentZoom, setCurrentZoom, mapRef, markersRef, indicationMarkersRef, triggerMarkerUpdate } = useMapState();
  const { eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed } = useEventFilters();
  const { activeTab, setActiveTab } = useNavigation();
  const location = useLocation();

  const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
    // Logique de gestion des clics sur la carte
    console.log('Map clicked at:', e.latlng);
  };

  const handleTabChange = (tab: string) => {
    ReactGA.event({
      category: 'navigation',
      action: 'change_tab',
      label: tab
    });
    setActiveTab(tab as any);
  };

  return (
    <div className="page-content no-scroll map-container" style={{ marginTop: 0, paddingTop: 0 }}>
      <MapContainer
        center={[48.686881, 6.1880492]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => { mapRef.current = map || null; }}
        zoomControl={false}
      >
        <TileLayer
          url={mapStyles[mapStyle as keyof typeof mapStyles].url}
          attribution={mapStyles[mapStyle as keyof typeof mapStyles].attribution}
        />
        <LocationMarker />
        <MapEvents onMapClick={handleMapClick} />
        <ZoomListener onZoomChange={(zoom) => {
          setCurrentZoom(zoom);
          // Mettre à jour la visibilité des marqueurs d'indication
          indicationMarkersRef.current.forEach(marker => {
            if (zoom >= 17) {
              if (mapRef.current && !mapRef.current.hasLayer(marker)) {
                marker.addTo(mapRef.current);
              }
            } else {
              if (mapRef.current && mapRef.current.hasLayer(marker)) {
                marker.remove();
              }
            }
          });
        }} />
        <BusLines visibleLines={['T1', 'T5', 'T4', 'T2', 'T3']} />
        <div className="leaflet-control-container">
          <div className="leaflet-top leaflet-right">
            <div className="leaflet-control-zoom leaflet-bar leaflet-control">
              <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in" onClick={(e) => {
                e.preventDefault();
                mapRef.current?.zoomIn();
              }}>+</a>
              <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out" onClick={(e) => {
                e.preventDefault();
                mapRef.current?.zoomOut();
              }}>−</a>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
}

