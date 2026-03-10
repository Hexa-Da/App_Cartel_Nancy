/**
 * @fileoverview Modal pour définir les gagnants des sports
 * Gère le chargement et la sauvegarde des gagnants dans Firebase
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../AppContext';
import logger from '../services/Logger';
import './WinnersModal.css';

interface SportSection {
  sportKey: string;
  sport: string;
  gender: string;
  delegations: string[];
  championship?: string;
}

interface WinnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sports: SportSection[];
}

// Emojis pour chaque sport (cohérent avec Parie.tsx)
const sportEmojis: { [key: string]: string } = {
  Football: '⚽',
  Basketball: '🏀',
  Handball: '🤾',
  Rugby: '🏉',
  Volleyball: '🏐',
  Tennis: '🎾',
  Badminton: '🏸',
  'Ping-pong': '🏓',
  Ultimate: '🥏',
  Natation: '🏊',
  Cross: '👟',
  Echecs: '♟️',
  Athlétisme: '🏃‍♂️',
  Escalade: '🧗‍♂️',
  Spikeball: '⚡️',
  Pétanque: '🍹',
  'Show Pompom': '🎀',
  'DJ Contest': '🎧',
};

const WinnersModal: React.FC<WinnersModalProps> = ({ isOpen, onClose, sports }) => {
  const { getAllDelegations } = useApp();
  const [winners, setWinners] = useState<{ [sportKey: string]: string }>({});
  const [isSavingWinners, setIsSavingWinners] = useState(false);
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);

  // Fonction pour charger les gagnants actuels depuis delegationBets
  const loadCurrentWinners = useCallback(async () => {
    setIsLoadingWinners(true);
    try {
      const allDelegations = getAllDelegations();
      if (allDelegations.length === 0) {
        // Initialiser avec des valeurs vides pour tous les sports
        const emptyWinners: { [sportKey: string]: string } = {};
        sports.forEach(sport => {
          emptyWinners[sport.sportKey] = '';
        });
        setWinners(emptyWinners);
        setIsLoadingWinners(false);
        return;
      }

      // Initialiser tous les sports avec des valeurs vides
      const currentWinners: { [sportKey: string]: string } = {};
      sports.forEach(sport => {
        currentWinners[sport.sportKey] = '';
      });

      // Parcourir toutes les délégations pour trouver les gagnants
      // On prend la première valeur non vide trouvée pour chaque sport
      for (const delegation of allDelegations) {
        const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
        const snapshot = await get(delegationBetsRef);
        
        if (snapshot.exists()) {
          const votes = snapshot.val();
          
          // Parcourir tous les sports pour récupérer les winners
          Object.keys(votes).forEach(sportKey => {
            // Ne mettre à jour que si on n'a pas encore de valeur non vide pour ce sport
            const winner = votes[sportKey]?.winner;
            if (winner && (!currentWinners[sportKey] || currentWinners[sportKey] === '')) {
              currentWinners[sportKey] = winner;
            }
          });
        }
      }
      
      setWinners(currentWinners);
    } catch (err) {
      logger.error('Erreur chargement gagnants:', err);
      // En cas d'erreur, initialiser avec des valeurs vides
      const emptyWinners: { [sportKey: string]: string } = {};
      sports.forEach(sport => {
        emptyWinners[sport.sportKey] = '';
      });
      setWinners(emptyWinners);
    } finally {
      setIsLoadingWinners(false);
    }
  }, [getAllDelegations, sports]);

  // Charger les gagnants uniquement à l'ouverture du modal
  useEffect(() => {
    if (isOpen) {
      loadCurrentWinners();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Réinitialiser les valeurs uniquement à la fermeture du modal
  useEffect(() => {
    if (!isOpen) {
      setWinners({});
    }
  }, [isOpen]);

  // Fonction pour sauvegarder les gagnants dans delegationBets
  const saveWinners = useCallback(async () => {
    setIsSavingWinners(true);
    try {
      const allDelegations = getAllDelegations();
      const updatePromises: Promise<void>[] = [];

      // Pour chaque délégation, mettre à jour les winners
      for (const delegation of allDelegations) {
        const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
        
        // Charger les votes actuels de la délégation
        const snapshot = await get(delegationBetsRef);
        if (snapshot.exists()) {
          const votes = snapshot.val();
          
          // Mettre à jour le winner pour chaque sport
          Object.keys(winners).forEach(sportKey => {
            if (votes[sportKey]) {
              votes[sportKey].winner = winners[sportKey] || null;
            }
          });
          
          // Sauvegarder les votes mis à jour
          const updatePromise = set(delegationBetsRef, votes).catch(err => {
            logger.error(`Erreur sauvegarde winners délégation ${delegation}:`, err);
          });
          updatePromises.push(updatePromise);
        }
      }

      await Promise.all(updatePromises);
      logger.log('Gagnants sauvegardés avec succès');
      onClose();
    } catch (err) {
      logger.error('Erreur sauvegarde gagnants:', err);
      alert('Erreur lors de la sauvegarde des gagnants. Veuillez réessayer.');
    } finally {
      setIsSavingWinners(false);
    }
  }, [winners, getAllDelegations, onClose]);

  const getSportEmoji = (sport: string): string => {
    return sportEmojis[sport] || '🏆';
  };

  const getGenderLabel = (gender: string): string => {
    if (gender === 'féminin') return 'Féminin';
    if (gender === 'masculin') return 'Masculin';
    return 'Mixte';
  };
  
  const getSportLabel = (sport: string, gender: string, championship?: string): string => {
    // Pour Natation et Athlétisme, si un championnat est défini (ex: relai),
    // on affiche "Natation Relai 6x50 nage libre" plutôt que "Natation Mixte"
    if (championship) {
      return `${sport} ${championship}`;
    }

    // Ne pas afficher le suffixe de genre pour certains sports sans championnat explicite
    const noGenderSuffixSports = ['Show Pompom', 'DJ Contest', 'Pétanque', 'Ultimate', 'Echecs'];
    if (noGenderSuffixSports.includes(sport)) {
      return sport;
    }

    return `${sport} ${getGenderLabel(gender)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="winners-modal-overlay" onClick={onClose}>
      <div className="winners-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="winners-modal-header">
          <h2>Définir les gagnants</h2>
          <button className="winners-modal-close" onClick={onClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="winners-modal-body">
          {isLoadingWinners ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div>Chargement des gagnants...</div>
            </div>
          ) : (
            sports.map(sportSection => {
              const allDelegationsForSport = sportSection.delegations;
              return (
                <div key={sportSection.sportKey} className="winner-sport-item">
                  <label className="winner-sport-label">
                    {getSportEmoji(sportSection.sport)}{' '}
                    {getSportLabel(sportSection.sport, sportSection.gender, sportSection.championship)}
                  </label>
                  <select
                    className="winner-select"
                    value={winners[sportSection.sportKey] || ''}
                    onChange={(e) => setWinners({ ...winners, [sportSection.sportKey]: e.target.value })}
                  >
                    <option value="">Aucun gagnant</option>
                    {allDelegationsForSport.map(delegation => (
                      <option key={delegation} value={delegation}>
                        {delegation}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })
          )}
        </div>
        <div className="winners-modal-footer">
          <button
            className="winners-save-button"
            onClick={saveWinners}
            disabled={isSavingWinners || isLoadingWinners}
          >
            {isSavingWinners ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnersModal;
