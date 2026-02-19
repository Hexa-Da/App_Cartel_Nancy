/**
 * @fileoverview Popup de pub affichée au démarrage de l'application
 */

import React, { useState } from 'react';
import { LaunchPopup as LaunchPopupType } from '../types';
import './LaunchPopup.css';

interface LaunchPopupProps {
  popup: LaunchPopupType;
  onClose: () => void;
}

const LaunchPopup: React.FC<LaunchPopupProps> = ({ popup, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="launch-popup-overlay" onClick={onClose}>
      <div className="launch-popup" onClick={(e) => e.stopPropagation()}>
        <div className="launch-popup-header">
          <h2>{popup.title}</h2>
          <button
            type="button"
            className="launch-popup-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="launch-popup-content">
          {!imageLoaded && (
            <div className="launch-popup-spinner-container">
              <div className="launch-popup-spinner" />
            </div>
          )}
          <img
            src={popup.image}
            alt={popup.title}
            className="launch-popup-image"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default LaunchPopup;
