import React, { useState, useEffect } from 'react';
import './CalendarPopup.css';
import { Venue } from '../types';
import Header from './Header';
import BottomNav from './BottomNav';
import EventDetails, { Event } from './EventDetails';

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
  isAdmin,
  showChat,
  unreadCount,
  onEditModeToggle,
  isEditing,
  onBack,
  isBackDisabled
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isStarFilterActive, setIsStarFilterActive] = useState(() => {
    const saved = localStorage.getItem('starFilterActive');
    return saved !== null ? JSON.parse(saved) : false;
  });

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
    const delegationMatches = delegationFilter === preferredDelegation;
    const genderMatches = preferredChampionship === 'none' ? 
      (showFemale && showMale && showMixed) :
      (preferredChampionship === 'female' ? showFemale && !showMale && !showMixed :
       preferredChampionship === 'male' ? !showFemale && showMale && !showMixed :
       preferredChampionship === 'mixed' ? !showFemale && !showMale && showMixed : false);

    const shouldBeActive = sportMatches && delegationMatches && genderMatches;
    
    if (shouldBeActive !== isStarFilterActive) {
      setIsStarFilterActive(shouldBeActive);
      localStorage.setItem('starFilterActive', JSON.stringify(shouldBeActive));
    }
  }, [eventFilter, delegationFilter, showFemale, showMale, showMixed, isStarFilterActive]);

  const sportOptions = [
    { value: 'none', label: 'Aucun' },
    { value: 'all', label: 'Tous les événements' },
    ...(isAdmin ? [{ value: 'party', label: 'Soirées et Défilé 🎉' }] : []),
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
    { value: 'Cross', label: 'Cross 🏃' },
    { value: 'Boxe', label: 'Boxe 🥊' },
    { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
    { value: 'Pétanque', label: 'Pétanque 🍹' },
    { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
    { value: 'Jeux de société', label: 'Jeux de société 🎲' },
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
    if (eventFilter === 'none') {
      return [{ value: 'Tous', label: 'Tous les lieux' }];
    }

    // Pour les soirées et défilés, retourner les lieux fixes (seulement pour les admins)
    if (eventFilter === 'party' && isAdmin) {
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        { value: 'place-stanislas', label: 'Place Stanislas' },
        { value: 'centre-prouve', label: 'Centre Prouvé' },
        { value: 'parc-expo', label: 'Parc des Expositions' },
        { value: 'zenith', label: 'Zénith' }
      ];
    }

    // Pour les sports, filtrer les lieux par sport, délégation et genre
    const filteredVenues = venues.filter(venue => {
      // Vérifier que le lieu correspond au sport sélectionné
      if (venue.sport !== eventFilter) return false;
      
      // Vérifier que le lieu a au moins un match correspondant à la délégation
      const delegationMatch = delegationFilter === 'all' || 
        (venue.matches && venue.matches.some(match =>
          match.teams.toLowerCase().includes(delegationFilter.toLowerCase())
        ));
      
      // Vérifier que le lieu a au moins un match correspondant aux filtres de genre
      const genderMatch = venue.matches && venue.matches.some(match => {
        const desc = match.description?.toLowerCase() || '';
        const isFemale = desc.includes('féminin');
        const isMale = desc.includes('masculin');
        const isMixed = desc.includes('mixte');
        
        return (
          (isFemale && showFemale) ||
          (isMale && showMale) ||
          (isMixed && showMixed) ||
          (!isFemale && !isMale && !isMixed) // Si pas de genre précisé, toujours afficher
        );
      });
      
      return delegationMatch && genderMatch;
    });

    const venueOptions = [
      { value: 'Tous', label: 'Tous les lieux' },
      ...filteredVenues.map(venue => ({
        value: venue.id,
        label: venue.name
      }))
    ];

    return venueOptions;
  };

  // Fonction pour obtenir toutes les délégations uniques
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach(match => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map(team => team.trim());
          teams.forEach(team => {
            // Exclure les "..." et les chaînes vides
            if (team && team !== "..." && team !== "…") delegations.add(team);
          });
        });
      }
    });
    return Array.from(delegations).sort();
  };

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
                  (match.teams && match.teams.toLowerCase().includes(delegationFilter.toLowerCase()));
                
                if (sportMatch && venueMatch && genderMatch && delegationMatch) {
                  const eventEndTime = match.endTime ? match.endTime.split('T')[1].split('.')[0] : undefined;
                  const isPassed = isEventPassed(match.date, eventEndTime, 'match');
                  
                  events.push({
                    type: 'match',
                    time: matchTime.split('.')[0],
                    endTime: eventEndTime,
                    name: match.description || match.name,
                    teams: match.teams,
                    sport: venue.sport,
                    venue: venue.name,
                    color: isPassed ? '#808080' : '#4CAF50',
                    result: match.result
                  });
                }
              }
            });
          }
        });
      }

      // Pour les soirées et défilés (seulement pour les admins)
      if (isAdmin && (eventFilter === 'all' || eventFilter === 'party')) {
        const parties = [
          {
            id: 'place-stanislas',
            date: '2026-04-16',
            time: '13:00',
            endTime: '17:00',
            name: 'Place Stanislas',
            description: 'Défilé',
            color: '#673AB7',
            type: 'party',
            venue: 'Pl. Stanislas, 54000 Nancy'
          },
          {
            id: 'centre-prouve',
            date: '2026-04-16',
            time: '21:00',
            endTime: '23:00',
            name: 'Centre Prouvé',
            description: 'Show Pompoms',
            color: '#673AB7',
            type: 'party',
            venue: '1 Pl. de la République, 54000 Nancy'
          },
          {
            id: 'parc-expo',
            date: '2026-04-17',
            time: '22:00',
            endTime: '23:00',
            name: 'Parc des Expositions',
            description: 'Soirée',
            color: '#673AB7',
            type: 'party',
            venue: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy'
          },
          {
            id: 'zenith',
            date: '2026-04-18',
            time: '20:00',
            endTime: '23:00',
            name: 'Zénith',
            description: 'Soirée',
            color: '#673AB7',
            type: 'party',
            venue: 'Rue du Zénith, 54320 Maxéville'
          }
        ];

        parties.forEach(party => {
          if (party.date === date) {
            // Vérifier si le filtre de lieu correspond
            const venueMatch = venueFilter === 'Tous' || party.id === venueFilter;
            
            if (venueMatch) {
              events.push({
                type: 'party',
                time: party.time,
                endTime: party.endTime,
                name: party.name,
                description: party.description,
                venue: party.venue,
                color: party.color
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

  const getEventPosition = (time: string, endTime: string | undefined, index: number, total: number) => {
    const [startHour, startMinute] = time.split(':').map(Number);
    let endHour = startHour + 1;
    let endMinute = 0;
    
    if (endTime) {
      const [parsedEndHour, parsedEndMinute] = endTime.split(':').map(Number);
      if (!isNaN(parsedEndHour) && !isNaN(parsedEndMinute)) {
        endHour = parsedEndHour;
        endMinute = parsedEndMinute;
      }
    }

    if (!endTime) {
      endHour = 23;
      endMinute = 0;
    }

    const startPosition = (startHour - 8) + (startMinute / 60);
    const endPosition = (endHour - 8) + (endMinute / 60);
    const duration = endPosition - startPosition;

    const width = total === 1 ? '100%' : `${100 / total}%`;
    const left = total === 1 ? '0%' : `${(100 / total) * index}%`;

    return {
      top: `${startPosition * 43.33}px`,
      height: `${duration * 43.33}px`,
      width,
      left
    };
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const getCurrentDate = () => {
    // Simulation de la date du 25/04 à 16h
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
    const position = `${(minutesFromStart / 60) * 43.33}px`;
    return position;
  };

  const getTodayDate = () => {
    const today = getCurrentDate();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour vérifier si un événement est passé
  const isEventPassed = (date: string, endTime?: string, type: 'match' | 'party' = 'match') => {
    const now = new Date();
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
            <button 
              className={`filter-toggle-button`}
              onClick={() => onShowFiltersChange(!showFilters)}
              style={{ 
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0px',
                margin: '0px',
                border: 'none',
                minWidth: 'auto',
                width: 'auto'
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
          
          {showFilters && (
            <div className="calendar-filters-section">
              <div className="filter-row">
                <button
                  className={`filter-reset-button star${isStarFilterActive ? ' active' : ''}`}
                  style={{ right: '80px', top: '82px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleStarFilterClick}
                  title="Appliquer vos préférences"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5L14.5 8.5L22 9L16 14.5L17.5 22L12 18L6.5 22L8 14.5L2 9L9.5 8.5L12 1.5Z"/>
                  </svg>
                </button>
                <button
                  className="filter-reset-button"
                  style={{ right: '45px', top: '82px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            <div className="calendar-grid">
              <div className="calendar-hours">
                <div className="calendar-hour-header"></div>
                {hours.map(hour => (
                  <div key={hour} className="calendar-hour">{hour}</div>
                ))}
              </div>
              <div className="calendar-days">
                {days.map(day => {
                  const events = getEventsForDay(day.date);
                  return (
                    <div key={day.date} className="calendar-day-column">
                      <div className="calendar-day-header">{day.label}</div>
                      <div className="calendar-events">
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
                                const position = getEventPosition(event.time, event.endTime, index, group.length);
                                const isPassed = isEventPassed(`${day.date}T${event.time}`, event.endTime ? `${day.date}T${event.endTime}` : undefined, event.type);
                                return (
                                  <div 
                                    key={`${event.time}-${index}`}
                                    className={`calendar-event ${isPassed ? 'passed' : ''}`}
                                    style={{
                                      backgroundColor: event.color,
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