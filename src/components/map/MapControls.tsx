/**
 * @fileoverview Contrôles de la carte (zoom, filtres, boutons)
 */

import { ReactNode } from 'react';

interface MapControlsProps {
  mapRef: React.RefObject<L.Map | null>;
  isEditing: boolean;
  isAdmin: boolean;
  onAddVenue: () => void;
  children?: ReactNode;
}

export const MapControls: React.FC<MapControlsProps> = ({
  mapRef,
  isEditing,
  isAdmin,
  onAddVenue,
  children
}) => {
  return (
    <div className="leaflet-control-container">
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control-zoom leaflet-bar leaflet-control">
          <a
            className="leaflet-control-zoom-in"
            href="#"
            title="Zoom in"
            role="button"
            aria-label="Zoom in"
            onClick={(e) => {
              e.preventDefault();
              mapRef.current?.zoomIn();
            }}
          >
            +
          </a>
          <a
            className="leaflet-control-zoom-out"
            href="#"
            title="Zoom out"
            role="button"
            aria-label="Zoom out"
            onClick={(e) => {
              e.preventDefault();
              mapRef.current?.zoomOut();
            }}
          >
            −
          </a>
        </div>
        {isEditing && isAdmin && (
          <button
            className="add-venue-button"
            onClick={onAddVenue}
            title="Ajouter un lieu"
          >
            +
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

