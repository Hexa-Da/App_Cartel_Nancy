/**
 * @fileoverview Popup de la charte HSE (Hygiène, Sécurité, Environnement)
 * 
 * Ce composant affiche :
 * - La charte HSE complète à la première ouverture de l'application
 * - Un champ pour saisir le numéro de bracelet de l'utilisateur
 * - Validation du numéro contre la base de données Firebase
 * - Stocke l'acceptation dans le localStorage
 */

import React, { useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import './HSECharterPopup.css';

interface HSECharterPopupProps {
  onAccept: (braceletNumber: string) => void;
}

const HSECharterPopup: React.FC<HSECharterPopupProps> = ({ onAccept }) => {
  const [braceletNumber, setBraceletNumber] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.target as HTMLDivElement;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const validateBraceletNumber = async (number: string): Promise<boolean> => {
    try {
      const participantRef = ref(database, `participants/${number}`);
      const snapshot = await get(participantRef);
      return snapshot.exists();
    } catch (error) {
      console.error('Erreur lors de la validation du bracelet:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!braceletNumber.trim()) {
      setError('Veuillez saisir votre numéro de bracelet');
      return;
    }
    if (!hasScrolledToBottom) {
      setError('Veuillez lire la charte HSE en entier avant de valider');
      return;
    }

    setIsValidating(true);
    setError('');

    const isValid = await validateBraceletNumber(braceletNumber.trim());

    if (!isValid) {
      setError('Numéro de bracelet invalide. Vérifiez votre numéro et réessayez.');
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    onAccept(braceletNumber.trim());
  };

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
            <p>
              Bienvenue au CARTEL Nancy ! Cette charte a pour objectif de garantir la sécurité 
              et le bien-être de tous les participants pendant l'événement. En validant cette 
              charte, vous vous engagez à respecter l'ensemble des règles énoncées ci-dessous.
            </p>
          </section>

          <section className="hse-section">
            <h3>1. Hygiène</h3>
            <ul>
              <li><strong>Hydratation :</strong> Pensez à vous hydrater régulièrement, surtout lors des efforts physiques. Des points d'eau potable sont disponibles sur l'ensemble des sites.</li>
              <li><strong>Alimentation :</strong> Des espaces de restauration sont prévus. Évitez de consommer des aliments en dehors des zones dédiées.</li>
              <li><strong>Propreté des lieux :</strong> Utilisez les poubelles mises à disposition et triez vos déchets. Respectez les espaces communs.</li>
              <li><strong>Sanitaires :</strong> Des toilettes sont accessibles sur tous les sites. Merci de les maintenir propres pour le confort de tous.</li>
              <li><strong>Soins médicaux :</strong> En cas de besoin, des postes de secours sont identifiés sur la carte de l'application. N'hésitez pas à vous y rendre ou à alerter un organisateur.</li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>2. Sécurité</h3>
            <ul>
              <li><strong>Port du bracelet obligatoire :</strong> Votre bracelet est votre pass pour accéder aux différentes zones. Ne le perdez pas et gardez-le visible en permanence.</li>
              <li><strong>Respect des consignes :</strong> Suivez les instructions des organisateurs et des équipes de sécurité. En cas d'évacuation, restez calmes et suivez les indications.</li>
              <li><strong>Comportement responsable :</strong> Tout comportement violent, discriminatoire ou dangereux entraînera une exclusion immédiate de l'événement.</li>
              <li><strong>Alcool et substances :</strong> La consommation d'alcool est autorisée dans les espaces prévus à cet effet et pour les personnes majeures uniquement. Toute substance illicite est strictement interdite.</li>
              <li><strong>Objets interdits :</strong> Les objets dangereux (armes, objets contondants, bouteilles en verre...) sont interdits sur l'ensemble des sites.</li>
              <li><strong>Numéros d'urgence :</strong> 
                <ul className="emergency-list">
                  <li>SAMU : <strong>15</strong></li>
                  <li>Police/Gendarmerie : <strong>17</strong></li>
                  <li>Pompiers : <strong>18</strong></li>
                  <li>Numéro d'urgence européen : <strong>112</strong></li>
                  <li>Référent sécurité CARTEL : consultez l'application</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>3. Environnement</h3>
            <ul>
              <li><strong>Éco-responsabilité :</strong> Le CARTEL s'engage dans une démarche éco-responsable. Nous vous encourageons à minimiser votre impact environnemental.</li>
              <li><strong>Tri sélectif :</strong> Des poubelles de tri sont disponibles. Merci de respecter les consignes de tri (plastique, papier, verre, déchets organiques).</li>
              <li><strong>Covoiturage :</strong> Privilégiez les transports en commun ou le covoiturage pour vous rendre sur les différents sites.</li>
              <li><strong>Respect de la nature :</strong> Ne jetez rien par terre, respectez les espaces verts et la faune locale.</li>
              <li><strong>Économie d'énergie :</strong> Éteignez les lumières et équipements lorsque vous quittez un espace.</li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>4. Respect et vivre-ensemble</h3>
            <ul>
              <li><strong>Inclusion :</strong> Le CARTEL est un événement ouvert à tous. Toute forme de discrimination est proscrite.</li>
              <li><strong>Consentement :</strong> Respectez l'espace personnel de chacun. Toute forme de harcèlement sera sanctionnée.</li>
              <li><strong>Safe Place :</strong> Des espaces "Safe Place" sont identifiés sur la carte pour toute personne ayant besoin d'aide ou de soutien.</li>
              <li><strong>Stand de prévention :</strong> Des stands de prévention sont présents pour vous informer et vous accompagner.</li>
            </ul>
          </section>

          <section className="hse-section">
            <h3>5. Contacts utiles</h3>
            <ul>
              <li><strong>Organisation CARTEL :</strong> Consultez l'onglet "Infos" de l'application</li>
              <li><strong>Objets trouvés :</strong> Rendez-vous au point accueil de chaque site</li>
              <li><strong>Réclamations :</strong> Adressez-vous à un membre de l'organisation</li>
            </ul>
          </section>

          <section className="hse-section hse-final">
            <h3>Engagement</h3>
            <p>
              En validant cette charte et en saisissant mon numéro de bracelet, je m'engage à :
            </p>
            <ul>
              <li>Respecter l'ensemble des règles énoncées dans cette charte</li>
              <li>Adopter un comportement responsable et respectueux</li>
              <li>Contribuer à la sécurité et au bien-être de tous les participants</li>
              <li>Signaler tout incident ou comportement inapproprié aux organisateurs</li>
            </ul>
          </section>

          <section className="hse-section bracelet-section">
            <h3>Numéro de bracelet</h3>
            <p className="bracelet-info">
              Ce numéro sert d'identifiant unique et vous permettra de participer aux paris sur les matchs.
            </p>
            <input
              type="text"
              id="bracelet-number"
              value={braceletNumber}
              onChange={(e) => setBraceletNumber(e.target.value)}
              placeholder="Ex: 12345"
              className="bracelet-input"
            />
          </section>
        </div>

        <div className="hse-popup-footer">
          {error && <p className="hse-error">{error}</p>}

          <button 
            className={`hse-accept-button ${hasScrolledToBottom && braceletNumber.trim() ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={isValidating}
          >
            {isValidating 
              ? "Vérification en cours..." 
              : hasScrolledToBottom 
                ? "J'accepte la charte HSE" 
                : "Lisez la charte jusqu'en bas"}
          </button>

          <p className="hse-scroll-hint">
            {!hasScrolledToBottom && "Faites défiler pour lire toute la charte"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HSECharterPopup;
