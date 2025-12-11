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

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EventDetails, { Event } from '../components/EventDetails';
import { Match, Venue } from '../types';
import './Home.css';
import '../components/EventDetails.css';
import { useApp } from '../AppContext';
import { useAppPanels } from '../AppPanelsContext';

type Place = Venue;

interface ExtendedMatch extends Match {
  venue?: string;
}

const Home: React.FC = () => {
  const { getFilteredEvents, getAllDelegations, delegationMatches } = useApp();
  const { selectedEvent, setSelectedEvent } = useAppPanels();
  const [events, setEvents] = useState<Place[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
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
      const filteredEvents = getFilteredEvents();
      // Filtrer les venues sans id et mapper pour correspondre à l'interface Venue de types.ts
      setEvents(
        filteredEvents
          .filter((venue): venue is typeof venue & { id: string } => !!venue.id)
          .map(venue => ({
            ...venue,
            type: 'venue' as const,
            matches: venue.matches || []
          }))
      );
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredSport' || e.key === 'preferredDelegation' || e.key === 'preferredChampionship') {
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
      if (e.detail.key === 'favoriteSports' || e.detail.key === 'preferredDelegation' || e.detail.key === 'preferredChampionship') {
        setUserPreferences(prev => ({
          favoriteSports: e.detail.key === 'favoriteSports'
            ? JSON.parse(e.detail.value || '[]')
            : prev.favoriteSports,
          delegation: e.detail.key === 'preferredDelegation'
            ? (e.detail.value || '')
            : prev.delegation,
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

  // Fonction pour vérifier si un match est passé (reprise de App.tsx)
  const isMatchPassed = (startDate: string, endTime?: string, type: 'match' | 'party' = 'match') => {
    const now = new Date();
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

  const getUpcomingMatches = (places: Place[]) => {
    const now = new Date();
    return places.flatMap(place => {
      if ('matches' in place && Array.isArray(place.matches)) {
        return place.matches.map((match: Match): ExtendedMatch => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getMatchesBySport = (places: Place[], sport: string) => {
    return places.flatMap(place => {
      if (place.sport === sport && 'matches' in place && Array.isArray(place.matches)) {
        return place.matches.map((match: Match): ExtendedMatch => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

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
        // Vérifier le championnat au niveau de la venue (pas du match)
        const venueDescription = place.description?.toLowerCase() || '';
        const isFemale = venueDescription.includes('féminin');
        const isMale = venueDescription.includes('masculin');
        const isMixed = venueDescription.includes('mixte');
        
        let championshipMatch = true;
        if (userPreferences.championship !== 'none') {
          championshipMatch = 
            (userPreferences.championship === 'female' && isFemale) ||
            (userPreferences.championship === 'male' && isMale) ||
            (userPreferences.championship === 'mixed' && isMixed);
        }
        
        // Si le championnat ne correspond pas, ne pas retourner de matchs de cette venue
        if (!championshipMatch) return [];
        
        return place.matches.filter((match: Match) => {
          return delegationMatches(match.teams, delegation);
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
      'Escalade': '🧗‍♂️'
    };
    return icons[sport] || '🏆';
  };

  const handleEventClick = (match: ExtendedMatch) => {
    const [, time] = match.date.split('T');
    const newEvent: Event = {
      type: match.sport === 'Soirée' || match.sport === 'Défilé' ? 'party' : 'match',
      time: time.split('.')[0],
      endTime: match.endTime ? match.endTime.split('T')[1].split('.')[0] : undefined,
      name: match.description || match.name,
      teams: match.teams,
      description: match.description,
      color: match.sport === 'Soirée' || match.sport === 'Défilé' ? '#9C27B0' : '#4CAF50',
      sport: match.sport,
      venue: match.venue || '',
      result: match.result
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

  return (
    <div className="home-page">
      {/* <h1 className="welcome-title">Bienvenue Au Cartel de Nancy</h1> */}
      <div className="matches-section">
        <section className="matches-section">
          <h2>Vos Matchs</h2>
          {userPreferences.favoriteSports.length > 0 ? (
            userPreferences.favoriteSports.map((sport: string) => {
              const matches = getMatchesByDelegationAndSport(events, userPreferences.delegation, sport);
              return matches.length > 0 ? (
                <div key={sport} className="horizontal-scroll">
                  {matches.map(match => (
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
                      <p className="event-venue">{match.venue}</p>
                      {match.result && (
                        <div className="event-result">{match.result}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p key={sport} className="no-matches">
                  {userPreferences.delegation 
                    ? `Aucun match de ${sport} trouvé pour la délégation de ${userPreferences.delegation}`
                    : `Aucun match de ${sport} trouvé. Veuillez sélectionner votre délégation.`}
                </p>
              );
            })
          ) : (
            <p className="no-matches">Veuillez sélectionner votre sports dans les préférences</p>
          )}
        </section>

        {/* Liste des matchs de votre délégation */}
        <section className="matches-section">
          <h2>Votre Délégation</h2>
          <div className="horizontal-scroll">
            {userPreferences.delegation ? (
              getMatchesByDelegation(events, userPreferences.delegation).length > 0 ? (
                getMatchesByDelegation(events, userPreferences.delegation).map(match => (
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
                    <p className="event-venue">{match.venue}</p>
                    {match.result && (
                      <div className="event-result">{match.result}</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-matches">Aucun match trouvé pour la délégation {userPreferences.delegation} <br />
                Veuillez sélectionner votre délégation dans les préférences</p>
              )
            ) : (
              <p className="no-matches">Veuillez sélectionner votre délégation dans les préférences</p>
            )}
          </div>
        </section>

        {/* Liste des prochains matchs */}
        <section className="matches-section">
          <h2>Matchs en direct</h2>
          <div className="horizontal-scroll">
            {getUpcomingMatches(events).filter(match => {
              // Un match est en direct si la date de début est passée mais la date de fin n'est pas encore atteinte
              const now = new Date();
              const start = new Date(match.date);
              let end;
              if (match.endTime) {
                end = new Date(match.endTime);
              } else {
                // Par défaut, durée 1h pour un match, 23h pour une soirée
                end = new Date(match.date);
                if (match.sport === 'Soirée' || match.sport === 'Défilé') {
                  end.setHours(23, 0, 0, 0);
                } else {
                  end.setHours(end.getHours() + 1);
                }
              }
              return start <= now && end > now;
            }).length > 0 ? (
              getUpcomingMatches(events).filter(match => {
                const now = new Date();
                const start = new Date(match.date);
                let end;
                if (match.endTime) {
                  end = new Date(match.endTime);
                } else {
                  end = new Date(match.date);
                  if (match.sport === 'Soirée' || match.sport === 'Défilé') {
                    end.setHours(23, 0, 0, 0);
                  } else {
                    end.setHours(end.getHours() + 1);
                  }
                }
                return start <= now && end > now;
              }).map(match => (
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
                  <div className="event-title-container">
                    <h3 className="event-name">{match.teams}</h3>
                  </div>
                  <p className="event-description">{match.description}</p>
                  <p className="event-venue">{match.venue}</p>
                  {match.result && <p className="event-result">Résultat : {match.result}</p>}
                </div>
              ))
            ) : (
              <p className="no-matches">Aucun match en direct</p>
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
    </div>
  );
};

export default Home; 