/**
 * @fileoverview Page Paris - Activation du bracelet et système de paris
 */

import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';
import { FaDice, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './Parie.css';

const Parie: React.FC = () => {
  const [braceletNumber, setBraceletNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [storedBracelet, setStoredBracelet] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('userBraceletNumber');
    if (stored) {
      setStoredBracelet(stored);
      setIsActivated(true);
    }
  }, []);

  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const handleActivateBracelet = async () => {
    if (!braceletNumber.trim()) {
      setError('Veuillez saisir votre numéro de bracelet');
      return;
    }

    setIsValidating(true);
    setError('');

    const trimmedNumber = braceletNumber.trim();
    const deviceId = getDeviceId();

    try {
      const participantRef = ref(database, `participants/${trimmedNumber}`);
      const snapshot = await get(participantRef);
      
      if (!snapshot.exists()) {
        setError('Numéro de bracelet invalide');
        setIsValidating(false);
        return;
      }

      const data = snapshot.val();
      if (data.deviceId && data.deviceId !== deviceId) {
        setError('Ce bracelet est déjà utilisé sur un autre appareil');
        setIsValidating(false);
        return;
      }

      // Enregistrer l'activation
      await set(participantRef, {
        ...data,
        deviceId: deviceId,
        activatedAt: Date.now()
      });

      localStorage.setItem('userBraceletNumber', trimmedNumber);
      setStoredBracelet(trimmedNumber);
      setIsActivated(true);
    } catch (err) {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setIsValidating(false);
    }
  };

  if (isActivated) {
    return (
      <div className="parie-page">
        <div className="parie-header">
          <h1>FAITES VOS PARIS</h1>
        </div>

        <div className="parie-content">
          <div className="parie-activated">
            <FaCheckCircle className="success-icon" />
            <h2>Bracelet activé !</h2>
            <p className="bracelet-number">N° {storedBracelet}</p>
            <p className="parie-info">Vous pouvez maintenant participer aux paris.</p>
            
            <div className="parie-instructions">
              <h3>Comment parier ?</h3>
              <ol>
                <li>Allez sur la <strong>carte</strong> ou le <strong>calendrier</strong></li>
                <li>Sélectionnez un match à venir</li>
                <li>Cliquez sur <strong>"Parier"</strong></li>
                <li>Choisissez votre pronostic</li>
              </ol>
            </div>

            <div className="parie-note">
              <FaDice className="note-icon" />
              <p>Les paris sont gratuits et permettent de gagner des points !</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parie-page">
      <div className="parie-header">
        <h1>FAITES VOS PARIS</h1>
      </div>

      <div className="parie-content">
        <div className="parie-setup">
          <FaDice className="parie-icon" />
          <h2>Activez votre bracelet</h2>
          <p className="parie-description">
            Pour participer aux paris, activez d'abord votre numéro de bracelet.
          </p>

          <div className="parie-form">
            <label htmlFor="bracelet-input">Numéro de bracelet</label>
            <input
              type="text"
              id="bracelet-input"
              value={braceletNumber}
              onChange={(e) => setBraceletNumber(e.target.value)}
              placeholder="Ex: 12345"
              className="parie-input"
              disabled={isValidating}
            />
            
            {error && <p className="parie-error">{error}</p>}

            <button 
              className="parie-button"
              onClick={handleActivateBracelet}
              disabled={isValidating || !braceletNumber.trim()}
            >
              {isValidating ? 'Vérification...' : 'Activer'}
            </button>
          </div>

          <div className="parie-warning">
            <FaExclamationTriangle className="warning-icon" />
            <p><strong>Attention :</strong> Un bracelet = un seul appareil. Action irréversible.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Parie;
