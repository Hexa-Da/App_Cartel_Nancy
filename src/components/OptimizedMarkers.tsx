import React, { memo, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Venue, Match } from '../types';

// Icônes mémorisées pour éviter les re-créations
const sportIcons = {
  'Football': new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmZjY2MDAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEyIiB5PSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPkY8L3RleHQ+Cjwvc3ZnPgo=',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'sport-marker-icon'
  }),
  'Basketball': new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMDY2Y2MiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEyIiB5PSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPkI8L3RleHQ+Cjwvc3ZnPgo=',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'sport-marker-icon'
  }),
  'Volleyball': new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMGM2MDAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEyIiB5PSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPlY8L3RleHQ+Cjwvc3ZnPgo=',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'sport-marker-icon'
  }),
  'default': new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM2NjY2NjYiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEyIiB5PSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiPk08L3RleHQ+Cjwvc3ZnPgo=',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'sport-marker-icon'
  })
};

interface OptimizedMarkerProps {
  venue: Venue;
  onMarkerClick: (venue: Venue) => void;
  isVisible: boolean;
}

const OptimizedMarker = memo(({ venue, onMarkerClick, isVisible }: OptimizedMarkerProps) => {
  const icon = useMemo(() => {
    return sportIcons[venue.sport as keyof typeof sportIcons] || sportIcons.default;
  }, [venue.sport]);

  const handleClick = useMemo(() => {
    return () => onMarkerClick(venue);
  }, [onMarkerClick, venue]);

  if (!isVisible) return null;

  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={icon}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup closeButton={false}>
        <div className="venue-popup">
          <h3>{venue.name}</h3>
          <p>{venue.description}</p>
          <p><strong>Sport:</strong> {venue.sport}</p>
          <p><strong>Adresse:</strong> {venue.address}</p>
          {venue.matches && venue.matches.length > 0 && (
            <div>
              <h4>Matchs:</h4>
              {venue.matches.map((match: Match) => (
                <div key={match.id} className="match-item">
                  <p><strong>{match.teams}</strong></p>
                  <p>{match.description}</p>
                  <p>{new Date(match.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
});

OptimizedMarker.displayName = 'OptimizedMarker';

interface OptimizedMarkersProps {
  venues: Venue[];
  onMarkerClick: (venue: Venue) => void;
  eventFilter: string;
  venueFilter: string;
}

const OptimizedMarkers = memo(({ venues, onMarkerClick, eventFilter, venueFilter }: OptimizedMarkersProps) => {
  const visibleVenues = useMemo(() => {
    return venues.filter(venue => {
      const typeMatch = eventFilter === 'all' || eventFilter === 'match' || eventFilter === venue.sport;
      const venueMatch = venueFilter === 'Tous' || venue.id === venueFilter;
      return typeMatch && venueMatch;
    });
  }, [venues, eventFilter, venueFilter]);

  return (
    <>
      {visibleVenues.map(venue => (
        <OptimizedMarker
          key={venue.id}
          venue={venue}
          onMarkerClick={onMarkerClick}
          isVisible={true}
        />
      ))}
    </>
  );
});

OptimizedMarkers.displayName = 'OptimizedMarkers';

export default OptimizedMarkers;
