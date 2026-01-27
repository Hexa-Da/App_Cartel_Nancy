import React, { memo, useMemo, useCallback } from 'react';
// @ts-ignore - react-window types may not be properly exported
import { FixedSizeList } from 'react-window';
import './EventsTab.css';

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

interface EventItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    events: Event[];
    onEventClick: (event: Event) => void;
    formatDateTime: (dateString: string, endTimeString?: string) => string;
    getSportIcon: (sport: string) => string;
  };
}

const EventItem = memo(({ index, style, data }: EventItemProps) => {
  const { events, onEventClick, formatDateTime, getSportIcon } = data;
  const event = events[index];

  if (!event) {
    return null;
  }

  const handleClick = useCallback(() => {
    onEventClick(event);
  }, [onEventClick, event]);

  return (
    <div style={style}>
      <div 
        className={`event-item ${event.isPassed ? 'passed' : ''} ${event.type === 'match' ? 'match-event' : 'party-event'}`}
        onClick={handleClick}
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
            {event.result && <p className="event-result">Résultat : {event.result}</p>}
          </>
        )}
        {event.type === 'party' && (
          <>
            <p className="event-description">{event.description}</p>
            {event.sport !== 'Defile' && !event.description?.toLowerCase().includes('showcase') && (
              <div className="party-results">
                <h4 style={{ color: 'var(--success-color)', marginTop: '10px' }}>
                  Résultat : {event.result || 'à venir'}
                </h4>
              </div>
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
    </div>
  );
});

EventItem.displayName = 'EventItem';

interface VirtualizedEventListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  formatDateTime: (dateString: string, endTimeString?: string) => string;
  getSportIcon: (sport: string) => string;
  height?: number;
  itemHeight?: number;
}

const VirtualizedEventList = memo(({ 
  events, 
  onEventClick, 
  formatDateTime,
  getSportIcon,
  height = 400,
  itemHeight = 120
}: VirtualizedEventListProps) => {
  if (events.length === 0) {
    return (
      <div className="chat-empty-message">
        Aucun événement trouvé
      </div>
    );
  }

  const itemData = useMemo(() => ({
    events: events || [],
    onEventClick: onEventClick || (() => {}),
    formatDateTime: formatDateTime || ((date: string) => date),
    getSportIcon: getSportIcon || (() => '🏆')
  }), [events, onEventClick, formatDateTime, getSportIcon]);

  if (!itemData || !itemData.events || itemData.events.length === 0) {
    return (
      <div className="chat-empty-message">
        Aucun événement trouvé
      </div>
    );
  }

  const Row = ({ index, style, data }: EventItemProps) => {
    if (!data || !data.events || index >= data.events.length) {
      return <div style={style} />;
    }
    return <EventItem index={index} style={style} data={data} />;
  };

  return (
    <FixedSizeList
      height={height}
      itemCount={itemData.events.length}
      itemSize={itemHeight}
      width="100%"
      overscanCount={5}
      itemData={itemData}
      style={{ padding: '1rem', paddingTop: '1.5rem' }}
    >
      {Row as any}
    </FixedSizeList>
  );
});

VirtualizedEventList.displayName = 'VirtualizedEventList';

export default VirtualizedEventList;
