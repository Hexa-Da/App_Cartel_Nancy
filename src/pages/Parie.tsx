/**
 * @fileoverview Page Paris - Activation du bracelet et système de paris
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, get, set, update, onValue } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../AppContext';
import { useAppPanels } from '../AppPanelsContext';
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
  const { venues, getAllDelegations, isAdmin } = useApp();
  const { isEditing } = useAppPanels();
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [winners, setWinners] = useState<{ [sportKey: string]: string }>({});
  const [isSavingWinners, setIsSavingWinners] = useState(false);
  
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
      const appMainCleanup = document.querySelector('.app-main');
      if (appMainCleanup) {
        appMainCleanup.classList.remove('scrollable');
        // Réinitialiser le scroll position pour éviter d'affecter les autres pages
        appMainCleanup.scrollTop = 0;
      }
      // Réinitialiser aussi le scroll du body et de la window si nécessaire
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      window.scrollTo(0, 0);
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
        
        // Ne pas synchroniser automatiquement - laisser le serveur gérer cela
        // La synchronisation sera gérée par une Cloud Function pour éviter la surcharge
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

  // Sauvegarder les paris dans Firebase
  // La synchronisation des votes sera gérée par une Cloud Function ou un script côté serveur
  // pour éviter de surcharger les clients avec des calculs coûteux
  const saveBetsToFirebase = async (braceletNum: string, betsData: { [key: string]: string | null }) => {
    try {
      const participantRef = ref(database, `participants/${braceletNum}`);
      await update(participantRef, {
        bets: betsData,
        lastBetUpdate: Date.now()
      });

      // Note: La synchronisation des votes devrait être gérée côté serveur (Cloud Function)
      // pour éviter de surcharger les clients. Pour l'instant, on synchronise uniquement
      // si nécessaire avec un throttling important.
      // TODO: Migrer vers une Cloud Function pour gérer syncAllDelegationVotes()
    } catch (err) {
      console.error('Erreur sauvegarde paris:', err);
    }
  };

  // Recalculer les votes agrégés pour TOUTES les délégations
  const syncAllDelegationVotes = useCallback(async () => {
    setIsSyncing(true);
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

      // Charger les winners existants depuis Firebase pour les préserver
      const existingWinnersMap: { [delegation: string]: { [sportKey: string]: string | null } } = {};
      const loadWinnersPromises = Array.from(allDelegations).map(async (delegation) => {
        const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
        const snapshot = await get(delegationBetsRef);
        if (snapshot.exists()) {
          const votes = snapshot.val();
          existingWinnersMap[delegation] = {};
          Object.keys(votes).forEach(sportKey => {
            existingWinnersMap[delegation][sportKey] = votes[sportKey].winner || null;
          });
        }
      });
      await Promise.all(loadWinnersPromises);

      // Mettre à jour les votes tout en préservant les winners existants
      const updatePromises: Promise<void>[] = [];
      
      allDelegations.forEach(delegation => {
        const votes = delegationVotesMap[delegation];
        Object.keys(votes).forEach(sportKey => {
          const sportVotes = votes[sportKey];
          // Préserver le winner existant s'il existe, sinon ne pas définir de winner automatiquement
          if (existingWinnersMap[delegation] && existingWinnersMap[delegation][sportKey] !== undefined) {
            sportVotes.winner = existingWinnersMap[delegation][sportKey];
          } else {
            // Si aucun winner n'existe, ne pas en définir automatiquement
            sportVotes.winner = null;
          }
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
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fonction pour charger les gagnants actuels depuis delegationBets
  const loadCurrentWinners = useCallback(async () => {
    try {
      const allDelegations = getAllDelegations();
      if (allDelegations.length === 0) return;

      // Charger les votes d'une délégation pour obtenir la structure des sports
      const firstDelegationRef = ref(database, `delegationBets/${allDelegations[0]}`);
      const snapshot = await get(firstDelegationRef);
      
      if (snapshot.exists()) {
        const votes = snapshot.val();
        const currentWinners: { [sportKey: string]: string } = {};
        
        // Parcourir tous les sports pour récupérer les winners
        Object.keys(votes).forEach(sportKey => {
          if (votes[sportKey].winner) {
            currentWinners[sportKey] = votes[sportKey].winner;
          }
        });
        
        setWinners(currentWinners);
      }
    } catch (err) {
      console.error('Erreur chargement gagnants:', err);
    }
  }, [getAllDelegations]);

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
            console.error(`Erreur sauvegarde winners délégation ${delegation}:`, err);
          });
          updatePromises.push(updatePromise);
        }
      }

      await Promise.all(updatePromises);
      setShowWinnersModal(false);
    } catch (err) {
      console.error('Erreur sauvegarde gagnants:', err);
    } finally {
      setIsSavingWinners(false);
    }
  }, [winners, getAllDelegations]);

  // Écouter les changements dans delegationBets au lieu de participants pour éviter les resynchronisations
  // Cette approche est beaucoup plus efficace car elle évite de recalculer tous les votes à chaque changement
  useEffect(() => {
    if (!isActivated || !userDelegation) return;

    // Écouter uniquement les votes de la délégation de l'utilisateur
    const delegationBetsRef = ref(database, `delegationBets/${userDelegation}`);
    const unsubscribe = onValue(delegationBetsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDelegationVotes(snapshot.val());
      }
    }, (error) => {
      console.error('Erreur listener delegationBets:', error);
    });

    return () => unsubscribe();
  }, [isActivated, userDelegation]);

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

          {/* Boutons admin */}
          {isAdmin && isEditing && (
            <div className="admin-buttons-container">
              <button
                className="admin-sync-button"
                onClick={syncAllDelegationVotes}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <FaSpinner className="spinner-icon" />
                    Synchronisation en cours...
                  </>
                ) : (
                  <>
                    Synchroniser les votes des délégations
                  </>
                )}
              </button>
              <button
                className="admin-sync-button admin-winners-button"
                onClick={() => {
                  loadCurrentWinners();
                  setShowWinnersModal(true);
                }}
              >
                Définir les gagnants
              </button>
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

          {/* Modal pour définir les gagnants */}
          {showWinnersModal && (
            <div className="winners-modal-overlay" onClick={() => setShowWinnersModal(false)}>
              <div className="winners-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="winners-modal-header">
                  <h2>Définir les gagnants</h2>
                  <button className="winners-modal-close" onClick={() => setShowWinnersModal(false)} type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="winners-modal-body">
                  {sports.map(sportSection => {
                    const allDelegationsForSport = sportSection.delegations;
                    return (
                      <div key={sportSection.sportKey} className="winner-sport-item">
                        <label className="winner-sport-label">
                          {getSportEmoji(sportSection.sport)} {getSportLabel(sportSection.sport, sportSection.gender)}
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
                  })}
                </div>
                <div className="winners-modal-footer">
                  <button
                    className="winners-save-button"
                    onClick={saveWinners}
                    disabled={isSavingWinners}
                  >
                    {isSavingWinners ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
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

        {/* Boutons admin */}
        {isAdmin && isEditing && (
          <div className="admin-buttons-container">
            <button
              className="admin-sync-button"
              onClick={syncAllDelegationVotes}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <FaSpinner className="spinner-icon" />
                  Synchronisation en cours...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Synchroniser les votes des délégations
                </>
              )}
            </button>
              <button
                className="admin-sync-button admin-winners-button"
                onClick={() => {
                  loadCurrentWinners();
                  setShowWinnersModal(true);
                }}
              >
                Définir les gagnants
              </button>
          </div>
        )}

        {/* Modal pour définir les gagnants */}
        {showWinnersModal && (
          <div className="winners-modal-overlay" onClick={() => setShowWinnersModal(false)}>
            <div className="winners-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="winners-modal-header">
                <h2>Définir les gagnants</h2>
                <button className="winners-modal-close" onClick={() => setShowWinnersModal(false)} type="button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="winners-modal-body">
                {sports.map(sportSection => {
                  const allDelegationsForSport = sportSection.delegations;
                  return (
                    <div key={sportSection.sportKey} className="winner-sport-item">
                      <label className="winner-sport-label">
                        {getSportEmoji(sportSection.sport)} {getSportLabel(sportSection.sport, sportSection.gender)}
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
                })}
              </div>
              <div className="winners-modal-footer">
                <button
                  className="winners-save-button"
                  onClick={saveWinners}
                  disabled={isSavingWinners}
                >
                  {isSavingWinners ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Parie;
