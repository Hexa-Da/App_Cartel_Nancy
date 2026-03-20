/**
 * @fileoverview Popup de la charte HSE - Acceptation obligatoire au premier lancement
 */

import React, { useState, useEffect, useRef } from 'react';
import BraceletModal from './BraceletModal';
import HSECharterPopupContent from './HSECharterPopupContent';
import './HSECharterPopup.css';

interface HSECharterPopupProps {
  onAccept: (braceletNumber: string) => Promise<{ success: boolean; error?: string }>;
}

const HSECharterPopup: React.FC<HSECharterPopupProps> = ({ onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAcceptedEngagement, setHasAcceptedEngagement] = useState(false);
  const [braceletNumber, setBraceletNumber] = useState('');
  const [error, setError] = useState('');
  const [isBraceletModalOpen, setIsBraceletModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  // Scroll automatique vers le footer quand une erreur apparaît
  useEffect(() => {
    if (error && contentRef.current && footerRef.current) {
      const timeoutId = window.setTimeout(() => {
        if (contentRef.current) {
          // Scroller jusqu'en bas du contenu pour voir l'erreur dans le footer
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [error]);

  const handleBraceletSubmit = (number: string) => {
    setBraceletNumber(number);
    setIsBraceletModalOpen(false);
    setError('');
  };

  const handleSubmit = async () => {
    // Valider le bracelet dans Firebase avant de fermer
    setIsValidating(true);
    setError('');
    const result = await onAccept(braceletNumber.trim());
    setIsValidating(false);
    
    if (!result.success) {
      setError(result.error || 'Erreur lors de la validation du bracelet');
    }
  };

  const canSubmit = hasScrolledToBottom && hasAcceptedEngagement && braceletNumber.trim().length > 0 && !isValidating;

  return (
    <div className="hse-popup-overlay">
      <div className="hse-popup">
        <div className="hse-popup-header">
          <h2>Charte d'engagement</h2>
        </div>
        <div className="hse-popup-content" onScroll={handleScroll} ref={contentRef}>
          <HSECharterPopupContent
            hasAcceptedEngagement={hasAcceptedEngagement}
            onToggleEngagement={(next) => setHasAcceptedEngagement(next)}
            onOpenBraceletModal={() => setIsBraceletModalOpen(true)}
            braceletNumber={braceletNumber}
          />
        </div>

        <div className="hse-popup-footer" ref={footerRef}>
          {error && <p className="hse-error">{error}</p>}
          <button 
            className={`hse-accept-button ${canSubmit ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isValidating ? 'Validation...' : hasScrolledToBottom ? 'Valider' : "Lisez jusqu'en bas"}
          </button>
        </div>
      </div>

      <BraceletModal
        isOpen={isBraceletModalOpen}
        onClose={() => {
          setIsBraceletModalOpen(false);
          // Garder l'erreur affichée dans le footer même après fermeture du modal
        }}
        onSubmit={handleBraceletSubmit}
        error={error && isBraceletModalOpen ? error : undefined}
        initialValue={braceletNumber}
      />
    </div>
  );
};

export default HSECharterPopup;
