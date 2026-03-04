/**
 * @fileoverview Composant pour l'onglet Événements
 * 
 * Ce composant gère :
 * - Affichage de la liste des événements (matchs et soirées)
 * - Filtres par type d'événement, délégation, lieu et genre
 * - Navigation vers la carte lors de la sélection d'un événement
 * - Gestion des événements passés avec styles différenciés
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import ReactGA from 'react-ga4';
import { Venue } from '../types';
import { delegationMatches, getAllDelegationsFromVenues } from '../services/TeamService';
import './EventsTab.css';

interface Party {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  date: string;
  sport?: string;
  result?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  endTime?: string;
  description: string;
  address: string;
  location: [number, number];
  type: 'match' | 'party';
  teams?: string;
  venue?: string;
  venueId?: string;
  isPassed: boolean;
  sport?: string;
  result?: string;
}

interface EventsTabProps {
  venues: Venue[];
  parties: Party[];
  isAdmin: boolean;
  onEventSelect: (event: Event) => void;
  triggerMarkerUpdate: () => void;
  isVenuesLoading?: boolean;
}

const EventsTab = ({ venues, parties, isAdmin, onEventSelect, triggerMarkerUpdate, isVenuesLoading }: EventsTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);
  const [eventFilter, setEventFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapEventFilter');
    return saved || 'all';
  });
  const [delegationFilter, setDelegationFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapDelegationFilter');
    return saved || 'all';
  });
  const [venueFilter, setVenueFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapVenueFilter');
    return saved || 'Tous';
  });
  const [showFemale, setShowFemale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowFemale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showMale, setShowMale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showMixed, setShowMixed] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMixed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    const saved = localStorage.getItem('eventsTabShowFilters');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isStarFilterActive, setIsStarFilterActive] = useState(() => {
    const saved = localStorage.getItem('starFilterActive');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Gérer l'état de chargement
  useEffect(() => {
    // Si isVenuesLoading est fourni, l'utiliser directement (priorité absolue)
    if (isVenuesLoading !== undefined) {
      setIsLoading(isVenuesLoading);
      hasInitialized.current = true;
      return;
    }
    
    // Sinon, utiliser la logique de détection automatique
    // Les données sont considérées comme chargées une fois qu'on a reçu les venues depuis Firebase
    // (venues commence comme tableau vide [] puis est rempli après le chargement Firebase)
    // Si venues a des données, le chargement est terminé
    // Sinon, attendre un court délai pour permettre le chargement initial
    if (venues.length > 0) {
      hasInitialized.current = true;
      setIsLoading(false);
    } else if (!hasInitialized.current) {
      // Premier rendu avec venues vide : attendre un peu pour voir si des données arrivent
      const timer = setTimeout(() => {
        hasInitialized.current = true;
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Après l'initialisation, le chargement est toujours terminé
      setIsLoading(false);
    }
  }, [venues, isVenuesLoading]);

  // Fonction pour vérifier si un match est passé
  const isMatchPassed = (startDate: string, endTime?: string) => {
    const now = new Date();
    const start = new Date(startDate);

    if (start > now) {
      return false;
    }

    if (endTime) {
      const end = new Date(endTime);
      return end < now;
    }

    // Par défaut, considérer comme passé si la date de début est passée
    return start < now;
  };

  // Fonction pour obtenir l'icône du sport
  const getSportIcon = (sport: string) => {
    const sportIcons: { [key: string]: string } = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Handball': '🤾',
      'Rugby': '🏉',
      'Ultimate': '🥏',
      'Natation': '🏊',
      'Badminton': '🏸',
      'Tennis': '🎾',
      'Cross': '👟',
      'Volleyball': '🏐',
      'Ping-pong': '🏓',
      'Echecs': '♟️',
      'Athlétisme': '🏃‍♂️',
      'Spikeball': '⚡️',
      'Pétanque': '🍹',
      'Escalade': '🧗‍♂️',
    };
    return sportIcons[sport] || '🏆';
  };

  // Fonction pour formater la date et l'heure
  const formatDateTime = (dateString: string, endTimeString?: string) => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const day = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (endTimeString) {
      const endTime = new Date(endTimeString);
      const endHours = endTime.getHours().toString().padStart(2, '0');
      const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
      return `${day} ${hours}:${minutes} - ${endHours}:${endMinutes}`;
    }
    
    return `${day} ${hours}:${minutes}`;
  };

  const getAllDelegations = () => getAllDelegationsFromVenues(venues);

  // Fonction pour obtenir les options de lieux
  const getVenueOptions = () => {
    if (eventFilter === 'all' || eventFilter === 'match') {
      const filteredVenues = venues.filter(venue => {
        const delegationMatch =
          delegationFilter === 'all' ||
          (venue.matches && venue.matches.some(match =>
            delegationMatches(match.teams, delegationFilter)
          ));
        let genderMatch = true;
        if (venue.matches && venue.matches.length > 0) {
          genderMatch = venue.matches.some(match => {
            const desc = match.description?.toLowerCase() || '';
            const isFemale = desc.includes('féminin');
            const isMale = desc.includes('masculin');
            const isMixed = desc.includes('mixte');
            return (
              (isFemale && showFemale) ||
              (isMale && showMale) ||
              (isMixed && showMixed) ||
              (!isFemale && !isMale && !isMixed)
            );
          });
        }
        return delegationMatch && genderMatch;
      });
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        ...filteredVenues.map(venue => ({ value: venue.id, label: venue.name }))
      ];
    }

    if (eventFilter === 'party') {
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        { value: 'place-stanislas', label: 'Place Stanislas' },
        { value: 'parc-expo', label: 'Parc Expo' },
        { value: 'zenith', label: 'Zénith' }
      ];
    }

    const filteredVenues = venues.filter(venue => {
      if (venue.sport !== eventFilter) return false;
      const delegationMatch =
        delegationFilter === 'all' ||
        (venue.matches && venue.matches.some(match =>
          delegationMatches(match.teams, delegationFilter)
        ));
      let genderMatch = true;
      if (venue.matches && venue.matches.length > 0) {
        genderMatch = venue.matches.some(match => {
          const desc = match.description?.toLowerCase() || '';
          const isFemale = desc.includes('féminin');
          const isMale = desc.includes('masculin');
          const isMixed = desc.includes('mixte');
          return (
            (isFemale && showFemale) ||
            (isMale && showMale) ||
            (isMixed && showMixed) ||
            (!isFemale && !isMale && !isMixed)
          );
        });
      }
      return delegationMatch && genderMatch;
    });
    return [
      { value: 'Tous', label: 'Tous les lieux' },
      ...filteredVenues.map(venue => ({ value: venue.id, label: venue.name }))
    ];
  };

  // Fonction pour vérifier si un sport a des matchs par genre
  const hasGenderMatches = (sport: string): { hasFemale: boolean, hasMale: boolean, hasMixed: boolean } => {
    let hasFemale = false;
    let hasMale = false;
    let hasMixed = false;

    venues.forEach(venue => {
      if (venue.sport === sport && venue.matches) {
        venue.matches.forEach(match => {
          if (match.description?.toLowerCase().includes('féminin')) hasFemale = true;
          if (match.description?.toLowerCase().includes('masculin')) hasMale = true;
          if (match.description?.toLowerCase().includes('mixte')) hasMixed = true;
        });
      }
    });

    return { hasFemale, hasMale, hasMixed };
  };

  // Fonction pour scroller vers le premier événement non passé
  const scrollToFirstNonPassedEvent = () => {
    const eventsList = document.querySelector('.events-list');
    if (eventsList) {
      const firstNonPassedEvent = eventsList.querySelector('.event-item:not(.passed)');
      if (firstNonPassedEvent) {
        const containerRect = eventsList.getBoundingClientRect();
        const elementRect = firstNonPassedEvent.getBoundingClientRect();
        const offset = 15;
        const scrollTop = eventsList.scrollTop + (elementRect.top - containerRect.top) - offset;
        eventsList.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    }
  };

  // Fonction helper pour dispatcher un CustomEvent de synchronisation des filtres
  const dispatchFilterChangeEvent = (key: string, value: string | boolean) => {
    window.dispatchEvent(new CustomEvent('filterChange', {
      detail: { key, value }
    }));
  };

  // Fonctions wrapper pour sauvegarder les filtres dans le localStorage
  const setEventFilterWithSave = (value: string) => {
    setEventFilter(value);
    localStorage.setItem('mapEventFilter', value);
    dispatchFilterChangeEvent('mapEventFilter', value);
  };

  const setDelegationFilterWithSave = (value: string) => {
    setDelegationFilter(value);
    localStorage.setItem('mapDelegationFilter', value);
    dispatchFilterChangeEvent('mapDelegationFilter', value);
  };

  const setVenueFilterWithSave = (value: string) => {
    setVenueFilter(value);
    localStorage.setItem('mapVenueFilter', value);
    dispatchFilterChangeEvent('mapVenueFilter', value);
  };

  const setShowFemaleWithSave = (value: boolean) => {
    setShowFemale(value);
    localStorage.setItem('mapShowFemale', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowFemale', value);
  };

  const setShowMaleWithSave = (value: boolean) => {
    setShowMale(value);
    localStorage.setItem('mapShowMale', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowMale', value);
  };

  const setShowMixedWithSave = (value: boolean) => {
    setShowMixed(value);
    localStorage.setItem('mapShowMixed', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowMixed', value);
  };

  // Handlers pour les changements de filtres
  const handleEventFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_event_filter',
      label: e.target.value
    });
    setEventFilterWithSave(e.target.value);
    setVenueFilterWithSave('Tous');
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleDelegationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_delegation_filter',
      label: e.target.value
    });
    setDelegationFilterWithSave(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleVenueFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_venue_filter',
      label: e.target.value
    });
    setVenueFilterWithSave(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleGenderFilterChange = (gender: 'female' | 'male' | 'mixed') => {
    if (gender === 'female') setShowFemaleWithSave(!showFemale);
    if (gender === 'male') setShowMaleWithSave(!showMale);
    if (gender === 'mixed') setShowMixedWithSave(!showMixed);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleStarFilterClick = () => {
    const preferredSportRaw = localStorage.getItem('preferredSport') || 'all';
    let preferredSport;
    try {
      const parsed = JSON.parse(preferredSportRaw);
      preferredSport = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredSport = preferredSportRaw;
    }
    const preferredDelegation = localStorage.getItem('preferredDelegation') || 'all';
    const preferredChampionshipRaw = localStorage.getItem('preferredChampionship') || 'none';
    let preferredChampionship;
    try {
      const parsed = JSON.parse(preferredChampionshipRaw);
      preferredChampionship = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredChampionship = preferredChampionshipRaw;
    }
    
    const newStarFilterActive = !isStarFilterActive;
    setIsStarFilterActive(newStarFilterActive);
    localStorage.setItem('starFilterActive', JSON.stringify(newStarFilterActive));
    
    if (!isStarFilterActive) {
      setEventFilterWithSave(preferredSport === 'none' ? 'match' : preferredSport);
      setDelegationFilterWithSave(preferredDelegation);
      
      if (preferredChampionship !== 'none') {
        setShowFemaleWithSave(preferredChampionship === 'female');
        setShowMaleWithSave(preferredChampionship === 'male');
        setShowMixedWithSave(preferredChampionship === 'mixed');
      } else {
        setShowFemaleWithSave(true);
        setShowMaleWithSave(true);
        setShowMixedWithSave(true);
      }
    } else {
      setEventFilterWithSave('all');
      setDelegationFilterWithSave('all');
      setShowFemaleWithSave(true);
      setShowMaleWithSave(true);
      setShowMixedWithSave(true);
    }
    
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleEventSelect = (event: Event) => {
    onEventSelect(event);
  };

  // Fonction optimisée pour récupérer tous les événements
  const getAllEvents = useMemo(() => {
    const events: Event[] = [];

    // Ajouter les matchs
    venues.forEach(venue => {
      if (venue.matches && venue.matches.length > 0) {
        venue.matches.forEach(match => {
          events.push({
            id: `match-${venue.id}-${match.id}`,
            name: match.teams,
            date: match.date,
            endTime: match.endTime,
            description: match.description,
            address: venue.address || `${venue.latitude}, ${venue.longitude}`,
            location: [venue.latitude, venue.longitude],
            type: 'match',
            teams: match.teams,
            venue: venue.name,
            venueId: venue.id,
            isPassed: isMatchPassed(match.date, match.endTime),
            sport: venue.sport,
            result: match.result
          });
        });
      }
    });

    // Ajouter les soirées (visibles pour tous)
    parties.forEach(party => {
      const startDate = new Date(party.date);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 6);
      
      events.push({
        id: `party-${party.id || party.name}`,
        name: party.name,
        date: party.date,
        endTime: endDate.toISOString(),
        description: party.description,
        address: party.address || `${party.latitude}, ${party.longitude}`,
        location: [party.latitude, party.longitude],
        type: 'party',
        isPassed: isMatchPassed(party.date, endDate.toISOString()),
        sport: party.sport,
        result: party.result
      });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [venues, parties, isAdmin]);

  // Fonction optimisée pour filtrer les événements
  const getFilteredEvents = useMemo(() => {
    const allEvents = getAllEvents;
    
    return allEvents.filter(event => {
      const typeMatch = eventFilter === 'all' || 
        (eventFilter === 'none' ? false :
          (eventFilter === 'party' && event.type === 'party') ||
          (eventFilter === 'match' && event.type === 'match') ||
          (event.type === 'match' && event.sport === eventFilter && eventFilter !== 'match'));

      const delegationMatch = event.type === 'party' 
        ? true 
        : (delegationFilter === 'all' || (event.teams && delegationMatches(event.teams, delegationFilter)));

      let venueMatch = true;
      if (venueFilter !== 'Tous') {
        if (event.type === 'party') {
          let partyId = '';
          switch (event.name) {
            case 'Place Stanislas':
              partyId = 'place-stanislas';
              break;
            case 'Parc Expo':
            case 'Parc Expo Hall A':
            case 'Parc Expo Hall B':
              partyId = 'parc-expo';
              break;
            case 'Zénith':
              partyId = 'zenith';
              break;
            default:
              partyId = event.name.toLowerCase().replace(/\s+/g, '-');
          }
          venueMatch = partyId === venueFilter;
        } else {
          venueMatch = event.venueId === venueFilter;
        }
      }

      const isFemale = event.description?.toLowerCase().includes('féminin');
      const isMale = event.description?.toLowerCase().includes('masculin');
      const isMixed = event.description?.toLowerCase().includes('mixte');
      const genderMatch = (!isFemale && !isMale && !isMixed) || 
        (isFemale && showFemale) || 
        (isMale && showMale) ||
        (isMixed && showMixed);

      return typeMatch && delegationMatch && venueMatch && genderMatch;
    });
  }, [getAllEvents, eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed, isAdmin]);

  // Effet pour détecter les changements de filtres et mettre à jour l'état de l'étoile
  useEffect(() => {
    const preferredSportRaw = localStorage.getItem('preferredSport') || 'all';
    let preferredSport;
    try {
      const parsed = JSON.parse(preferredSportRaw);
      preferredSport = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredSport = preferredSportRaw;
    }
    const preferredDelegation = localStorage.getItem('preferredDelegation') || 'all';
    const preferredChampionshipRaw = localStorage.getItem('preferredChampionship') || 'none';
    let preferredChampionship;
    try {
      const parsed = JSON.parse(preferredChampionshipRaw);
      preferredChampionship = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredChampionship = preferredChampionshipRaw;
    }

    const sportMatches = eventFilter === (preferredSport === 'none' ? 'match' : preferredSport);
    const delegationMatch = delegationFilter === preferredDelegation;
    const genderMatches = preferredChampionship === 'none' ? 
      (showFemale && showMale && showMixed) :
      (preferredChampionship === 'female' ? showFemale && !showMale && !showMixed :
       preferredChampionship === 'male' ? !showFemale && showMale && !showMixed :
       preferredChampionship === 'mixed' ? !showFemale && !showMale && showMixed : false);

    const shouldBeActive = sportMatches && delegationMatch && genderMatches;
    
    if (shouldBeActive !== isStarFilterActive) {
      setIsStarFilterActive(shouldBeActive);
      localStorage.setItem('starFilterActive', JSON.stringify(shouldBeActive));
    }
  }, [eventFilter, delegationFilter, showFemale, showMale, showMixed, isStarFilterActive]);

  // Écouter les changements des filtres dans le localStorage pour synchronisation
  // (depuis d'autres onglets/fenêtres)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      
      switch (e.key) {
        case 'starFilterActive':
          if (e.newValue !== null) {
            const newValue = e.newValue === 'true';
            setIsStarFilterActive(newValue);
          }
          break;
        case 'mapEventFilter':
          if (e.newValue !== null && e.newValue !== eventFilter) {
            setEventFilter(e.newValue);
          }
          break;
        case 'mapDelegationFilter':
          if (e.newValue !== null && e.newValue !== delegationFilter) {
            setDelegationFilter(e.newValue);
          }
          break;
        case 'mapVenueFilter':
          if (e.newValue !== null && e.newValue !== venueFilter) {
            setVenueFilter(e.newValue);
          }
          break;
        case 'mapShowFemale':
          if (e.newValue !== null) {
            const newValue = e.newValue === 'true';
            if (newValue !== showFemale) {
              setShowFemale(newValue);
            }
          }
          break;
        case 'mapShowMale':
          if (e.newValue !== null) {
            const newValue = e.newValue === 'true';
            if (newValue !== showMale) {
              setShowMale(newValue);
            }
          }
          break;
        case 'mapShowMixed':
          if (e.newValue !== null) {
            const newValue = e.newValue === 'true';
            if (newValue !== showMixed) {
              setShowMixed(newValue);
            }
          }
          break;
        case 'eventsTabShowFilters':
          if (e.newValue !== null) {
            const newValue = e.newValue === 'true';
            setShowFilters(newValue);
          }
          break;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed]);

  // Écouter les changements de filtres via CustomEvent (même onglet)
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<{ key: string; value: string | boolean }>) => {
      const { key, value } = e.detail;
      
      switch (key) {
        case 'mapEventFilter':
          if (typeof value === 'string' && value !== eventFilter) {
            setEventFilter(value);
          }
          break;
        case 'mapDelegationFilter':
          if (typeof value === 'string' && value !== delegationFilter) {
            setDelegationFilter(value);
          }
          break;
        case 'mapVenueFilter':
          if (typeof value === 'string' && value !== venueFilter) {
            setVenueFilter(value);
          }
          break;
        case 'mapShowFemale':
          if (typeof value === 'boolean' && value !== showFemale) {
            setShowFemale(value);
          }
          break;
        case 'mapShowMale':
          if (typeof value === 'boolean' && value !== showMale) {
            setShowMale(value);
          }
          break;
        case 'mapShowMixed':
          if (typeof value === 'boolean' && value !== showMixed) {
            setShowMixed(value);
          }
          break;
        case 'eventsTabShowFilters':
          if (typeof value === 'boolean' && value !== showFilters) {
            setShowFilters(value);
          }
          break;
      }
    };

    window.addEventListener('filterChange', handleFilterChange as EventListener);
    return () => window.removeEventListener('filterChange', handleFilterChange as EventListener);
  }, [eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed, showFilters]);

  return (
    <div className="events-panel">
      <div className="events-panel-header">
        <h3>Événements</h3>
        {showFilters && (
          <>
            <button
              className={`filter-reset-button star${isStarFilterActive ? ' active' : ''}`}
              onClick={handleStarFilterClick}
              title="Appliquer vos préférences"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.5L14.5 8.5L22 9L16 14.5L17.5 22L12 18L6.5 22L8 14.5L2 9L9.5 8.5L12 1.5Z"/>
              </svg>
            </button>
            <button
              className="filter-reset-button"
              onClick={() => {
                setEventFilterWithSave('all');
                setDelegationFilterWithSave('all');
                setVenueFilterWithSave('Tous');
                setShowFemaleWithSave(true);
                setShowMaleWithSave(true);
                setShowMixedWithSave(true);
                setIsStarFilterActive(false);
                localStorage.setItem('starFilterActive', 'false');
                triggerMarkerUpdate();
                setTimeout(scrollToFirstNonPassedEvent, 100);
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
          </>
        )}
        <button 
          className="filter-toggle-button"
          onClick={() => {
            const newValue = !showFilters;
            setShowFilters(newValue);
            localStorage.setItem('eventsTabShowFilters', JSON.stringify(newValue));
            dispatchFilterChangeEvent('eventsTabShowFilters', newValue);
          }}
        >
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <path d="M18 4H6l5 6.5v4.5l2 2v-6.5L18 4Z"/>
          </svg>
        </button>
      </div>
      <div className={`event-filters ${showFilters ? 'show' : ''}`}>
        {showFilters && (
          <div className="filter-row">
            <div className="filter-buttons-row"></div>
            <select 
              className="filter-select"
              value={eventFilter}
              onChange={handleEventFilterChange}
            >
              <option value="none">Aucun</option>
              <option value="all">Tous les événements</option>
              <option value="match">Tous les sports</option>
              <option value="party">Soirées et Défilé 🎉</option>
              <option value="Football">Football ⚽</option>
              <option value="Basketball">Basketball 🏀</option>
              <option value="Handball">Handball 🤾</option>
              <option value="Rugby">Rugby 🏉</option>
              <option value="Ultimate">Ultimate 🥏</option>
              <option value="Natation">Natation 🏊</option>
              <option value="Badminton">Badminton 🏸</option>
              <option value="Tennis">Tennis 🎾</option>
              <option value="Cross">Cross 👟</option>
              <option value="Volleyball">Volleyball 🏐</option>
              <option value="Ping-pong">Ping-pong 🏓</option>
              <option value="Echecs">Echecs ♟️</option>
              <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
              <option value="Spikeball">Spikeball ⚡️</option>
              <option value="Pétanque">Pétanque 🍹</option>
              <option value="Escalade">Escalade 🧗‍♂️</option>
            </select>

            <select
              className="filter-select"
              value={delegationFilter}
              onChange={handleDelegationFilterChange}
            >
              <option value="all">Toutes les délégations</option>
              {getAllDelegations().map(delegation => (
                <option key={delegation} value={delegation}>
                  {delegation}
                </option>
              ))}
            </select>

            {eventFilter !== 'none' && eventFilter !== 'all' && eventFilter !== 'match' && (
              <select 
                className="filter-select"
                value={venueFilter}
                onChange={handleVenueFilterChange}
              >
                {getVenueOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {eventFilter !== 'all' && eventFilter !== 'party' && (() => {
              const { hasFemale, hasMale, hasMixed } = hasGenderMatches(eventFilter);
              if (!hasFemale && !hasMale && !hasMixed) return null;
              return (
                <div className="gender-filter-row">
                  {hasFemale && (
                    <button 
                      className={`gender-filter-button ${showFemale ? 'active' : ''}`}
                      onClick={() => handleGenderFilterChange('female')}
                    >
                      Féminin
                    </button>
                  )}
                  {hasMale && (
                    <button 
                      className={`gender-filter-button ${showMale ? 'active' : ''}`}
                      onClick={() => handleGenderFilterChange('male')}
                    >
                      Masculin
                    </button>
                  )}
                  {hasMixed && (
                    <button 
                      className={`gender-filter-button ${showMixed ? 'active' : ''}`}
                      onClick={() => handleGenderFilterChange('mixed')}
                    >
                      Mixte
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <div className="events-list">
        {isLoading ? (
          <div className="chat-loading-spinner-container">
            <div className="chat-loading-spinner"></div>
            <div className="chat-loading-text">Chargement des événements...</div>
          </div>
        ) : getFilteredEvents.length === 0 ? (
          <div className="chat-empty-message">
            Aucun événement trouvé
          </div>
        ) : (
          getFilteredEvents.map((event) => (
            <div
              key={event.id}
              className={`event-item ${event.isPassed ? 'passed' : ''} ${event.type === 'match' ? 'match-event' : 'party-event'}`}
              onClick={() => handleEventSelect(event)}
            >
              <div className="event-header">
                <span className="event-type-badge">
                  {event.type === 'match' ? (
                    <>
                      <span>{getSportIcon(event.sport || '')}</span>
                      <span>{event.sport}</span>
                    </>
                  ) : event.sport === 'Defile' ? (
                    <>
                      <span>🎺</span>
                      <span>Défilé</span>
                    </>
                  ) : event.sport === 'Pompom' ? (
                    <>
                      <span>🎀</span>
                      <span>Pompom</span>
                    </>
                  ) : event.name?.startsWith('Parc Expo') && event.description.includes('Showcase') ? (
                    <>
                      <span>🎤</span>
                      <span>SHOWCASE</span>
                    </>
                  ) : (event.name?.startsWith('Parc Expo') || event.name === 'Zénith') && event.description.includes('DJ Contest') ? (
                    <>
                      <span>🎧</span>
                      <span>DJ CONTEST</span>
                    </>
                  ) : (
                    <>
                      <span>🎉</span>
                      <span>Soirée</span>
                    </>
                  )}
                </span>
                <span className="event-date">{formatDateTime(event.date, event.endTime)}</span>
              </div>
              <div className="event-title-container">
                <h3 className="event-name">{event.name}</h3>
              </div>
              {event.type === 'match' && (
                <>
                  <p className="event-description">{event.description}</p>
                  <p className="event-venue">{event.venue}</p>
                  {event.result && (
                    <p className="event-result">Résultat : {event.result}</p>
                  )}
                </>
              )}
              {event.type === 'party' && (
                <>
                  <p className="event-description">{event.description}</p>
                  {event.result && event.sport !== 'Defile' && (
                    <p className="event-result">Résultat : {event.result}</p>
                  )}
                </>
              )}
              <div className="event-actions">
                <button
                  className="maps-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank');
                  }}
                >
                  Ouvrir dans Google Maps
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsTab;
