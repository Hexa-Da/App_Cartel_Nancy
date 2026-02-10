/**
 * @fileoverview Popup de la charte HSE - Acceptation obligatoire au premier lancement
 */

import React, { useState, useEffect, useRef } from 'react';
import BraceletModal from './BraceletModal';
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
      // Petit délai pour s'assurer que le DOM est mis à jour
      setTimeout(() => {
        if (contentRef.current) {
          // Scroller jusqu'en bas du contenu pour voir l'erreur dans le footer
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
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
          <h2>Charte HSE</h2>
          <p className="hse-subtitle">Hygiène, Sécurité & Environnement</p>
        </div>

        <div className="hse-popup-content" onScroll={handleScroll} ref={contentRef}>
          <section className="hse-section">
            <h3>Préambule</h3>
            <p>Bienvenue au CARTEL Nancy ! En validant cette charte, vous vous engagez à respecter les règles ci-dessous.</p>
          </section>

          <section className="hse-section">
            <h3>1. Hygiène</h3>
            <ul>
              <li><strong>Hydratation :</strong> Points d'eau disponibles sur tous les sites</li>
              <li><strong>Propreté :</strong> Utilisez les poubelles et triez vos déchets</li>
              <li><strong>Soins :</strong> Postes de secours identifiés sur la carte</li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>2. Sécurité</h3>
            <ul>
              <li><strong>Bracelet obligatoire :</strong> Gardez-le visible en permanence</li>
              <li><strong>Consignes :</strong> Suivez les instructions des organisateurs</li>
              <li><strong>Comportement :</strong> Violence et discrimination = exclusion immédiate</li>
              <li><strong>Alcool :</strong> Autorisé dans les espaces prévus (majeurs uniquement)</li>
              <li><strong>Objets interdits :</strong> Armes, objets dangereux, bouteilles en verre</li>
              <li><strong>Urgences :</strong>
                <ul className="emergency-list">
                  <li>SAMU : <strong>15</strong> | Police : <strong>17</strong> | Pompiers : <strong>18</strong> | Européen : <strong>112</strong></li>
                </ul>
              </li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>3. Environnement</h3>
            <ul>
              <li><strong>Tri sélectif :</strong> Respectez les consignes de tri</li>
              <li><strong>Transports :</strong> Privilégiez covoiturage et transports en commun</li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>4. Respect</h3>
            <ul>
              <li><strong>Inclusion :</strong> Toute discrimination est proscrite</li>
              <li><strong>Consentement :</strong> Respectez l'espace personnel de chacun</li>
              <li><strong>Safe Place :</strong> Espaces d'aide identifiés sur la carte</li>
            </ul>
          </section>

          <section className="hse-section hse-final">
            <h3>Engagement</h3>
            <p>En validant, je m'engage à respecter ces règles et signaler tout incident.</p>
            <div className="hse-checkbox-container">
              <input
                type="checkbox"
                id="hse-engagement-checkbox"
                className="hse-checkbox"
                checked={hasAcceptedEngagement}
                onChange={(e) => setHasAcceptedEngagement(e.target.checked)}
                aria-describedby="engagement-desc"
              />
              <label htmlFor="hse-engagement-checkbox" className="hse-checkbox-label" id="engagement-desc">
                J'accepte m'engage à respecter la charte HSE.
              </label>
            </div>
          </section>

          <section className="hse-section bracelet-section">
            <h3>Numéro de bracelet</h3>
            <p className="bracelet-info">
              Veuillez saisir votre numéro de bracelet pour valider la charte
            </p>
            <button
              type="button"
              className="bracelet-open-button"
              onClick={() => setIsBraceletModalOpen(true)}
            >
              {braceletNumber ? braceletNumber : 'Saisir le numéro de bracelet'}
            </button>
          </section>
        </div>

        <div className="hse-popup-footer" ref={footerRef}>
          {error && <p className="hse-error">{error}</p>}
          <button 
            className={`hse-accept-button ${canSubmit ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isValidating ? "Validation..." : hasScrolledToBottom ? "Valider" : "Lisez jusqu'en bas"}
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
