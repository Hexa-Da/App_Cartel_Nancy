/**
 * @fileoverview Popup de la charte HSE - Acceptation obligatoire au premier lancement
 */

import React, { useState } from 'react';
import './HSECharterPopup.css';

interface HSECharterPopupProps {
  onAccept: (braceletNumber: string) => void;
}

const HSECharterPopup: React.FC<HSECharterPopupProps> = ({ onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [braceletNumber, setBraceletNumber] = useState('');
  const [error, setError] = useState('');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = () => {
    if (!hasScrolledToBottom) {
      setError('Veuillez lire la charte en entier');
      return;
    }
    if (!braceletNumber.trim()) {
      setError('Veuillez saisir votre numéro de bracelet');
      return;
    }
    onAccept(braceletNumber.trim());
  };

  const canSubmit = hasScrolledToBottom && braceletNumber.trim().length > 0;

  return (
    <div className="hse-popup-overlay">
      <div className="hse-popup">
        <div className="hse-popup-header">
          <h2>Charte HSE</h2>
          <p className="hse-subtitle">Hygiène, Sécurité & Environnement</p>
        </div>

        <div className="hse-popup-content" onScroll={handleScroll}>
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
          </section>

          <section className="hse-section bracelet-section">
            <h3>Numéro de bracelet</h3>
            <p className="bracelet-info">
              Veuillez saisir votre numéro de bracelet pour valider la charte
            </p>
            <input
              type="text"
              className="bracelet-input"
              placeholder="Ex: 12345"
              value={braceletNumber}
              onChange={(e) => setBraceletNumber(e.target.value)}
            />
          </section>
        </div>

        <div className="hse-popup-footer">
          {error && <p className="hse-error">{error}</p>}
          <button 
            className={`hse-accept-button ${canSubmit ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {hasScrolledToBottom ? "Valider" : "Lisez jusqu'en bas"}
          </button>
          {!hasScrolledToBottom && <p className="hse-scroll-hint">Faites défiler pour lire toute la charte</p>}
        </div>
      </div>
    </div>
  );
};

export default HSECharterPopup;
