import React from 'react';
import { Venue } from '../types';

export interface Event {
  type: 'match' | 'party';
  time: string;
  endTime?: string;
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
    <div className="event-details-overlay" onClick={onClose}>
      <div className="event-details-content" onClick={e => e.stopPropagation()}>
        <div className="match-event-details">
          <h3>{event.name}</h3>
          <p>Horaire: {event.time} {event.endTime ? `- ${event.endTime}` : ''}</p>
          {event.type === 'match' ? (
            <>
              {event.sport && <p>Sport: {event.sport}</p>}
              {event.venue && <p>Lieu: {event.venue}</p>}
              {event.teams && <p>Équipes: {event.teams}</p>}
              {event.description && <p>Description: {event.description}</p>}
              {event.result && <p className="match-result"><strong>Résultat :</strong> {event.result}</p>}
            </>
          ) : (
            <>
              {event.description && <p>Description: {event.description}</p>}
              {event.venue && <p>Adresse: {event.venue}</p>}
            </>
          )}
          <div className="match-event-buttons">
            <button onClick={handleViewOnMap}>Voir sur la carte</button>
            <button onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails; 