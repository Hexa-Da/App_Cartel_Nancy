import React from 'react';
import { Venue } from '../types';
import './EventDetails.css';

export interface Event {
  type: 'match' | 'party';
  time: string;
  endTime?: string;
  date?: string;
  name: string;
  teams?: string;
  description?: string;
  color: string;
  sport?: string;
  venue?: string;
  result?: string;
}

interface EventDetailsProps {
  event: Event;
  onClose: () => void;
  onViewOnMap: (venue: Venue) => void;
  venues: Venue[];
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onClose, onViewOnMap, venues }) => {
  const partyVenues: { [key: string]: Venue } = {
    'Place Stanislas': {
      id: 'place-stanislas',
      name: 'Place Stanislas',
      description: 'Place Stanislas',
      address: 'Pl. Stanislas, 54000 Nancy',
      latitude: 48.693524,
      longitude: 6.183270,
      position: [48.693524, 6.183270],
      sport: 'Defile',
      date: '',
      emoji: '🎺',
      matches: [],
      type: 'venue'
    },
    'Centre Prouvé': {
      id: 'centre-prouve',
      name: 'Centre Prouvé',
      description: 'Centre Prouvé',
      address: '1 Pl. de la République, 54000 Nancy',
      latitude: 48.687858,
      longitude: 6.176977,
      position: [48.687858, 6.176977],
      sport: 'Pompom',
      date: '',
      emoji: '🎀',
      matches: [],
      type: 'venue'
    },
    'Parc des Expositions': {
      id: 'parc-expo',
      name: 'Parc des Expositions',
      description: 'Parc des Expositions',
      address: 'Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy',
      latitude: 48.663272,
      longitude: 6.190715,
      position: [48.663272, 6.190715],
      sport: 'Party',
      date: '',
      emoji: '🎉',
      matches: [],
      type: 'venue'
    },
    'Zénith': {
      id: 'zenith',
      name: 'Zénith',
      description: 'Zénith',
      address: 'Rue du Zénith, 54320 Maxéville',
      latitude: 48.710237,
      longitude: 6.139252,
      position: [48.710237, 6.139252],
      sport: 'Party',
      date: '',
      emoji: '🎉',
      matches: [],
      type: 'venue'
    }
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
      'Soirée': '🎉',
      'Défilé': '🎺',
      'DJ Contest': '🎧',
      'Showcase': '🎤',
      'Show Pompom': '🎀'
    };
    return icons[sport] || '🏆';
  };

  const formatTime = (timeString: string) => {
    const time = timeString.split(':');
    return `${time[0]}:${time[1]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const month = months[date.getMonth()];
    return `${dayName} ${day} ${month}`;
  };

  const handleViewOnMap = () => {
    if (event.type === 'match') {
      const venue = venues.find(v => v.name === event.venue);
      if (venue) {
        onViewOnMap(venue);
        onClose();
      }
    } else if (event.type === 'party') {
      const venue = partyVenues[event.name];
      if (venue) {
        onViewOnMap(venue);
        onClose();
      }
    }
  };

  return (
    <div className="event-details-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="event-details-content" onClick={e => e.stopPropagation()}>
        <div className="event-details-main">
          {/* Badge de type d'événement */}
          <div className={`event-type-badge-large ${event.type === 'match' ? 'match-badge' : 'party-badge'}`}>
            <span className="sport-icon">{getSportIcon(event.sport || '')}</span>
            <span className="sport-name">{event.sport || 'Événement'}</span>
          </div>

          {/* Horaires avec date */}
          <div className="event-time-section">
            {event.date && (
              <div className="time-item">
                <span className="time-label">Date</span>
                <span className="time-value">{formatDate(event.date)}</span>
              </div>
            )}
            <div className="time-item">
              <span className="time-label">Début</span>
              <span className="time-value">{formatTime(event.time)}</span>
            </div>
            {event.endTime && (
              <div className="time-item">
                <span className="time-label">Fin</span>
                <span className="time-value">{formatTime(event.endTime)}</span>
              </div>
            )}
          </div>

          {/* Informations spécifiques selon le type */}
          {event.type === 'match' ? (
            <div className="match-details">
              {event.teams && (
                <div className="detail-item">
                  <span className="detail-label">Équipes</span>
                  <span className="detail-value teams-value">{event.teams}</span>
                </div>
              )}
              {event.venue && (
                <div className="detail-item">
                  <span className="detail-label">Lieu</span>
                  <span className="detail-value venue-value">
                    {event.venue}
                  </span>
                </div>
              )}
              {event.description && (
                <div className="detail-item">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{event.description}</span>
                </div>
              )}
              {event.result && (
                <div className="detail-item result-item">
                  <span className="detail-label">Résultat</span>
                  <span className="detail-value result-value">{event.result}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="party-details">
              {event.description && (
                <div className="detail-item">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{event.description}</span>
                </div>
              )}
              {event.venue && (
                <div className="detail-item">
                  <span className="detail-label">Adresse</span>
                  <span className="detail-value venue-value">
                    {event.venue}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="event-actions">
            <button className="action-button primary" onClick={handleViewOnMap}>
              <span className="button-icon"></span>
              Voir sur la carte
            </button>
            <button className="action-button secondary" onClick={onClose}>
              <span className="button-icon"></span>
              Fermer
            </button>
          </div>
          
          {/* Bouton de fermeture en bas à droite */}
          <button className="close-button-bottom" onClick={onClose}>
            <span>×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails; 