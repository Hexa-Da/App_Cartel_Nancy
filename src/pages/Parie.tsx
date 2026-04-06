/**
 * @fileoverview Page Paris - Système de paris
 * Le bracelet est activé lors de l'acceptation de la charte HSE
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, get, update, onValue } from 'firebase/database';
import { database } from '../firebase';
import { useApp } from '../AppContext';
import { useEditing } from '../contexts/EditingContext';
import { 
  FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaClock, FaSpinner
} from 'react-icons/fa';
import './Parie.css';
import WinnersModal from '../components/WinnersModal';
import logger from '../services/Logger';

interface SportSection {
  sportKey: string;
  sport: string;
  gender: string;
  delegations: string[];
  championship?: string;
}

// Date de clôture des paris (à configurer)
const BETTING_DEADLINE = new Date('2026-04-16T15:00:00'); // 16 avril 2026 à 15h

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

/** Delegations allowed to be picked for DJ Contest (must match display names from venues). */
const DJ_CONTEST_DELEGATIONS: readonly string[] = [
  'IMT NE',
  'IMT A',
  'Mines Alès',
  'Mines Nancy',
  'Télécom Paris',
  'Ponts',
];

// Interface pour les votes agrégés d'une délégation
interface DelegationVotes {
  [sportKey: string]: {
    votes: { [delegation: string]: number };
    totalVotes: number;
    winner: string | null;
  };
}


const Parie: React.FC = () => {
  const { venues, getAllDelegations, isAdmin } = useApp();
  const { isEditing } = useEditing();
  const [storedBracelet, setStoredBracelet] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // États pour les paris
  const [bets, setBets] = useState<{ [sportKey: string]: string | null }>({});
  const [openSportIndex, setOpenSportIndex] = useState<number | null>(null);
  const [isLoadingBets, setIsLoadingBets] = useState(false);
  const [isSavingBet, setIsSavingBet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  
  // Délégation du participant et votes agrégés
  const [userDelegation, setUserDelegation] = useState<string | null>(null);
  const userDelegationRef = useRef<string | null>(null);
  const [_, setDelegationVotes] = useState<DelegationVotes>({});
  
  // Synchroniser la ref avec le state
  useEffect(() => {
    userDelegationRef.current = userDelegation;
  }, [userDelegation]);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [bettingClosed, setBettingClosed] = useState(false);
  const [invalidBraceletNotice, setInvalidBraceletNotice] = useState(false);

  const clearInvalidBraceletSession = useCallback(() => {
    localStorage.removeItem('userBraceletNumber');
    localStorage.removeItem('userBets');
    localStorage.removeItem('hseCharterAccepted');
    setStoredBracelet(null);
    setIsActivated(false);
    setBets({});
    setUserDelegation(null);
  }, []);

  // Charger les votes agrégés de la délégation
  const loadDelegationVotes = useCallback(async (delegation: string) => {
    try {
      const delegationBetsRef = ref(database, `delegationBets/${delegation}`);
      const snapshot = await get(delegationBetsRef);
      
      if (snapshot.exists()) {
        setDelegationVotes(snapshot.val());
      }
    } catch (err) {
      logger.error('Erreur chargement votes délégation:', err);
    }
  }, []);

  // Sauvegarder les paris dans Firebase
  const saveBetsToFirebase = useCallback(async (braceletNum: string, betsData: { [key: string]: string | null }) => {
    try {
      const participantRef = ref(database, `participants/${braceletNum}`);
      await update(participantRef, {
        bets: betsData,
        lastBetUpdate: Date.now()
      });
    } catch (err) {
      logger.error('Erreur sauvegarde paris:', err);
    }
  }, []);

  // Charger les paris depuis Firebase
  const loadBetsFromFirebase = useCallback(async (braceletNum: string) => {
    setIsLoadingBets(true);
    try {
      const participantRef = ref(database, `participants/${braceletNum}`);
      const snapshot = await get(participantRef);

      if (!snapshot.exists()) {
        clearInvalidBraceletSession();
        setInvalidBraceletNotice(true);
        logger.warn('[Parie] Bracelet absent de la base, session réinitialisée');
        return;
      }

      const participantData = snapshot.val();

      if (participantData.delegation) {
        setUserDelegation(participantData.delegation);
      }

      if (participantData.bets) {
        setBets(participantData.bets);
        localStorage.setItem('userBets', JSON.stringify(participantData.bets));
      } else {
        const savedBets = localStorage.getItem('userBets');
        if (savedBets) {
          const localBets = JSON.parse(savedBets) as { [key: string]: string | null };
          setBets(localBets);
          await saveBetsToFirebase(braceletNum, localBets);
        }
      }

      if (participantData.delegation) {
        await loadDelegationVotes(participantData.delegation);
      }
    } catch (err) {
      logger.error('Erreur chargement paris:', err);
      const savedBets = localStorage.getItem('userBets');
      if (savedBets) {
        setBets(JSON.parse(savedBets) as { [key: string]: string | null });
      }
    } finally {
      setIsLoadingBets(false);
    }
  }, [clearInvalidBraceletSession, loadDelegationVotes, saveBetsToFirebase]);

  // Vérification bracelet + scroll page
  useEffect(() => {
    let cancelled = false;

    const initBraceletSession = async () => {
      const stored = localStorage.getItem('userBraceletNumber');
      if (!stored) {
        if (!cancelled) setIsInitializing(false);
        return;
      }

      try {
        const participantRef = ref(database, `participants/${stored}`);
        const snapshot = await get(participantRef);
        if (cancelled) return;

        if (!snapshot.exists()) {
          clearInvalidBraceletSession();
          setInvalidBraceletNotice(true);
          logger.warn('[Parie] Bracelet local inconnu côté Firebase');
          return;
        }

        setStoredBracelet(stored);
        setIsActivated(true);
        await loadBetsFromFirebase(stored);
      } catch (err) {
        if (cancelled) return;
        logger.error('Erreur vérification bracelet (Paris):', err);
        setStoredBracelet(stored);
        setIsActivated(true);
        await loadBetsFromFirebase(stored);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    document.body.classList.add('parie-page-active');
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.classList.add('scrollable');
    }

    void initBraceletSession();

    return () => {
      cancelled = true;
      document.body.classList.remove('parie-page-active');
      const appMainCleanup = document.querySelector('.app-main');
      if (appMainCleanup) {
        appMainCleanup.classList.remove('scrollable');
        appMainCleanup.scrollTop = 0;
      }
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      window.scrollTo(0, 0);
    };
  }, [clearInvalidBraceletSession, loadBetsFromFirebase]);

  // Appeler la Cloud Function pour synchroniser les votes agrégés de toutes les délégations
  const syncAllDelegationVotes = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Construire l'URL de la Cloud Function
      let functionUrl = import.meta.env.VITE_SYNC_VOTES_ENDPOINT;
      
      // Si l'URL n'est pas définie, construire automatiquement à partir du project ID
      if (!functionUrl) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        if (!projectId) {
          throw new Error('VITE_FIREBASE_PROJECT_ID manquant. Impossible de construire l\'URL de la Cloud Function.');
        }
        // Format par défaut pour Firebase Functions v2 (région: europe-west1)
        // L'utilisateur peut override avec VITE_SYNC_VOTES_ENDPOINT si la région est différente
        functionUrl = `https://europe-west1-${projectId}.cloudfunctions.net/syncAllDelegationVotes`;
        logger.warn('[Parie] URL Cloud Function construite automatiquement:', functionUrl);
        logger.warn('[Parie] Pour utiliser une région différente, définissez VITE_SYNC_VOTES_ENDPOINT dans .env');
      }
      
      const authKey = import.meta.env.VITE_FCM_ENDPOINT_AUTH_KEY;
      if (!authKey) {
        throw new Error('VITE_FCM_ENDPOINT_AUTH_KEY manquant dans les variables d\'environnement');
      }

      logger.log('[Parie] Appel de la Cloud Function:', functionUrl);

      // Timeout de 30 secondes pour la synchronisation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Parie] Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.log('Synchronisation des votes réussie:', result.message);

      // Recharger les votes de la délégation de l'utilisateur après synchronisation
      const currentDelegation = userDelegationRef.current;
      if (currentDelegation) {
        await loadDelegationVotes(currentDelegation);
      }

      // Afficher un message de succès
      alert(`Synchronisation réussie: ${result.message || 'Votes synchronisés avec succès'}`);
    } catch (err) {
      logger.error('Erreur synchronisation votes délégation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // Message d'erreur plus détaillé
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('AbortError')) {
        const isTimeout = errorMessage.includes('AbortError');
        alert('Impossible de contacter la Cloud Function. Vérifiez que:\n' +
              '1. La fonction est déployée (firebase deploy --only functions)\n' +
              '2. L\'URL est correcte dans VITE_SYNC_VOTES_ENDPOINT\n' +
              '3. Vous êtes connecté à Internet\n' +
              (isTimeout ? '4. Le délai d\'attente a été dépassé (30s)' : ''));
      } else {
        alert(`Erreur lors de la synchronisation: ${errorMessage}`);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [loadDelegationVotes]);


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
      logger.error('Erreur listener delegationBets:', error);
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


  const hasRankSuffix = (name: string): boolean => {
    const trimmed = (name || '').trim();
    return (
      /^\d+(?:er|ème)(\s|$)/i.test(trimmed) || 
      /\s+\d+(?:er|ème)$/i.test(trimmed)      
    );
  };

  /** Excludes pool/bracket placeholders like W1, X1 (single letter + digits only). */
  const isLetterDigitPlaceholderTeam = (name: string): boolean => {
    const trimmed = (name || '').trim();
    return /^[A-Za-z]\d+$/.test(trimmed);
  };

  // Fonction pour obtenir les sports avec leurs délégations
  // Le genre est détecté dans match.description (comme dans App.tsx)
  const getSportsWithDelegations = (): SportSection[] => {
    const sportsMap = new Map<string, { sport: string; gender: string; delegations: Set<string>; championship?: string }>();
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
        const rawDescription: string = match.description || '';
        const matchDesc = rawDescription.toLowerCase();
        let gender = 'mixte';
        if (matchDesc.includes('féminin')) {
          gender = 'féminin';
        } else if (matchDesc.includes('masculin')) {
          gender = 'masculin';
        } else if (matchDesc.includes('mixte')) {
          gender = 'mixte';
        }

        // Pour Natation et Athlétisme, distinguer les relais comme championnats distincts
        // sans séparer les différentes séries (série 1, série 2, etc.)
        let championship: string | undefined;
        if ((sport === 'Natation' || sport === 'Athlétisme') && rawDescription.trim() && matchDesc.includes('relai')) {
          let normalizedChampionship = rawDescription.trim();
          // Supprimer les indications de série en fin de description
          normalizedChampionship = normalizedChampionship.replace(/[-–—]?\s*séries?\s*\d+(?:\/\d+)?$/i, '');
          normalizedChampionship = normalizedChampionship.replace(/[-–—]?\s*series?\s*\d+(?:\/\d+)?$/i, '');
          normalizedChampionship = normalizedChampionship.replace(/[-–—]?\s*série\s*\d+(?:\/\d+)?$/i, '');
          championship = normalizedChampionship.trim();
        }

        const sportKey = championship ? `${sport}_${gender}_${championship}` : `${sport}_${gender}`;

        if (!sportsMap.has(sportKey)) {
          sportsMap.set(sportKey, { sport, gender, delegations: new Set(), championship });
        }

        const sides = match.teams.split(/\svs\s/i).map((s: string) => s.trim());
        sides.forEach((side: string) => {
          const sideLower = side.toLowerCase();
          const isExcluded = excludedKeywords.some(keyword => sideLower.includes(keyword));
          if (
            side &&
            side !== "..." &&
            side !== "…" &&
            side.length > 1 &&
            !isExcluded &&
            !hasRankSuffix(side) &&
            !isLetterDigitPlaceholderTeam(side)
          ) {
            sportsMap.get(sportKey)?.delegations.add(side);
          }
        });
      });
    });

    // Ajouter Show Pompom (toutes les délégations) et DJ Contest (liste restreinte)
    const allDelegations = getAllDelegations();
    const djContestDelegationSet = new Set(
      DJ_CONTEST_DELEGATIONS.map(d => d.toLowerCase())
    );
    const djContestDelegations = allDelegations.filter(d =>
      djContestDelegationSet.has(d.toLowerCase())
    );

    // Show Pompom - toutes les délégations participent
    const showPompomKey = 'Show Pompom_mixte';
    sportsMap.set(showPompomKey, {
      sport: 'Show Pompom',
      gender: 'mixte',
      delegations: new Set(allDelegations)
    });

    // DJ Contest - seulement certaines délégations
    const djContestKey = 'DJ Contest_mixte';
    sportsMap.set(djContestKey, {
      sport: 'DJ Contest',
      gender: 'mixte',
      delegations: new Set(djContestDelegations)
    });

    // Convertir en tableau et filtrer les sports sans délégations
    return Array.from(sportsMap.entries())
      .map(([sportKey, data]) => ({
        sportKey,
        sport: data.sport,
        gender: data.gender,
        delegations: Array.from(data.delegations).sort(),
        championship: data.championship
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
  
  const getSportLabel = (sport: string, gender: string, championship?: string): string => {
    // Pour Natation et Athlétisme, si un championnat est défini (ex: relai),
    // on affiche "Natation Relai 6x50 nage libre" plutôt que "Natation Mixte"
    if (championship) {
      return `${sport} ${championship}`;
    }

    // Ne pas afficher le suffixe de genre pour certains sports sans championnat explicite
    const noGenderSuffixSports = ['Show Pompom', 'DJ Contest', 'Pétanque', 'Ultimate', 'Echecs', 'Escalade'];
    if (noGenderSuffixSports.includes(sport)) {
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

  // Afficher un loader pendant l'initialisation
  if (isInitializing) {
    return (
      <div className="page-content scrollable parie-page">
        <div className="parie-header">
          <h1>FAITES VOS PARIS</h1>
        </div>
        <div className="parie-content">
          <div className="chat-loading-spinner-container">
            <div className="chat-loading-spinner"></div>
            <div className="chat-loading-text">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isActivated) {
    return (
      <div className="page-content scrollable parie-page">
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
            <div className="chat-loading-spinner-container">
              <div className="chat-loading-spinner"></div>
              <div className="chat-loading-text">Chargement des paris...</div>
            </div>
          )}

          <div className={`parie-main-content ${isLoadingBets ? 'loading' : 'loaded'}`}>
            {!bettingClosed && (
              <p className="parie-intro">
                Sélectionnez la délégation que vous pensez gagnante pour chaque compétition.
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
                  onClick={() => setShowWinnersModal(true)}
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
                    <span className="sport-name">
                      {getSportLabel(sportSection.sport, sportSection.gender, sportSection.championship)}
                    </span>
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
          </div>

          {/* Modal pour définir les gagnants */}
          <WinnersModal
            isOpen={showWinnersModal}
            onClose={() => setShowWinnersModal(false)}
            sports={sports}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content scrollable parie-page">
      <div className="parie-header">
        <h1>FAITES VOS PARIS</h1>
      </div>

      <div className="parie-content">
        <TimerDisplay />
        
        {!isActivated && (
          <div className="parie-setup">
            {invalidBraceletNotice && (
              <div className="parie-error parie-invalid-bracelet-notice" role="alert">
                <FaExclamationTriangle className="parie-invalid-bracelet-icon" aria-hidden />
                <p>
                  Ce numéro de bracelet n&apos;existe pas dans notre base de participants. Votre session a été
                  réinitialisée. Réinstalllez l'application pour accepter à nouveau la charte HSE avec un numéro valide.
                </p>
              </div>
            )}
            <p className="parie-description">
              Pour participer aux paris, vous devez d&apos;abord accepter la charte HSE et saisir votre numéro de
              bracelet.
            </p>
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
                  <FaCheckCircle />
                  Synchroniser les votes des délégations
                </>
              )}
            </button>
              <button
                className="admin-sync-button admin-winners-button"
                onClick={() => setShowWinnersModal(true)}
              >
                Définir les gagnants
              </button>
          </div>
        )}

        {/* Modal pour définir les gagnants */}
        <WinnersModal
          isOpen={showWinnersModal}
          onClose={() => setShowWinnersModal(false)}
          sports={sports}
        />
      </div>
    </div>
  );
};

export default Parie;
