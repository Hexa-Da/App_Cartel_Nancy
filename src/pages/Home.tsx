import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

interface Match {
  id: string;
  teams: string;
  date: string;
  description: string;
  endTime?: string;
  result?: string;
  sport?: string;
}

interface Venue {
  type: 'venue';
  id: string;
  name: string;
  sport: string;
  matches: Match[];
}

interface Hotel {
  type: 'hotel';
  id: string;
  name: string;
  sport: string;
  matches: Match[];
}

interface Restaurant {
  type: 'restaurant';
  id: string;
  name: string;
  sport: string;
  matches: Match[];
}

interface Party {
  type: 'party';
  id: string;
  name: string;
  sport: string;
}

type Place = Venue | Hotel | Restaurant | Party;

interface OutletContext {
  getFilteredEvents: () => Place[];
  getAllDelegations: () => string[];
}

const Home: React.FC = () => {
  const { getFilteredEvents, getAllDelegations } = useOutletContext<OutletContext>();
  const [events, setEvents] = useState<Place[]>([]);
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
    delegation: localStorage.getItem('preferredDelegation') || ''
  });

  useEffect(() => {
    const updateEvents = () => {
      const filteredEvents = getFilteredEvents();
      setEvents(filteredEvents);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredSport' || e.key === 'preferredDelegation') {
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
            : prev.delegation
        }));
      }
      updateEvents();
    };

    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'favoriteSports' || e.detail.key === 'preferredDelegation') {
        setUserPreferences(prev => ({
          favoriteSports: e.detail.key === 'favoriteSports'
            ? JSON.parse(e.detail.value || '[]')
            : prev.favoriteSports,
          delegation: e.detail.key === 'preferredDelegation'
            ? (e.detail.value || '')
            : prev.delegation
        }));
      }
      updateEvents();
    };

    updateEvents();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('preferenceChange', handlePreferenceChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('preferenceChange', handlePreferenceChange as EventListener);
    };
  }, [getFilteredEvents]);

  const getUpcomingMatches = (places: Place[]) => {
    const now = new Date();
    return places.flatMap(place => {
      if (place.type === 'venue' && 'matches' in place && Array.isArray(place.matches)) {
        return place.matches.filter(match => {
          const matchDate = new Date(match.date);
          return matchDate > now;
        }).map(match => ({
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
      if (place.type === 'venue' && place.sport === sport && 'matches' in place && Array.isArray(place.matches)) {
        return place.matches.map(match => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    });
  };

  const getMatchesByDelegation = (places: Place[], delegation: string) => {
    return places.flatMap(place => {
      if (place.type === 'venue' && 'matches' in place && Array.isArray(place.matches)) {
        return place.matches.filter(match => 
          match.teams.toLowerCase().includes(delegation.toLowerCase())
        ).map(match => ({
          ...match,
          venue: place.name,
          sport: place.sport
        }));
      }
      return [];
    });
  };

  const getMatchesByDelegationAndSport = (places: Place[], delegation: string, sport: string) => {
    return places.flatMap(place => {
      if (place.type === 'venue' && place.matches) {
        return place.matches.filter(match => {
          const teams = match.teams.toLowerCase();
          const delegationLower = delegation.toLowerCase();
          return teams.includes(delegationLower) && match.sport === sport;
        });
      }
      return [];
    });
  };

  const formatDateTime = (dateString: string, endTimeString?: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
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
      'Cross': '🏃',
      'Boxe': '🥊',
      'Athlétisme': '🏃‍♂️',
      'Pétanque': '🍹',
      'Escalade': '🧗‍♂️',
      'Jeux de société': '🎲'
    };
    return icons[sport] || '🏆';
  };

  return (
    <div className="home-page">
      <h1 className="welcome-title">Bienvenue Au Cartel de Nancy</h1>
      <div className="matches-section">
        <section className="matches-section">
          <h2>Vos Matchs</h2>
          {userPreferences.favoriteSports.length > 0 ? (
            userPreferences.favoriteSports.map((sport: string) => {
              const matches = getMatchesByDelegationAndSport(events, userPreferences.delegation, sport);
              return matches.length > 0 ? (
                <div key={sport} className="horizontal-scroll">
                  {matches.map(match => (
                    <div key={match.id} className="event-item match-event">
                      <div className="event-header">
                        <span className="event-type-badge">
                          {getSportIcon(sport)} {sport}
                        </span>
                        <span className="event-date">{formatDateTime(match.date, match.endTime)}</span>
                      </div>
                      <h3 className="event-name">{match.teams}</h3>
                      <p className="event-description">{match.description}</p>
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
                    : `Aucun match de ${sport} trouvé. Veuillez sélectionner une délégation.`}
                </p>
              );
            })
          ) : (
            <p className="no-matches">Veuillez sélectionner vos sports favoris dans les préférences</p>
          )}
        </section>

        {/* Liste des matchs de votre délégation */}
        <section className="matches-section">
          <h2>Votre Délégation</h2>
          <div className="horizontal-scroll">
            {userPreferences.delegation ? (
              getMatchesByDelegation(events, userPreferences.delegation).length > 0 ? (
                getMatchesByDelegation(events, userPreferences.delegation).map(match => (
                  <div key={match.id} className="event-item match-event">
                    <div className="event-header">
                      <span className="event-type-badge">
                        {getSportIcon(match.sport || '')} {match.sport}
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
                <p className="no-matches">Aucun match trouvé pour la délégation {userPreferences.delegation} <br />
                Veuillez sélectionner une délégation dans les préférences</p>
              )
            ) : (
              <p className="no-matches">Veuillez sélectionner une délégation dans les préférences</p>
            )}
          </div>
        </section>

        {/* Liste des prochains matchs */}
        <section className="matches-section">
          <h2>Prochains Matchs</h2>
          <div className="horizontal-scroll">
            {getUpcomingMatches(events).length > 0 ? (
              getUpcomingMatches(events).map(match => (
                <div key={match.id} className="event-item match-event">
                  <div className="event-header">
                    <span className="event-type-badge">
                      {getSportIcon(match.sport || '')} {match.sport}
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
              <p className="no-matches">Aucun match à venir</p>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .home-page {
          padding: 10px;
          margin-top: 40px;
          background-color: var(--bg-color);
          color: var(--text-color);
        }

        .welcome-title {
          top: 10px;
          position: relative;
          font-size: 3rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 50px 0;
          padding: 20px;
          text-align: center;
        }

        .matches-section {
          margin: 0px 0;
        }
        .matches-section:first-of-type {
          margin-top: 30px;
        }
        .matches-section:last-of-type {
          margin-bottom: 0;
        }

        .matches-section h2 {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-color);
          margin: 0 0 8px 0;
          padding: 0;
        }

        .horizontal-scroll {
          display: flex;
          overflow-x: auto;
          gap: 0.5rem;
          padding: 0.2rem 0;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          min-height: 90px;
        }

        .horizontal-scroll::-webkit-scrollbar {
          display: none;
        }

        .event-item {
          min-width: 260px;
          background-color: var(--bg-secondary);
          border-radius: 6px;
          padding: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .event-item:hover {
          transform: translateY(-1px);
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.2rem;
        }

        .event-type-badge {
          background-color: var(--primary-color);
          color: white;
          padding: 0.1rem 0.2rem;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.1rem;
        }

        .event-date {
          color: var(--danger-color);
          font-weight: 500;
          font-size: 0.7rem;
        }

        .event-title-container {
          margin: 0.2rem 0;
        }

        .event-name {
          margin: 0;
          color: var(--text-color);
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
        }

        .event-description {
          color: var(--text-color-light);
          font-size: 0.8rem;
          margin: 0.2rem 0;
          line-height: 1.2;
        }

        .event-result {
          color: var(--success-color);
          font-weight: 500;
          margin: 0.2rem 0;
          font-size: 0.8rem;
          text-align: center;
        }

        .no-matches {
          color: var(--text-color-light);
          width: 100%;
          font-size: 0.9rem;
          text-align: center;
          padding: 0.8rem;
          background-color: var(--bg-secondary);
          border-radius: 4px;
          margin: 0.4rem 0;
        }

        @media (max-width: 480px) {
          .home-page {
            padding: 8px;
            margin-top: 35px;
          }

          .welcome-title {
            font-size: 2.5rem;
            margin: 0 0 10px 0;
            padding: 8px;
          }

          .matches-section {
            margin: 10px 0;
          }

          .event-item {
            min-width: 220px;
            padding: 8px;
          }
        }

        @media (max-height: 700px) {
          .home-page {
            padding: 5px;
            margin-top: 30px;
          }

          .welcome-title {
            margin: 0 0 8px 0;
            padding: 2px;
          }

          .matches-section {
            margin: 8px 0;
          }

          .event-item {
            padding: 6px;
          }
        }

        @media (max-height: 600px) {
          .home-page {
            padding: 3px;
            margin-top: 25px;
          }

          .welcome-title {
            margin: 0 0 5px 0;
            padding: 1px;
          }

          .matches-section {
            margin: 5px 0;
          }

          .event-item {
            padding: 4px;
          }
        }

        @media (min-width: 500px) and (max-width: 700px) {
          .home-page {
            padding: 16px;
            margin-top: 50px;
          }
          .welcome-title {
            font-size: 2.2rem;
            margin: 0 0 28px 0;
            padding: 8px;
          }
          .matches-section {
            margin: 16px 0;
          }
          .matches-section h2 {
            font-size: 1.15rem;
            margin: 0 0 12px 0;
          }
          .event-item {
            min-width: 280px;
            padding: 16px;
          }
          .event-name {
            font-size: 1.1rem;
          }
          .event-description {
            font-size: 1rem;
          }
          .event-type-badge, .event-date {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home; 