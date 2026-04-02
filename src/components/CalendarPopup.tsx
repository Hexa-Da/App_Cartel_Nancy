import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './CalendarPopup.css';
import { Venue } from '../types';
import { Party } from '../types/venue';
import Header from './Header';
import BottomNav from './BottomNav';
import EventDetails, { Event } from '../components/EventDetails';
import { useForm } from '../contexts/FormContext';
import { delegationMatches, getAllDelegationsFromVenues } from '../services/TeamService';

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  venues: Venue[];
  eventFilter: string;
  onViewOnMap: (venue: Venue) => void;
  delegationFilter: string;
  venueFilter: string;
  showFemale: boolean;
  showMale: boolean;
  showMixed: boolean;
  onEventFilterChange: (value: string) => void;
  onDelegationFilterChange: (value: string) => void;
  onVenueFilterChange: (value: string) => void;
  onGenderFilterChange: (gender: 'female' | 'male' | 'mixed') => void;
  // Nouvelles props pour définir directement les filtres de genre
  onSetGenderFilters?: (female: boolean, male: boolean, mixed: boolean) => void;
  // Props pour synchroniser l'état des filtres
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
  // Props pour le Header
  onChat?: () => void;
  onEmergency?: () => void;
  onAdmin?: () => void;
  isAdmin?: boolean;
  user?: any;
  showChat?: boolean;
  unreadCount?: number;
  onEditModeToggle?: () => void;
  isEditing?: boolean;
  onBack?: () => void;
  isBackDisabled?: boolean;
  isVenuesLoading?: boolean;
  /** Soirées chargées depuis Firebase (editableData/partyResults), pour afficher les résultats */
  parties?: Party[];
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({ 
  isOpen, 
  onClose, 
  venues, 
  eventFilter, 
  onViewOnMap,
  delegationFilter,
  venueFilter,
  showFemale,
  showMale,
  showMixed,
  onEventFilterChange,
  onDelegationFilterChange,
  onVenueFilterChange,
  onGenderFilterChange,
  // Nouvelles props pour définir directement les filtres de genre
  onSetGenderFilters,
  // Props pour synchroniser l'état des filtres
  showFilters,
  onShowFiltersChange,
  // Props pour le Header
  onChat,
  onEmergency,
  onAdmin,
  showChat,
  unreadCount,
  onEditModeToggle,
  isEditing,
  onBack,
  isBackDisabled,
  isVenuesLoading,
  parties: appParties = []
}) => {
  const { selectedEvent, setSelectedEvent } = useForm();
  const location = useLocation();
  const previousPathnameRef = useRef<string>(location.pathname);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);
  const [isStarFilterActive, setIsStarFilterActive] = useState(() => {
    const saved = localStorage.getItem('starFilterActive');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const [pixelsPerHour, setPixelsPerHour] = useState(43.33);

  // Gérer l'état de chargement
  useEffect(() => {
    // Si isVenuesLoading est fourni, l'utiliser directement
    if (isVenuesLoading !== undefined) {
      setIsLoading(isVenuesLoading);
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

  // Calculer dynamiquement pixelsPerHour en fonction de la hauteur réelle du conteneur
  useEffect(() => {
    if (!isOpen || isLoading) return;

    const calculatePixelsPerHour = () => {
      if (eventsContainerRef.current) {
        const containerHeight = eventsContainerRef.current.offsetHeight;
        // Avec justify-content: space-between, il y a 16 heures (08:00 à 23:00)
        // ce qui crée 15 intervalles entre elles
        // La hauteur totale est divisée en 15 intervalles égaux
        const numberOfIntervals = 15; // 16 heures - 1 = 15 intervalles
        // Calculer le ratio en divisant la hauteur par le nombre d'intervalles
        const calculatedPixelsPerHour = containerHeight / numberOfIntervals;
        if (calculatedPixelsPerHour > 0 && !isNaN(calculatedPixelsPerHour) && isFinite(calculatedPixelsPerHour)) {
          setPixelsPerHour(calculatedPixelsPerHour);
        }
      }
    };

    // Attendre que le conteneur soit rendu avant de calculer
    const timeoutId = setTimeout(() => {
      calculatePixelsPerHour();
    }, 150);

    // Calculer au montage et au redimensionnement
    window.addEventListener('resize', calculatePixelsPerHour);
    
    // Utiliser ResizeObserver pour détecter les changements de taille du conteneur
    let resizeObserver: ResizeObserver | null = null;
    if (eventsContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        // Petit délai pour s'assurer que le layout est terminé
        setTimeout(calculatePixelsPerHour, 50);
      });
      resizeObserver.observe(eventsContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculatePixelsPerHour);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isOpen, isLoading]);

  // Écouter les changements de l'état de l'étoile dans le localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'starFilterActive') {
        const newValue = e.newValue === 'true';
        setIsStarFilterActive(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Effet pour détecter les changements de filtres et mettre à jour l'état de l'étoile
  useEffect(() => {
    // Vérifier si les filtres actuels correspondent aux préférences
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

    // Vérifier si les filtres correspondent aux préférences
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

  // Fermer EventDetails si le popup se ferme
  useEffect(() => {
    if (!isOpen && selectedEvent) {
      setSelectedEvent(null);
    }
  }, [isOpen, selectedEvent, setSelectedEvent]);

  // Fermer EventDetails si l'utilisateur change de page
  useEffect(() => {
    if (selectedEvent && location.pathname !== previousPathnameRef.current) {
      setSelectedEvent(null);
    }
    previousPathnameRef.current = location.pathname;
  }, [location.pathname, selectedEvent, setSelectedEvent]);

  const sportOptions = [
    { value: 'none', label: 'Aucun' },
    { value: 'all', label: 'Tous les événements' },
    { value: 'party', label: 'Soirées et Défilé 🎉' },
    { value: 'match', label: 'Tous les sports' },
    { value: 'Football', label: 'Football ⚽' },
    { value: 'Basketball', label: 'Basketball 🏀' },
    { value: 'Handball', label: 'Handball 🤾' },
    { value: 'Rugby', label: 'Rugby 🏉' },
    { value: 'Volleyball', label: 'Volleyball 🏐' },
    { value: 'Tennis', label: 'Tennis 🎾' },
    { value: 'Badminton', label: 'Badminton 🏸' },
    { value: 'Ping-pong', label: 'Ping-pong 🏓' },
    { value: 'Ultimate', label: 'Ultimate 🥏' },
    { value: 'Natation', label: 'Natation 🏊' },
    { value: 'Cross', label: 'Cross 👟' },
    { value: 'Echecs', label: 'Echecs ♟️' },
    { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
    { value: 'Spikeball', label: 'Spikeball ⚡️' },
    { value: 'Pétanque', label: 'Pétanque 🍹' },
    { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
  ];

  const days = [
    { date: '2026-04-16', label: 'Jeudi' },
    { date: '2026-04-17', label: 'Vendredi' },
    { date: '2026-04-18', label: 'Samedi' }
  ];

  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  const getVenueOptions = () => {
    const filteredVenues = venues.filter(venue => venue.sport === eventFilter);
    return [
      { value: 'Tous', label: 'Tous les lieux' },
      ...filteredVenues.map(venue => ({ value: venue.id, label: venue.name }))
    ];
  };

  const getAllDelegations = () => getAllDelegationsFromVenues(venues);

  const getEventsForDay = (date: string): Event[] => {
    const events: Event[] = [];
    
    if (eventFilter !== 'none') {
      // Pour les matchs sportifs
      if (eventFilter === 'all' || eventFilter === 'match' || eventFilter !== 'party') {
        venues.forEach(venue => {
          if (venue.matches) {
            venue.matches.forEach(match => {
              const [matchDate, matchTime] = match.date.split('T');
              
              if (matchDate === date) {
                // Vérifier si le match correspond au filtre de sport
                const sportMatch = eventFilter === 'all' || eventFilter === 'match' || venue.sport === eventFilter;
                // Vérifier si le match correspond au filtre de lieu
                const venueMatch = venueFilter === 'Tous' || venue.id === venueFilter;
                
                // Vérifier si le match correspond au filtre de genre
                const isFemale = match.description?.toLowerCase().includes('féminin');
                const isMale = match.description?.toLowerCase().includes('masculin');
                const isMixed = match.description?.toLowerCase().includes('mixte');
                
                const genderMatch = (!isFemale && !isMale && !isMixed) || 
                                  (isFemale && showFemale) || 
                                  (isMale && showMale) ||
                                  (isMixed && showMixed);

                // Filtre par délégation
                const delegationMatch = delegationFilter === 'all' || 
                  (match.teams && delegationMatches(match.teams, delegationFilter));
                
                if (sportMatch && venueMatch && genderMatch && delegationMatch) {
                  const eventEndTime = match.endTime ? match.endTime.split('T')[1].split('.')[0] : undefined;
                  const isPassed = isEventPassed(match.date, eventEndTime, 'match');
                  
                  events.push({
                    type: 'match',
                    time: matchTime.split('.')[0],
                    endTime: eventEndTime,
                    date: matchDate,
                    name: match.description || match.name,
                    teams: match.teams,
                    description: match.description,
                    sport: venue.sport,
                    venue: venue.name,
                    color: isPassed ? 'var(--match-passed-color)' : '#4CAF50',
                    result: match.result
                  });
                }
              }
            });
          }
        });
      }

      // Pour les soirées et défilés (résultats depuis Firebase via prop parties)
      if (eventFilter === 'all' || eventFilter === 'party') {
        const calendarToAppPartyId: Record<string, string> = {
          'place-stanislas': '1',
          'parc-expo-pompoms': '2',
          'parc-expo-showcase': '3',
          'zenith': '4'
        };
        const partiesList = [
          {
            id: 'place-stanislas',
            date: '2026-04-16',
            time: '14:00',
            endTime: '16:30',
            name: 'Place Stanislas',
            description: 'Défilé 14h–16h30 (informations sur place dès midi)',
            color: '#673AB7',
            type: 'party',
            sport: 'Défilé',
            venue: 'Pl. Stanislas, 54000 Nancy'
          },
          {
            id: 'parc-expo-pompoms',
            date: '2026-04-16',
            time: '21:00',
            endTime: '03:00',
            name: 'Parc Expo',
            description: 'Soirée Pompoms du 16 avril, 21h-3h',
            color: '#673AB7',
            type: 'party',
            sport: 'Show Pompom',
            venue: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy'
          },
          {
            id: 'parc-expo-showcase',
            date: '2026-04-17',
            time: '20:00',
            endTime: '04:00',
            name: 'Parc Expo',
            description: 'Soirée Showcase 17 novembre, 20h-4h',
            color: '#673AB7',
            type: 'party',
            sport: 'Showcase',
            venue: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy'
          },
          {
            id: 'zenith',
            date: '2026-04-18',
            time: '20:00',
            endTime: '04:00',
            name: 'Zénith',
            description: 'Soirée DJ Contest 18 novembre, 20h-4h',
            color: '#673AB7',
            type: 'party',
            sport: 'DJ Contest',
            venue: 'Rue du Zénith, 54320 Maxéville'
          }
        ];

        partiesList.forEach(party => {
          if (party.date === date) {
            const venueMatch = venueFilter === 'Tous' || party.id === venueFilter;
            if (venueMatch) {
              const appId = calendarToAppPartyId[party.id];
              const result = appId ? appParties.find(p => p.id === appId)?.result : undefined;
              events.push({
                type: 'party',
                time: party.time,
                endTime: party.endTime,
                date: party.date,
                name: party.name,
                description: party.description,
                venue: party.venue,
                color: party.color,
                sport: party.sport,
                ...(result != null && result !== '' && { result })
              });
            }
          }
        });
      }
    }

    return events;
  };

  const getOverlappingEvents = (events: Event[]): Event[][] => {
    const groups: Event[][] = [];
    const sortedEvents = [...events].sort((a, b) => {
      const aStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const bStart = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      return aStart - bStart;
    });

    sortedEvents.forEach(event => {
      const startTime = parseInt(event.time.split(':')[0]) * 60 + parseInt(event.time.split(':')[1]);
      const endTime = event.endTime 
        ? parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])
        : startTime + 60;

      let placed = false;
      for (const group of groups) {
        const lastEvent = group[group.length - 1];
        const lastStartTime = parseInt(lastEvent.time.split(':')[0]) * 60 + parseInt(lastEvent.time.split(':')[1]);
        const lastEndTime = lastEvent.endTime 
          ? parseInt(lastEvent.endTime.split(':')[0]) * 60 + parseInt(lastEvent.endTime.split(':')[1])
          : lastStartTime + 60;

        if (startTime < lastEndTime && endTime > lastStartTime) {
          group.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        groups.push([event]);
      }
    });

    return groups;
  };

  const getEventPosition = (time: string, endTime: string | undefined, index: number, total: number, eventType?: 'match' | 'party', eventName?: string) => {
    const [startHour, startMinute] = time.split(':').map(Number);
    const isDefile = eventName === 'Place Stanislas';
    
    // Limite du calendrier : 8h à 23h (15 heures affichées)
    const CALENDAR_START_HOUR = 8;
    const CALENDAR_END_HOUR = 23;
    // Utiliser la valeur calculée dynamiquement
    const PIXELS_PER_HOUR = pixelsPerHour;
    
    let endHour: number;
    let endMinute: number;
    
    if (endTime) {
      const [parsedEndHour, parsedEndMinute] = endTime.split(':').map(Number);
      if (!isNaN(parsedEndHour) && !isNaN(parsedEndMinute)) {
        endHour = parsedEndHour;
        endMinute = parsedEndMinute;
        
        // Si l'heure de fin est après minuit (0-7h) ou > 23h, limiter à 23h
        // Cela gère les soirées qui finissent à 3h, 4h, etc.
        if (endHour < CALENDAR_START_HOUR || endHour > CALENDAR_END_HOUR) {
          endHour = CALENDAR_END_HOUR;
          endMinute = 0;
        }
      } else {
        // Parsing échoué, utiliser valeur par défaut
        endHour = Math.min(startHour + 1, CALENDAR_END_HOUR);
        endMinute = startMinute;
      }
    } else {
      // Pas d'heure de fin spécifiée
      if (eventType === 'party' && !isDefile) {
        // Pour les soirées (sauf défilé), utiliser 23:00
        endHour = CALENDAR_END_HOUR;
        endMinute = 0;
      } else {
        // Pour les matchs/défilé sans heure de fin, ajouter 1h par défaut (limité à 23h)
        endHour = Math.min(startHour + 1, CALENDAR_END_HOUR);
        endMinute = startMinute;
      }
    }
    
    // S'assurer que l'heure de fin ne dépasse jamais 23h
    if (endHour > CALENDAR_END_HOUR) {
      endHour = CALENDAR_END_HOUR;
      endMinute = 0;
    }
    
    // Calculer les positions en heures depuis 8h
    const startPosition = (startHour - CALENDAR_START_HOUR) + (startMinute / 60);
    const endPosition = (endHour - CALENDAR_START_HOUR) + (endMinute / 60);
    
    // Calculer la durée avec un minimum de 15 minutes pour la lisibilité
    const duration = Math.max(0.25, endPosition - startPosition);

    const width = total === 1 ? '100%' : `${100 / total}%`;
    const left = total === 1 ? '0%' : `${(100 / total) * index}%`;

    return {
      top: `${startPosition * PIXELS_PER_HOUR}px`,
      height: `${duration * PIXELS_PER_HOUR}px`,
      width,
      left
    };
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const getCurrentDate = () => {
    // TEST: date/heure simulée (Vendredi 17/04/2026 à 14h30)
    //return new Date(2026, 3, 17, 14, 30, 0);
    return new Date(); 
  };

  const getCurrentTimePosition = () => {
    const now = getCurrentDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Ne pas afficher l'indicateur si l'heure est en dehors de la plage 8h-23h
    if (hours < 8 || hours >= 23) {
      return '';
    }
    
    const totalMinutes = hours * 60 + minutes;
    const startHour = 8;
    const minutesFromStart = totalMinutes - (startHour * 60);
    // Utiliser la valeur calculée dynamiquement
    const position = `${(minutesFromStart / 60) * pixelsPerHour}px`;
    return position;
  };

  const getTodayDate = () => {
    const today = getCurrentDate();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour vérifier si un événement est passé (utilise getCurrentDate pour cohérence avec la barre rouge)
  const isEventPassed = (date: string, endTime?: string, type: 'match' | 'party' = 'match') => {
    const now = getCurrentDate();
    const [eventDateStr, eventTimeStr] = date.split('T');
    const eventDate = new Date(eventDateStr);
    
    // Si l'événement est dans le futur, il n'est pas passé
    if (eventDate > now) {
      return false;
    }
    
    // Si l'événement est aujourd'hui, vérifier l'heure
    if (eventDate.toDateString() === now.toDateString()) {
      const [startHours, startMinutes] = eventTimeStr.split(':').map(Number);
      const start = new Date(eventDate);
      start.setHours(startHours, startMinutes, 0, 0);
      
      // Si l'événement n'a pas encore commencé, il n'est pas passé
      if (start > now) {
        return false;
      }
      
      // Si une heure de fin est spécifiée, l'utiliser
      if (endTime) {
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const end = new Date(eventDate);
        end.setHours(endHours, endMinutes, 0, 0);
        return now > end;
      }
      
      // Sinon, utiliser les durées par défaut
      const defaultDuration = type === 'party' ? 6 : 2; // 6h pour les soirées, 2h pour les matchs
      const end = new Date(start.getTime() + (defaultDuration * 60 * 60 * 1000));
      return now > end;
    }
    
    // Si l'événement est dans le passé, il est passé
    return true;
  };

  // Fonction pour vérifier si un sport a des matchs féminins ou masculins
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
      // Si le sport préféré est 'none', on utilise 'match' pour afficher tous les sports
      onEventFilterChange(preferredSport === 'none' ? 'match' : preferredSport);
      onDelegationFilterChange(preferredDelegation);
      
      // Appliquer les filtres de genre en fonction du championnat sélectionné
      if (preferredChampionship !== 'none') {
        if (onSetGenderFilters) {
          // Utiliser la nouvelle prop pour définir directement les filtres
          onSetGenderFilters(
            preferredChampionship === 'female',
            preferredChampionship === 'male',
            preferredChampionship === 'mixed'
          );
        } else {
          // Fallback: utiliser la méthode toggle
          // Désactiver tous les genres d'abord
          if (showFemale) onGenderFilterChange('female');
          if (showMale) onGenderFilterChange('male');
          if (showMixed) onGenderFilterChange('mixed');
          
          // Puis activer seulement le genre préféré
          if (preferredChampionship === 'female') {
            if (!showFemale) onGenderFilterChange('female');
          } else if (preferredChampionship === 'male') {
            if (!showMale) onGenderFilterChange('male');
          } else if (preferredChampionship === 'mixed') {
            if (!showMixed) onGenderFilterChange('mixed');
          }
        }
      } else {
        // Si pas de championnat préféré, activer tous les genres
        if (onSetGenderFilters) {
          onSetGenderFilters(true, true, true);
        } else {
          // Fallback: utiliser la méthode toggle
          if (!showFemale) onGenderFilterChange('female');
          if (!showMale) onGenderFilterChange('male');
          if (!showMixed) onGenderFilterChange('mixed');
        }
      }
    } else {
      // Réinitialiser tous les filtres
      onEventFilterChange('all');
      onDelegationFilterChange('all');
      onVenueFilterChange('Tous');
      // Réinitialiser tous les genres
      if (onSetGenderFilters) {
        onSetGenderFilters(true, true, true);
      } else {
        // Fallback: utiliser la méthode toggle
        if (!showFemale) onGenderFilterChange('female');
        if (!showMale) onGenderFilterChange('male');
        if (!showMixed) onGenderFilterChange('mixed');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="calendar-popup-overlay" onClick={onClose}>
      <div className="calendar-popup" onClick={e => e.stopPropagation()}>
        {/* Header du Layout */}
        <Header
          onChat={onChat}
          onEmergency={onEmergency}
          onAdmin={onAdmin}
          showChat={showChat}
          unreadCount={unreadCount}
          onBack={onBack}
          onEditModeToggle={onEditModeToggle}
          isEditing={isEditing}
          isBackDisabled={isBackDisabled}
          hideBackButton={false}
        />
        
        <div className="calendar-popup-content">
          <div className="calendar-panel-header">
            <h3>Calendrier</h3>
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
                    // Vérifier si on est déjà dans l'état initial
                    const isAlreadyReset = 
                      eventFilter === 'all' && 
                      delegationFilter === 'all' && 
                      venueFilter === 'Tous' && 
                      showFemale && 
                      showMale && 
                      showMixed &&
                      !isStarFilterActive;
                    
                    // Si on est déjà dans l'état initial, ne rien faire
                    if (isAlreadyReset) {
                      return;
                    }
                    
                    // Sinon, réinitialiser tous les filtres
                    onEventFilterChange('all');
                    onDelegationFilterChange('all');
                    onVenueFilterChange('Tous');
                    setIsStarFilterActive(false);
                    localStorage.setItem('starFilterActive', 'false');
                    
                    // Réinitialiser tous les genres seulement s'ils ne sont pas déjà actifs
                    if (!showFemale) onGenderFilterChange('female');
                    if (!showMale) onGenderFilterChange('male');
                    if (!showMixed) onGenderFilterChange('mixed');
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                </button>
              </>
            )}
            <button 
              className={`filter-toggle-button`}
              onClick={() => onShowFiltersChange(!showFilters)}
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
          
          {showFilters && (
            <div className="calendar-filters-section">
              <div className="filter-row">
                <div className="filter-buttons-row"></div>
                <select 
                  className="filter-select"
                  value={eventFilter}
                  onChange={(e) => onEventFilterChange(e.target.value)}
                >
                  {sportOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={delegationFilter}
                  onChange={(e) => onDelegationFilterChange(e.target.value)}
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
                    onChange={(e) => onVenueFilterChange(e.target.value)}
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
                          onClick={() => onGenderFilterChange('female')}
                        >
                          Féminin
                        </button>
                      )}
                      {hasMale && (
                        <button 
                          className={`gender-filter-button ${showMale ? 'active' : ''}`}
                          onClick={() => onGenderFilterChange('male')}
                        >
                          Masculin
                        </button>
                      )}
                      {hasMixed && (
                        <button 
                          className={`gender-filter-button ${showMixed ? 'active' : ''}`}
                          onClick={() => onGenderFilterChange('mixed')}
                        >
                          Mixte
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          <div className="calendar-scrollable-content">
            {isLoading ? (
              <div className="chat-loading-spinner-container">
                <div className="chat-loading-spinner"></div>
                <div className="chat-loading-text">Chargement du calendrier...</div>
              </div>
            ) : (
              <div className="calendar-grid">
              <div className="calendar-hours">
                <div className="calendar-hour-header"></div>
                <div className="calendar-hours-container">
                  {hours.map(hour => (
                    <div key={hour} className="calendar-hour">{hour}</div>
                  ))}
                </div>
              </div>
              <div className="calendar-days">
                {days.map(day => {
                  const events = getEventsForDay(day.date);
                  return (
                    <div key={day.date} className="calendar-day-column">
                      <div className="calendar-day-header">{day.label}</div>
                      <div className="calendar-events" ref={day.date === days[0].date ? eventsContainerRef : null}>
                        {day.date === getTodayDate() && getCurrentTimePosition() !== '' && (
                          <div 
                            className="current-time-indicator"
                            style={{ top: getCurrentTimePosition() }}
                          />
                        )}
                        {getOverlappingEvents(events).map((group, groupIndex) => {
                          return (
                            <div key={groupIndex} className="event-group">
                              {group.map((event, index) => {
                                const position = getEventPosition(event.time, event.endTime, index, group.length, event.type, event.name);
                                const isPassed = isEventPassed(`${day.date}T${event.time}`, event.endTime ? `${day.date}T${event.endTime}` : undefined, event.type);
                                const passedBg = event.type === 'party' ? 'var(--party-passed-color)' : 'var(--match-passed-color)';
                                return (
                                  <div 
                                    key={`${event.time}-${index}`}
                                    className={`calendar-event ${isPassed ? 'passed' : ''}`}
                                    style={{
                                      backgroundColor: isPassed ? passedBg : event.color,
                                      top: position.top,
                                      height: position.height,
                                      width: position.width,
                                      left: position.left
                                    }}
                                    onClick={() => handleEventClick(event)}
                                  >
                                    <div className="calendar-event-title-container">
                                      <div className="calendar-event-name">{event.name}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>
        
        {/* BottomNav du Layout */}
        <BottomNav closeLayoutPanels={onClose} />
      </div>

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewOnMap={(venue) => {
            onViewOnMap(venue);
            setSelectedEvent(null);
          }}
          venues={venues}
        />
      )}
    </div>
  );
};

export default CalendarPopup;