/**
 * @fileoverview Page d'accueil principale de l'application Cartel Nancy
 * 
 * Cette page affiche :
 * - Événements récents et à venir avec filtres
 * - Navigation vers les autres sections (map, info, etc.)
 * - Affichage des matchs avec détails (équipes, horaires, résultats)
 * - Gestion des événements passés avec styles différenciés
 * - Filtres par sport, délégation et statut temporel
 * 
 * Nécessaire car :
 * - Point d'entrée principal pour les utilisateurs
 * - Vue d'ensemble des événements du jour
 * - Navigation centrale vers toutes les fonctionnalités
 * - Interface responsive pour mobile et desktop
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EventDetails, { Event } from '../components/EventDetails';
import { Match, Venue } from '../types';
import type { Party } from '../types/venue';
import { getAppNow, getAppTimestamp } from '../config/homeMomentDebug';
import './Home.css';
import '../components/EventDetails.css';
import { useApp } from '../AppContext';
import { useForm } from '../contexts/FormContext';
import { useEditing } from '../contexts/EditingContext';
import LaunchPopupForm from '../components/forms/LaunchPopupForm';
import { formatLocalTimeHM } from '../utils/formatLocalTime';

type Place = Venue;

interface ExtendedMatch extends Match {
  venue?: string;
  /** Row built from global `parties` (carte) for "Événements du moment" */
  fromPartySource?: boolean;
}

interface DebugLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

const Home: React.FC = () => {
  const { getFilteredEvents, delegationMatches, isLoadingVenues, isAdmin, hasGenderMatches, parties } = useApp();
  const { isEditing } = useEditing();
  const { selectedEvent, setSelectedEvent } = useForm();
  const [events, setEvents] = useState<Place[]>([]);
  const [, setDebugLogs] = useState<DebugLog[]>([]);
  const [showLaunchPopupForm, setShowLaunchPopupForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadBarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (uploadBarRef.current) {
      uploadBarRef.current.style.setProperty('--progress', `${uploadProgress}%`);
    }
  }, [uploadProgress]);

  // Fonction pour ajouter un log de debug (mémorisée pour éviter les re-renders)
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const log: DebugLog = {
      id: `${getAppTimestamp()}-${Math.random()}`,
      message,
      type,
      timestamp: getAppNow()
    };
    setDebugLogs(prev => {
      const newLogs = [log, ...prev].slice(0, 20); // Garder seulement les 20 derniers logs
      return newLogs;
    });
  }, []);
  const [userPreferences, setUserPreferences] = useState({
    favoriteSports: (() => {
      const raw = localStorage.getItem('preferredSport');
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [raw];
      }
    })(),
    delegation: localStorage.getItem('preferredDelegation') || '',
    chessDelegation: localStorage.getItem('preferredChessDelegation') || '',
    championship: (() => {
      const raw = localStorage.getItem('preferredChampionship');
      if (!raw) return 'none';
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
      } catch {
        return raw;
      }
    })()
  });

  useEffect(() => {
    const updateEvents = () => {
      try {
        addLog('🔄 Début du chargement des événements', 'info');
        const filteredEvents = getFilteredEvents();
        addLog(`📊 Événements filtrés récupérés: ${filteredEvents?.length || 0}`, 'info');
        
        if (!filteredEvents || filteredEvents.length === 0) {
          addLog('⚠️ Aucun événement filtré trouvé', 'warning');
        }
        
        // Filtrer les venues sans id et mapper pour correspondre à l'interface Venue de types.ts
        const validEvents = filteredEvents
          .filter((venue): venue is typeof venue & { id: string } => !!venue.id)
          .map(venue => ({
            ...venue,
            type: 'venue' as const,
            matches: venue.matches || []
          }));
        
        addLog(`✅ Événements valides (avec id): ${validEvents.length}`, 'success');
        
        const eventsWithoutId = filteredEvents.filter(venue => !venue.id);
        if (eventsWithoutId.length > 0) {
          addLog(`⚠️ Événements sans id ignorés: ${eventsWithoutId.length}`, 'warning');
        }
        
        setEvents(validEvents);
        addLog('✅ Événements mis à jour avec succès', 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`❌ Erreur lors du chargement des événements: ${errorMessage}`, 'error');
        setEvents([]);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredSport' || e.key === 'preferredDelegation' || e.key === 'preferredChessDelegation' || e.key === 'preferredChampionship') {
        setUserPreferences(prev => ({
          favoriteSports: e.key === 'preferredSport'
            ? (() => {
                if (!e.newValue) return [];
                try {
                  const parsed = JSON.parse(e.newValue);
                  return Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  return [e.newValue];
                }
              })()
            : prev.favoriteSports,
          delegation: e.key === 'preferredDelegation'
            ? (e.newValue || '')
            : prev.delegation,
          chessDelegation: e.key === 'preferredChessDelegation'
            ? (e.newValue || '')
            : prev.chessDelegation,
          championship: e.key === 'preferredChampionship'
            ? (() => {
                if (!e.newValue) return 'none';
                try {
                  const parsed = JSON.parse(e.newValue);
                  return Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
                } catch {
                  return e.newValue;
                }
              })()
            : prev.championship
        }));
      }
      updateEvents();
    };

    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'favoriteSports' || e.detail.key === 'preferredDelegation' || e.detail.key === 'preferredChessDelegation' || e.detail.key === 'preferredChampionship') {
        setUserPreferences(prev => ({
          favoriteSports: e.detail.key === 'favoriteSports'
            ? JSON.parse(e.detail.value || '[]')
            : prev.favoriteSports,
          delegation: e.detail.key === 'preferredDelegation'
            ? (e.detail.value || '')
            : prev.delegation,
          chessDelegation: e.detail.key === 'preferredChessDelegation'
            ? (e.detail.value || '')
            : prev.chessDelegation,
          championship: e.detail.key === 'preferredChampionship'
            ? (() => {
                if (!e.detail.value) return 'none';
                try {
                  const parsed = JSON.parse(e.detail.value);
                  return Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
                } catch {
                  return e.detail.value;
                }
              })()
            : prev.championship
        }));
      }
      updateEvents();
    };

    const handleAdminLoginSuccess = () => {
      // Rafraîchir les événements après connexion admin
      updateEvents();
    };

    updateEvents();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('preferenceChange', handlePreferenceChange as EventListener);
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('preferenceChange', handlePreferenceChange as EventListener);
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    };
  }, [getFilteredEvents]);

  // Mettre à jour les événements quand les venues sont chargées
  useEffect(() => {
    addLog(`🔄 isLoadingVenues changé: ${isLoadingVenues}`, 'info');
    
    if (!isLoadingVenues) {
      try {
        addLog('📥 Chargement des événements après chargement des venues', 'info');
        const filteredEvents = getFilteredEvents();
        addLog(`📊 Événements récupérés après chargement: ${filteredEvents?.length || 0}`, 'info');
        
        const validEvents = filteredEvents
          .filter((venue): venue is typeof venue & { id: string } => !!venue.id)
          .map(venue => ({
            ...venue,
            type: 'venue' as const,
            matches: venue.matches || []
          }));
        
        addLog(`✅ Événements valides après chargement: ${validEvents.length}`, 'success');
        
        if (validEvents.length === 0) {
          addLog('⚠️ Aucun événement valide après chargement des venues', 'warning');
        }
        
        setEvents(validEvents);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`❌ Erreur lors du chargement après venues: ${errorMessage}`, 'error');
        setEvents([]);
      }
    } else {
      addLog('⏳ En attente du chargement des venues...', 'info');
    }
  }, [isLoadingVenues, getFilteredEvents]);


  // Fonction pour vérifier si un match est passé (reprise de App.tsx)
  const isMatchPassed = (startDate: string, endTime?: string, type: 'match' | 'party' = 'match') => {
    const now = getAppNow();
    const start = new Date(startDate);
    
    // Si l'événement est dans le futur, il n'est pas passé
    if (start > now) {
      return false;
    }
    
    // Si une heure de fin est spécifiée, l'utiliser
    if (endTime) {
      const end = new Date(endTime);
      return end < now;
    }
    
    // Pour les soirées sans heure de fin, on considère qu'elles se terminent à 23h
    if (type === 'party') {
      const end = new Date(startDate);
      end.setHours(23, 0, 0, 0);
      return end < now;
    }
    
    // Pour les matchs sans heure de fin, on considère qu'ils durent 1h
    const end = new Date(startDate);
    end.setHours(end.getHours() + 1);
    return end < now;
  };

  // Fonction pour faire défiler et centrer le premier match non passé, même si cela fait déborder l'item
  const scrollToFirstNonPassedMatch = () => {
    setTimeout(() => {
      const horizontalScrolls = document.querySelectorAll('.horizontal-scroll');
      horizontalScrolls.forEach(scrollContainer => {
        const firstNonPassedMatch = scrollContainer.querySelector('.event-item:not(.match-passed)');
        if (firstNonPassedMatch && scrollContainer) {
          // Centrage strict, même si l'item déborde
          const item = firstNonPassedMatch as HTMLElement;
          const container = scrollContainer as HTMLElement;
          const targetScrollLeft = item.offsetLeft + item.offsetWidth / 2 - container.offsetWidth / 2;
          container.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
          });
        }
      });
    }, 100);
  };

  // Effet pour déclencher le scroll automatique quand les événements changent
  useEffect(() => {
    if (events.length > 0) {
      scrollToFirstNonPassedMatch();
    }
  }, [events]);

  // Effet pour déclencher le scroll automatique quand les préférences utilisateur changent
  useEffect(() => {
    if (events.length > 0) {
      scrollToFirstNonPassedMatch();
    }
  }, [userPreferences, events]);

  const HOME_PARTY_SPORTS = new Set(['Soirée', 'Défilé', 'Defile', 'Pompom', 'Party']);

  const isHomePartySport = (sport: string) => HOME_PARTY_SPORTS.has(sport);

  const computeMomentEnd = (match: ExtendedMatch): Date => {
    if (match.endTime) return new Date(match.endTime);
    const end = new Date(match.date);
    if (match.sport === 'Soirée' || match.sport === 'Défilé' || isHomePartySport(match.sport)) {
      end.setHours(23, 0, 0, 0);
      return end;
    }
    end.setHours(end.getHours() + 1);
    return end;
  };

  const isLiveInMomentWindow = (match: ExtendedMatch, now: Date): boolean => {
    const start = new Date(match.date);
    const end = computeMomentEnd(match);
    return start <= now && end > now;
  };

  const partyToExtendedMatch = (party: Party): ExtendedMatch => ({
    id: `party-moment-${party.id}`,
    name: party.name,
    description: party.description,
    address: party.address,
    latitude: party.latitude,
    longitude: party.longitude,
    position: party.position,
    date: party.date,
    emoji: party.emoji,
    sport: party.sport,
    type: 'match',
    teams: party.name,
    time: '',
    endTime: party.endDate,
    venue: party.name,
    venueId: party.id,
    result: party.result,
    fromPartySource: true
  });

  /** Matchs en cours + soirées (carte) en cours — même fenêtre temporelle que l’ancienne section "live" */
  const momentEventsLive = useMemo(() => {
    const now = getAppNow();
    const fromVenues = events.flatMap((place) => {
      if (!('matches' in place) || !Array.isArray(place.matches)) return [];
      return place.matches.map(
        (match: Match): ExtendedMatch => ({
          ...match,
          venue: place.name,
          sport: place.sport
        })
      );
    }).filter((m) => isLiveInMomentWindow(m, now));
    const fromParties = parties
      .map(partyToExtendedMatch)
      .filter((m) => isLiveInMomentWindow(m, now));
    return [...fromVenues, ...fromParties].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events, parties]);

  const getMatchesByDelegation = (places: Place[], delegation: string) => {
    return places.flatMap(place => {
      if ('matches' in place && Array.isArray(place.matches)) {
        return place.matches.filter((match: Match) => 
          delegationMatches(match.teams, delegation)
        ).map((match: Match): ExtendedMatch => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getMatchesByDelegationAndSport = (places: Place[], delegation: string, sport: string) => {
    return places.flatMap(place => {
      // Vérifier le sport au niveau de la venue (pas du match)
      if (place.sport !== sport) return [];
      
      if ('matches' in place && Array.isArray(place.matches)) {
        return place.matches.filter((match: Match) => {
          // Vérifier la délégation
          const delegationMatch = delegationMatches(match.teams, delegation);
          if (!delegationMatch) return false;
          
          // Vérifier le championnat au niveau du match (comme dans EventsTab.tsx)
          if (userPreferences.championship !== 'none') {
            const matchDescription = match.description?.toLowerCase() || '';
            const isFemale = matchDescription.includes('féminin');
            const isMale = matchDescription.includes('masculin');
            const isMixed = matchDescription.includes('mixte');
            
            // Si le match n'a pas d'information de genre, l'inclure seulement si aucune préférence de championnat
            if (!isFemale && !isMale && !isMixed) {
              return true;
            }
            
            // Vérifier si le genre du match correspond à la préférence
            const championshipMatch = 
              (userPreferences.championship === 'female' && isFemale) ||
              (userPreferences.championship === 'male' && isMale) ||
              (userPreferences.championship === 'mixed' && isMixed);
            
            return championshipMatch;
          }
          
          return true;
        }).map((match: Match): ExtendedMatch => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatDateTime = (dateString: string, endTimeString?: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
    
    // Si on a une heure de fin, l'ajouter
    if (endTimeString) {
      const endDate = new Date(endTimeString);
      const endOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
      const formattedEndTime = endDate.toLocaleTimeString('fr-FR', endOptions);
      return `${formattedDate} - ${formattedEndTime}`;
    }
    
    return formattedDate;
  };

  const getSportIcon = (sport: string) => {
    const icons: { [key: string]: string } = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Handball': '🤾',
      'Rugby': '🏉',
      'Volleyball': '🏐',
      'Tennis': '🎾',
      'Badminton': '🏸',
      'Ping-pong': '🏓',
      'Ultimate': '🥏',
      'Natation': '🏊',
      'Cross': '👟',
      'Echecs': '♟️',
      'Athlétisme': '🏃‍♂️',
      'Spikeball': '⚡️',
      'Pétanque': '🍹',
      'Escalade': '🧗‍♂️',
      'Soirée': '🎵',
      'Défilé': '🎭',
      'Pompom': '🎀',
      'Party': '🎉',
      'Defile': '🎺'
    };
    return icons[sport] || '🏆';
  };

  const isPartyEventRow = (match: ExtendedMatch) =>
    match.fromPartySource === true || isHomePartySport(match.sport);

  const handleEventClick = (match: ExtendedMatch) => {
    const date = match.date.split('T')[0];
    const partyRow = isPartyEventRow(match);
    const newEvent: Event = {
      type: partyRow ? 'party' : 'match',
      time: formatLocalTimeHM(match.date),
      endTime: match.endTime ? formatLocalTimeHM(match.endTime) : undefined,
      date: date,
      name: partyRow ? match.teams : (match.description || match.name),
      teams: match.teams,
      description: match.description,
      color: partyRow ? '#9C27B0' : '#4CAF50',
      sport: match.sport,
      venue: match.venue || '',
      result: match.result,
      partyVenueId: partyRow ? match.venueId : undefined
    };
    
    setSelectedEvent(newEvent);
    
    // Ajouter une entrée dans l'historique pour permettre la fermeture avec le bouton retour
    window.history.pushState({ 
      path: location.pathname, 
      eventDetails: true 
    }, '', location.pathname);
  };

  const handleViewOnMap = (venue: Venue) => {
    // Stocker le lieu sélectionné dans localStorage pour que la carte puisse le récupérer
    localStorage.setItem('selectedVenue', JSON.stringify(venue));
    
    // Naviguer vers la page carte
    navigate('/map');
    
    // Fermer le popup
    setSelectedEvent(null);
  };

  const getChampionshipLabel = (championship: string): string => {
    switch (championship) {
      case 'male':
        return 'Masculin';
      case 'female':
        return 'Féminin';
      case 'mixed':
        return 'Mixte';
      default:
        return '';
    }
  };

  return (
    <div className="page-content scrollable home-page">
      <div className="matches-section">
        <section className="matches-section">
          <h2>Vos Matchs</h2>
          {userPreferences.favoriteSports.length > 0 && !userPreferences.favoriteSports.includes('none') ? (
            userPreferences.favoriteSports.map((sport: string) => {
              const matches = getMatchesByDelegationAndSport(events, userPreferences.delegation, sport);
              const { hasFemale, hasMale, hasMixed } = hasGenderMatches(sport);
              const championshipsCount = [hasFemale, hasMale, hasMixed].filter(Boolean).length;
              const needsChampionshipSelection =
                userPreferences.delegation &&
                userPreferences.delegation !== 'all' &&
                userPreferences.championship === 'none' &&
                championshipsCount > 1;

              return (
                <div key={sport} className="horizontal-scroll">
                  {needsChampionshipSelection ? (
                    isLoadingVenues ? (
                      <div className="no-matches loading-container">
                        <div className="section-loading-spinner"></div>
                      </div>
                    ) : (
                      <p className="no-matches">
                        Veuillez sélectionner votre championnat dans les paramètres.
                      </p>
                    )
                  ) : matches.length > 0 ? (
                    matches.map(match => (
                      <div 
                        key={match.id} 
                        className={`event-item home-event-item ${match.sport === 'Soirée' || match.sport === 'Défilé' ? 'party-event' : 'match-event'} ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`}
                        onClick={() => handleEventClick(match)}
                      >
                        <div className="event-header">
                          <span className="event-type-badge">
                            <span>{getSportIcon(sport)}</span>
                            <span>{sport}</span>
                          </span>
                          <span className="event-date">{formatDateTime(match.date, match.endTime)}</span>
                        </div>
                        <h3 className="event-name">{match.teams}</h3>
                        <p className="event-description">{match.description}</p>
                        {match.result && (
                          <div className="event-result">{match.result}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    isLoadingVenues ? (
                      <div className="no-matches loading-container">
                        <div className="section-loading-spinner"></div>
                      </div>
                    ) : (
                      <p className="no-matches">
                        {userPreferences.delegation && userPreferences.delegation !== 'all'
                          ? (() => {
                              const championshipLabel = userPreferences.championship !== 'none' 
                                ? ` ${getChampionshipLabel(userPreferences.championship)}` 
                                : '';
                              return `Aucun match de ${sport}${championshipLabel} trouvé pour la délégation de ${userPreferences.delegation}`;
                            })()
                          : userPreferences.championship === 'none'
                            ? 'Veuillez sélectionner votre délégation et votre championnat dans les paramètres.'
                            : 'Veuillez sélectionner votre délégation dans les paramètres.'}
                      </p>
                    )
                  )}
                </div>
              );
            })
          ) : (
            <div className="horizontal-scroll">
              {isLoadingVenues ? (
                <div className="no-matches loading-container">
                  <div className="section-loading-spinner"></div>
                </div>
              ) : (
                <p className="no-matches">Veuillez sélectionner votre sport dans les paramètres</p>
              )}
            </div>
          )}
        </section>

        {/* Liste des matchs de votre délégation */}
        <section className="matches-section">
          <h2>Votre Délégation</h2>
          <div className="horizontal-scroll">
            {(() => {
              const selectedSport = userPreferences.favoriteSports[0];
              const delegationForSection = selectedSport === 'Echecs'
                ? userPreferences.chessDelegation
                : userPreferences.delegation;

              if (!delegationForSection || delegationForSection === 'all') {
                return isLoadingVenues ? (
                  <div className="no-matches loading-container">
                    <div className="section-loading-spinner"></div>
                  </div>
                ) : (
                  <p className="no-matches">Veuillez sélectionner votre délégation dans les paramètres</p>
                );
              }

              const delegationMatchesList = getMatchesByDelegation(events, delegationForSection);
              if (delegationMatchesList.length === 0) {
                return isLoadingVenues ? (
                  <div className="no-matches loading-container">
                    <div className="section-loading-spinner"></div>
                  </div>
                ) : (
                  <p className="no-matches">Aucun match trouvé pour la délégation {delegationForSection} <br />
                  Veuillez sélectionner votre délégation dans les paramètres</p>
                );
              }

              return delegationMatchesList.map(match => (
                  <div 
                    key={match.id} 
                    className={`event-item home-event-item ${match.sport === 'Soirée' || match.sport === 'Défilé' ? 'party-event' : 'match-event'} ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`}
                    onClick={() => handleEventClick(match)}
                  >
                    <div className="event-header">
                      <span className="event-type-badge">
                        <span>{getSportIcon(match.sport || '')}</span>
                        <span>{match.sport}</span>
                      </span>
                      <span className="event-date">{formatDateTime(match.date, match.endTime)}</span>
                    </div>
                    <h3 className="event-name">{match.teams}</h3>
                    <p className="event-description">{match.description}</p>
                    {match.result && (
                      <div className="event-result">{match.result}</div>
                    )}
                  </div>
                ));
            })()}
          </div>
        </section>

        {/* Matchs en cours + soirées (liste carte) — voir momentEventsLive */}
        <section className="matches-section">
          <h2>Événements du moment</h2>
          <div className="horizontal-scroll">
            {momentEventsLive.length > 0 ? (
              momentEventsLive.map((match) => (
                <div
                  key={match.id}
                  className={`event-item home-event-item ${isPartyEventRow(match) ? 'party-event' : 'match-event'} ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`}
                  onClick={() => handleEventClick(match)}
                >
                  <div className="event-header">
                    <span className="event-type-badge">
                      <span>{getSportIcon(match.sport || '')}</span>
                      <span>{match.sport}</span>
                    </span>
                    <span className="event-date">{formatDateTime(match.date, match.endTime)}</span>
                  </div>
                  <div className="event-title-container">
                    <h3 className="event-name">{match.teams}</h3>
                  </div>
                  <p className="event-description">{match.description}</p>
                  {match.result && <p className="event-result">Résultat : {match.result}</p>}
                </div>
              ))
            ) : (
              isLoadingVenues ? (
                <div className="no-matches loading-container">
                  <div className="section-loading-spinner"></div>
                </div>
              ) : (
                <p className="no-matches">Aucun événement en ce moment</p>
              )
            )}
          </div>
        </section>
      </div>

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewOnMap={handleViewOnMap}
          venues={events}
        />
      )}

      {isAdmin && isEditing && (
        <button
          type="button"
          className="add-pub-button"
          onClick={() => setShowLaunchPopupForm(true)}
          title="Ajouter une pub"
        >
          +
        </button>
      )}
      {uploading && (
        <div
          ref={uploadBarRef}
          className="upload-progress-bar"
          role="status"
          aria-live="polite"
          aria-label="Upload en cours"
        >
          <div className="upload-progress-bar__title">Upload en cours...</div>
          <div className="upload-progress-bar__track">
            <div className="upload-progress-bar__fill" />
          </div>
          <div className="upload-progress-bar__percent">{Math.round(uploadProgress)}%</div>
          <div className="upload-progress-bar__subtitle">
            {uploadProgress < 100 ? 'Téléchargement du fichier...' : 'Finalisation de l\'upload...'}
          </div>
        </div>
      )}
      <LaunchPopupForm
        isOpen={showLaunchPopupForm}
        onClose={() => setShowLaunchPopupForm(false)}
        uploading={uploading}
        setUploading={setUploading}
        uploadProgress={uploadProgress}
        setUploadProgress={setUploadProgress}
      />
    </div>
  );
};

export default Home; 