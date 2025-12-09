/**
 * @fileoverview Page Paris - Activation du bracelet et système de paris
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, get, set, update, onValue } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../AppContext';
import { 
  FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaClock, FaSpinner
} from 'react-icons/fa';
import './Parie.css';

interface SportSection {
  sportKey: string;
  sport: string;
  gender: string;
  delegations: string[];
}

// Date de clôture des paris (à configurer)
const BETTING_DEADLINE = new Date('2026-04-16T16:00:00'); // 16 avril 2026 à 16h

// Emojis pour chaque sport (cohérent avec App.tsx)
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

// Interface pour les votes agrégés d'une délégation
interface DelegationVotes {
  [sportKey: string]: {
    votes: { [delegation: string]: number };
    totalVotes: number;
    winner: string | null;
  };
}

// Modal pour la saisie du bracelet (défini en dehors du composant pour éviter les re-renders)
interface BraceletModalProps {
  isOpen: boolean;
  onClose: () => void;
  braceletNumber: string;
  setBraceletNumber: (value: string) => void;
  error: string;
  isValidating: boolean;
  onActivate: () => void;
}

const BraceletModal: React.FC<BraceletModalProps> = ({ 
  isOpen, 
  onClose, 
  braceletNumber, 
  setBraceletNumber, 
  error, 
  isValidating, 
  onActivate 
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onActivate();
  };

  return (
    <div className="bracelet-modal-overlay" onClick={onClose}>
      <div className="bracelet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="bracelet-modal-header">
          <h2>Activation du bracelet</h2>
          <button className="bracelet-modal-close" onClick={onClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="bracelet-login-form">
          <div className="form-group">
            <label htmlFor="bracelet-input-modal">Numéro de bracelet</label>
            <input
              type="text"
              id="bracelet-input-modal"
              value={braceletNumber}
              onChange={(e) => setBraceletNumber(e.target.value)}
              placeholder="Ex: 12345"
              required
              autoFocus
              disabled={isValidating}
            />
            <p className="bracelet-help-text">
              Le numéro de série est disponible au dos de la puce du bracelet.
            </p>
          </div>
          
          {error && <p className="parie-error">{error}</p>}

          <div className="parie-warning-modal">
            <FaExclamationTriangle className="warning-icon" />
            <p><strong>Attention :</strong> Un bracelet = un seul appareil. Action irréversible.</p>
          </div>
          
          <button 
            type="submit" 
            className="bracelet-login-button"
            disabled={isValidating || !braceletNumber.trim()}
          >
            {isValidating ? 'Vérification...' : 'Activer'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Parie: React.FC = () => {
  const { venues, getAllDelegations } = useApp();
  const [braceletNumber, setBraceletNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [storedBracelet, setStoredBracelet] = useState<string | null>(null);
  const [showBraceletModal, setShowBraceletModal] = useState(false);
  
  // États pour les paris
  const [bets, setBets] = useState<{ [sportKey: string]: string | null }>({});
  const [openSportIndex, setOpenSportIndex] = useState<number | null>(null);
  const [isLoadingBets, setIsLoadingBets] = useState(false);
  const [isSavingBet, setIsSavingBet] = useState(false);
  
  // Délégation du participant et votes agrégés
  const [userDelegation, setUserDelegation] = useState<string | null>(null);
  const userDelegationRef = useRef<string | null>(null);
  const [delegationVotes, setDelegationVotes] = useState<DelegationVotes>({});
  
  // Synchroniser la ref avec le state
  useEffect(() => {
    userDelegationRef.current = userDelegation;
  }, [userDelegation]);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [bettingClosed, setBettingClosed] = useState(false);

  // Callback pour fermer le modal (mémorisé pour éviter les re-renders)
  const handleCloseModal = useCallback(() => {
    setShowBraceletModal(false);
    setError('');
    setBraceletNumber('');
  }, []);

  // Charger les données initiales
  useEffect(() => {
    const stored = localStorage.getItem('userBraceletNumber');
    if (stored) {
      setStoredBracelet(stored);
      setIsActivated(true);
      // Charger les paris depuis Firebase
      loadBetsFromFirebase(stored);
    }
    // Ne pas ouvrir automatiquement le modal pour éviter les bugs de re-render
    
    // Activer le scroll sur cette page
    document.body.classList.add('parie-page-active');
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.classList.add('scrollable');
    }
    
    return () => {
      document.body.classList.remove('parie-page-active');
      if (appMain) {
        appMain.classList.remove('scrollable');
      }
    };
  }, []);

  // Charger les paris depuis Firebase
  const loadBetsFromFirebase = async (braceletNum: string) => {
    setIsLoadingBets(true);
    try {
      // Charger les données du participant (paris + délégation)
      const participantRef = ref(database, `participants/${braceletNum}`);
      const snapshot = await get(participantRef);
      
      if (snapshot.exists()) {
        const participantData = snapshot.val();
        
        // Récupérer la délégation du participant
        // Si elle n'existe pas, on essaie de la déduire ou on la laisse null
        if (participantData.delegation) {
          setUserDelegation(participantData.delegation);
        }
        
        // Récupérer les paris
        if (participantData.bets) {
          setBets(participantData.bets);
          localStorage.setItem('userBets', JSON.stringify(participantData.bets));
        } else {
          // Si pas de paris dans Firebase, vérifier localStorage
          const savedBets = localStorage.getItem('userBets');
          if (savedBets) {
            const localBets = JSON.parse(savedBets);
            setBets(localBets);
            await saveBetsToFirebase(braceletNum, localBets);
          }
        }
        
        // Charger les votes de sa délégation
        if (participantData.delegation) {
          await loadDelegationVotes(participantData.delegation);
        }
        
        // Synchroniser tous les votes après le chargement
        await syncAllDelegationVotes();
      }
    } catch (err) {
      console.error('Erreur chargement paris:', err);
      const savedBets = localStorage.getItem('userBets');
      if (savedBets) {
        setBets(JSON.parse(savedBets));
      }
    } finally {
      setIsLoadingBets(false);
    }
  };

  // Charger les votes agrégés de la délégation
  const loadDelegationVotes = useCallback(async (delegation: string) => {
    try {
      // Charger depuis Firebase
      const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
      const snapshot = await get(delegationBetsRef);
      
      if (snapshot.exists()) {
        setDelegationVotes(snapshot.val());
      }
    } catch (err) {
      console.error('Erreur chargement votes délégation:', err);
    }
  }, []);

  // Sauvegarder les paris dans Firebase et mettre à jour les votes de la délégation
  const saveBetsToFirebase = async (braceletNum: string, betsData: { [key: string]: string | null }) => {
    try {
      const participantRef = ref(database, `participants/${braceletNum}`);
      await update(participantRef, {
        bets: betsData,
        lastBetUpdate: Date.now()
      });

      // Synchroniser tous les votes de délégation (le listener se déclenchera aussi)
      await syncAllDelegationVotes();
    } catch (err) {
      console.error('Erreur sauvegarde paris:', err);
    }
  };

  // Recalculer les votes agrégés pour TOUTES les délégations
  const syncAllDelegationVotes = useCallback(async () => {
    try {
      // Récupérer tous les participants
      const participantsRef = ref(database, 'participants');
      const snapshot = await get(participantsRef);
      
      if (!snapshot.exists()) return;

      const allParticipants = snapshot.val();
      const allDelegations = new Set<string>();
      const delegationVotesMap: { [delegation: string]: DelegationVotes } = {};

      // Première passe : identifier toutes les délégations et initialiser
      Object.values(allParticipants).forEach((participant: any) => {
        if (participant.delegation) {
          allDelegations.add(participant.delegation);
          if (!delegationVotesMap[participant.delegation]) {
            delegationVotesMap[participant.delegation] = {};
          }
        }
      });

      // Deuxième passe : compter les votes pour chaque délégation
      Object.entries(allParticipants).forEach(([_braceletNumber, participant]: [string, any]) => {
        if (participant.delegation && participant.bets) {
          const delegation = participant.delegation;
          const newDelegationVotes = delegationVotesMap[delegation];

          // Parcourir les paris de ce participant
          Object.entries(participant.bets).forEach(([sportKey, votedDelegation]) => {
            if (votedDelegation) {
              if (!newDelegationVotes[sportKey]) {
                newDelegationVotes[sportKey] = {
                  votes: {},
                  totalVotes: 0,
                  winner: null
                };
              }
              
              // Incrémenter le vote pour cette délégation
              if (!newDelegationVotes[sportKey].votes[votedDelegation as string]) {
                newDelegationVotes[sportKey].votes[votedDelegation as string] = 0;
              }
              newDelegationVotes[sportKey].votes[votedDelegation as string]++;
              newDelegationVotes[sportKey].totalVotes++;
            }
          });
        }
      });

      // Calculer le gagnant pour chaque sport de chaque délégation
      const updatePromises: Promise<void>[] = [];
      
      allDelegations.forEach(delegation => {
        const votes = delegationVotesMap[delegation];
        Object.keys(votes).forEach(sportKey => {
          const sportVotes = votes[sportKey];
          let maxVotes = 0;
          let winner: string | null = null;
          
          Object.entries(sportVotes.votes).forEach(([deleg, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              winner = deleg;
            }
          });
          
          sportVotes.winner = winner;
        });

        // Sauvegarder dans Firebase
        const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
        const updatePromise = set(delegationBetsRef, votes).catch(err => {
          console.error(`Erreur sauvegarde votes délégation ${delegation}:`, err);
        });
        updatePromises.push(updatePromise);
      });

      // Attendre que toutes les sauvegardes soient terminées
      await Promise.all(updatePromises);

      // Mettre à jour l'état local avec la valeur actuelle de userDelegation
      const currentDelegation = userDelegationRef.current;
      if (currentDelegation && delegationVotesMap[currentDelegation]) {
        setDelegationVotes(delegationVotesMap[currentDelegation]);
      }
    } catch (err) {
      console.error('Erreur synchronisation votes délégation:', err);
    }
  }, []);


  // Écouter les changements dans participants pour synchroniser automatiquement
  useEffect(() => {
    if (!isActivated) return;

    const participantsRef = ref(database, 'participants');
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Écouter les changements avec debounce pour éviter trop de synchronisations
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        // Debounce : attendre 500ms avant de synchroniser
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        syncTimeout = setTimeout(() => {
          syncAllDelegationVotes();
        }, 500);
      }
    }, (error) => {
      console.error('Erreur listener participants:', error);
    });

    return () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      unsubscribe();
    };
  }, [isActivated, syncAllDelegationVotes]);

  // Timer countdown
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = BETTING_DEADLINE.getTime() - now.getTime();
      
      if (diff <= 0) {
        setBettingClosed(true);
        setTimeRemaining(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ days, hours, minutes, seconds });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
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

  const handleActivateBracelet = useCallback(async () => {
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

      // Utiliser update pour préserver les champs existants (nom, prenom, telephone, braceletNumber, delegation)
      await update(participantRef, {
        deviceId: deviceId,
        activatedAt: Date.now()
      });
      
      // Si le participant a une délégation, charger les votes
      if (data.delegation) {
        setUserDelegation(data.delegation);
        await loadDelegationVotes(data.delegation);
      }

      localStorage.setItem('userBraceletNumber', trimmedNumber);
      setStoredBracelet(trimmedNumber);
      setIsActivated(true);
      setShowBraceletModal(false); // Fermer le modal après activation réussie
      setBraceletNumber(''); // Réinitialiser le champ
    } catch (err) {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setIsValidating(false);
    }
  }, [braceletNumber, loadDelegationVotes]);

  // Fonction pour obtenir les sports avec leurs délégations
  // Le genre est détecté dans match.description (comme dans App.tsx)
  const getSportsWithDelegations = (): SportSection[] => {
    const sportsMap = new Map<string, { sport: string; gender: string; delegations: Set<string> }>();
    const excludedKeywords = ['poule', 'perdant', 'vainqueur', 'gagnant', 'match'];
    const excludedSports = ['Hotel', 'Restaurant', 'Party', 'Defile', 'Pompom'];

    venues.forEach(venue => {
      // Exclure certains types
      if (excludedSports.includes(venue.sport)) return;
      if (!venue.matches || venue.matches.length === 0) return;

      const sport = venue.sport;

      // Parcourir chaque match pour détecter le genre (comme App.tsx)
      venue.matches.forEach((match: any) => {
        if (!match.teams) return;
        
        // Détecter le genre depuis match.description (logique App.tsx)
        const matchDesc = match.description?.toLowerCase() || '';
        let gender = 'mixte';
        if (matchDesc.includes('féminin')) {
          gender = 'féminin';
        } else if (matchDesc.includes('masculin')) {
          gender = 'masculin';
        } else if (matchDesc.includes('mixte')) {
          gender = 'mixte';
        }

        const sportKey = `${sport}_${gender}`;

        if (!sportsMap.has(sportKey)) {
          sportsMap.set(sportKey, { sport, gender, delegations: new Set() });
        }

        // Extraire les délégations de ce match
        const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map((team: string) => team.trim());
        teams.forEach((team: string) => {
          const teamLower = team.toLowerCase();
          const isExcluded = excludedKeywords.some(keyword => teamLower.includes(keyword));
          if (team && team !== "..." && team !== "…" && team.length > 1 && !isExcluded) {
            sportsMap.get(sportKey)?.delegations.add(team);
          }
        });
      });
    });

    // Ajouter Show Pompom et DJ Contest avec toutes les délégations
    const allDelegations = getAllDelegations();
    
    // Show Pompom - toutes les délégations participent
    const showPompomKey = 'Show Pompom_mixte';
    sportsMap.set(showPompomKey, {
      sport: 'Show Pompom',
      gender: 'mixte',
      delegations: new Set(allDelegations)
    });

    // DJ Contest - toutes les délégations participent
    const djContestKey = 'DJ Contest_mixte';
    sportsMap.set(djContestKey, {
      sport: 'DJ Contest',
      gender: 'mixte',
      delegations: new Set(allDelegations)
    });

    // Convertir en tableau et filtrer les sports sans délégations
    return Array.from(sportsMap.entries())
      .map(([sportKey, data]) => ({
        sportKey,
        sport: data.sport,
        gender: data.gender,
        delegations: Array.from(data.delegations).sort()
      }))
      .filter(s => s.delegations.length > 0)
      .sort((a, b) => {
        // Trier par sport puis par genre (féminin avant masculin avant mixte)
        if (a.sport !== b.sport) return a.sport.localeCompare(b.sport);
        const genderOrder = { 'féminin': 0, 'masculin': 1, 'mixte': 2 };
        return (genderOrder[a.gender as keyof typeof genderOrder] || 2) - (genderOrder[b.gender as keyof typeof genderOrder] || 2);
      });
  };

  const getSportEmoji = (sport: string): string => {
    return sportEmojis[sport] || '🏆';
  };

  const getGenderLabel = (gender: string): string => {
    if (gender === 'féminin') return 'Féminin';
    if (gender === 'masculin') return 'Masculin';
    return 'Mixte';
  };
  
  const getSportLabel = (sport: string, gender: string): string => {
    // Ne pas afficher le suffixe "Mixte" pour Show Pompom et DJ Contest
    if (sport === 'Show Pompom' || sport === 'DJ Contest') {
      return sport;
    }
    return `${sport} ${getGenderLabel(gender)}`;
  };

  const handleSelectDelegation = async (sportKey: string, delegation: string) => {
    if (bettingClosed || isSavingBet) return; // Ne pas permettre de modifier si paris clos ou en cours de sauvegarde
    
    const newBets = { ...bets };
    // Toggle: si déjà sélectionné, désélectionner
    if (newBets[sportKey] === delegation) {
      newBets[sportKey] = null;
    } else {
      newBets[sportKey] = delegation;
    }
    
    setBets(newBets);
    localStorage.setItem('userBets', JSON.stringify(newBets));
    
    // Sauvegarder dans Firebase
    if (storedBracelet) {
      setIsSavingBet(true);
      await saveBetsToFirebase(storedBracelet, newBets);
      setIsSavingBet(false);
    }
  };

  const sports = getSportsWithDelegations();
  const totalBets = Object.values(bets).filter(b => b !== null).length;

  // Composant Timer
  const TimerDisplay = () => {
    if (bettingClosed) {
      return (
        <div className="timer-closed">
          <FaClock /> Paris clos
        </div>
      );
    }
    
    if (!timeRemaining) return null;
    
    return (
      <div className="timer-container">
        <div className="timer-label"><FaClock /> Temps restant</div>
        <div className="timer-countdown">
          <div className="timer-unit">
            <span className="timer-value">{timeRemaining.days}</span>
            <span className="timer-text">j</span>
          </div>
          <div className="timer-unit">
            <span className="timer-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
            <span className="timer-text">h</span>
          </div>
          <div className="timer-unit">
            <span className="timer-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
            <span className="timer-text">m</span>
          </div>
          <div className="timer-unit">
            <span className="timer-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
            <span className="timer-text">s</span>
          </div>
        </div>
      </div>
    );
  };

  if (isActivated) {
    return (
      <div className="parie-page">
        <div className="parie-header">
          <h1>FAITES VOS PARIS</h1>
        </div>

        <div className="parie-content">
          <div className="parie-status-bar">
            <div className="bracelet-badge">
              <FaCheckCircle /> N° {storedBracelet}
            </div>
            <div className="bets-counter">
              {isSavingBet && <FaSpinner className="saving-spinner" />}
              {totalBets} / {sports.length} paris
            </div>
          </div>

          <TimerDisplay />

          {isLoadingBets && (
            <div className="loading-bets">
              <FaSpinner className="loading-spinner" />
              <span>Chargement des paris...</span>
            </div>
          )}

          {!bettingClosed && !isLoadingBets && (
            <p className="parie-intro">
              Sélectionnez la délégation que vous pensez gagnante pour chaque sport.
            </p>
          )}

          {bettingClosed && (
            <div className="betting-closed-message">
              <FaExclamationTriangle />
              <p>Les paris sont clos. Vous ne pouvez plus modifier vos pronostics.</p>
            </div>
          )}

          <div className="sports-list">
            {sports.map((sportSection, index) => (
              <div key={sportSection.sportKey} className={`sport-section ${openSportIndex === index ? 'open' : ''} ${bettingClosed ? 'disabled' : ''}`}>
                <div 
                  className="sport-header"
                  onClick={() => setOpenSportIndex(openSportIndex === index ? null : index)}
                >
                  <div className="sport-left">
                    <span className="sport-icon">{getSportEmoji(sportSection.sport)}</span>
                    <span className="sport-name">{getSportLabel(sportSection.sport, sportSection.gender)}</span>
                  </div>
                  <div className="sport-right">
                    {bets[sportSection.sportKey] && (
                      <span className="selected-badge">{bets[sportSection.sportKey]}</span>
                    )}
                    <span className="chevron">
                      {openSportIndex === index ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </div>
                </div>

                {openSportIndex === index && (
                  <>
                    <div className="delegations-list">
                      {sportSection.delegations.map(delegation => (
                        <div 
                          key={delegation}
                          className={`delegation-item ${bets[sportSection.sportKey] === delegation ? 'selected' : ''} ${bettingClosed ? 'disabled' : ''}`}
                          onClick={() => handleSelectDelegation(sportSection.sportKey, delegation)}
                        >
                          <span className="delegation-name">{delegation}</span>
                          {bets[sportSection.sportKey] === delegation && (
                            <FaCheckCircle className="check-icon" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {sports.length === 0 && (
            <div className="no-sports">
              <p>Aucun sport disponible pour le moment.</p>
            </div>
          )}
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
        <TimerDisplay />
        
        {!isActivated && (
          <div className="parie-setup">
            <p className="parie-description">
              Pour participer aux paris, activez d'abord votre bracelet.
            </p>

            <button 
              className="parie-button"
              onClick={() => setShowBraceletModal(true)}
            >
              Activer mon bracelet
            </button>
          </div>
        )}

        <BraceletModal 
          isOpen={showBraceletModal} 
          onClose={handleCloseModal}
          braceletNumber={braceletNumber}
          setBraceletNumber={setBraceletNumber}
          error={error}
          isValidating={isValidating}
          onActivate={handleActivateBracelet}
        />
      </div>
    </div>
  );
};

export default Parie;
