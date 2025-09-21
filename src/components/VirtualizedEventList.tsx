import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

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
  };
}

const EventItem = memo(({ index, style, data }: EventItemProps) => {
  const { events, onEventClick, formatDateTime } = data;
  const event = events[index];

  const handleClick = useCallback(() => {
    onEventClick(event);
  }, [onEventClick, event]);

  const getEventIcon = useCallback(() => {
    if (event.type === 'party') return '🎉';
    if (event.sport === 'Football') return '⚽';
    if (event.sport === 'Basketball') return '🏀';
    if (event.sport === 'Volleyball') return '🏐';
    return '🏟️';
  }, [event.type, event.sport]);

  const getEventColor = useCallback(() => {
    if (event.isPassed) return '#ccc';
    if (event.type === 'party') return '#ff6b6b';
    if (event.sport === 'Football') return '#4ecdc4';
    if (event.sport === 'Basketball') return '#45b7d1';
    if (event.sport === 'Volleyball') return '#96ceb4';
    return '#feca57';
  }, [event.isPassed, event.type, event.sport]);

  return (
    <div style={style}>
      <div
        className="event-item"
        onClick={handleClick}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          backgroundColor: event.isPassed ? '#f8f9fa' : 'white',
          opacity: event.isPassed ? 0.7 : 1,
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!event.isPassed) {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
          }
        }}
        onMouseLeave={(e) => {
          if (!event.isPassed) {
            e.currentTarget.style.backgroundColor = 'white';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              fontSize: '24px',
              minWidth: '32px',
              textAlign: 'center'
            }}
          >
            {getEventIcon()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {event.name}
              </h3>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '500',
                  backgroundColor: getEventColor(),
                  color: 'white',
                  textTransform: 'uppercase'
                }}
              >
                {event.type === 'party' ? 'Soirée' : event.sport || 'Match'}
              </span>
            </div>
            <p
              style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                color: '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {event.description}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: '#888'
              }}
            >
              <span>📅 {formatDateTime(event.date, event.endTime)}</span>
              {event.venue && (
                <span>📍 {event.venue}</span>
              )}
            </div>
            {event.result && (
              <div
                style={{
                  marginTop: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#2d5a2d',
                  fontWeight: '500'
                }}
              >
                Résultat: {event.result}
              </div>
            )}
          </div>
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
  height?: number;
  itemHeight?: number;
}

const VirtualizedEventList = memo(({ 
  events, 
  onEventClick, 
  formatDateTime, 
  height = 400,
  itemHeight = 80
}: VirtualizedEventListProps) => {
  const itemData = useMemo(() => ({
    events,
    onEventClick,
    formatDateTime
  }), [events, onEventClick, formatDateTime]);

  if (events.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}
      >
        Aucun événement trouvé
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={events.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={5} // Rendu anticipé de 5 éléments pour de meilleures performances
    >
      {EventItem}
    </List>
  );
});

VirtualizedEventList.displayName = 'VirtualizedEventList';

export default VirtualizedEventList;
