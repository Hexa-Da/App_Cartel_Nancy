/**
 * @fileoverview Popup de pub affichée au démarrage de l'application
 */

import React, { useEffect, useState } from 'react';
import { LaunchPopup as LaunchPopupType } from '../types';
import './LaunchPopup.css';

interface LaunchPopupProps {
  popup: LaunchPopupType;
  onClose: () => void;
}

const getVideoMimeType = (url: string): string => {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.webm')) return 'video/webm';
  if (cleanUrl.endsWith('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
};

const LaunchPopup: React.FC<LaunchPopupProps> = ({ popup, onClose }) => {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const isVideo = Boolean(popup.video);
  const mediaUrl = popup.video || popup.image;

  useEffect(() => {
    setMediaLoaded(false);
  }, [mediaUrl]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // On Android/WebView, video controls can emit synthetic clicks.
    // Close only when user really taps the backdrop and media is not a video.
    if (event.target !== event.currentTarget) {
      return;
    }
    if (isVideo) {
      return;
    }
    onClose();
  };

  return (
    <div className="launch-popup-overlay" onClick={handleOverlayClick}>
      <div
        className="launch-popup"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
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
          {!mediaLoaded && mediaUrl && (
            <div className="launch-popup-spinner-container">
              <div className="launch-popup-spinner" />
            </div>
          )}
          {!mediaUrl ? null : isVideo ? (
            <video
              className="launch-popup-video"
              controls
              playsInline
              preload="metadata"
              x-webkit-airplay="allow"
              onLoadedMetadata={() => setMediaLoaded(true)}
              onCanPlay={() => setMediaLoaded(true)}
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaLoaded(true)}
            >
              <source src={mediaUrl} type={getVideoMimeType(mediaUrl)} />
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt={popup.title}
              className="launch-popup-image"
              onLoad={() => setMediaLoaded(true)}
              onError={() => setMediaLoaded(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LaunchPopup;
