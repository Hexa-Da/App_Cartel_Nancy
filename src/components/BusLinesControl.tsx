import React, { useState } from 'react';
import './BusLinesControl.css';

interface BusLinesControlProps {
  visibleLines: string[];
  onLinesChange: (lines: string[]) => void;
}

const BusLinesControl: React.FC<BusLinesControlProps> = ({ visibleLines, onLinesChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tramLine = {
    id: 'T1',
    name: 'Ligne T1',
    description: 'Nancy Centre - Vandoeuvre - Essey-lès-Nancy',
    color: '#00A651'
  };

  const handleLineToggle = (lineId: string) => {
    if (visibleLines.includes(lineId)) {
      onLinesChange(visibleLines.filter(id => id !== lineId));
    } else {
      onLinesChange([...visibleLines, lineId]);
    }
  };

  const toggleAll = () => {
    if (visibleLines.length === 1) {
      onLinesChange([]);
    } else {
      onLinesChange([tramLine.id]);
    }
  };

  return (
    <div className="bus-lines-control">
      <button 
        className="control-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Afficher/Masquer la ligne de tramway"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <span>Ligne T1</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="control-panel">
          <div className="control-header">
            <h4>Ligne de tramway</h4>
            <button 
              className="toggle-all-btn"
              onClick={toggleAll}
            >
              {visibleLines.length === 1 ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          <div className="lines-list">
            <label className="line-checkbox">
              <input
                type="checkbox"
                checked={visibleLines.includes(tramLine.id)}
                onChange={() => handleLineToggle(tramLine.id)}
              />
              <div className="line-info">
                <div className="line-header">
                  <span 
                    className="line-color" 
                    style={{ backgroundColor: tramLine.color }}
                  ></span>
                  <span className="line-name">{tramLine.name}</span>
                </div>
                <span className="line-description">{tramLine.description}</span>
              </div>
            </label>
          </div>

          <div className="control-footer">
            <small>
              {visibleLines.length > 0 
                ? 'Ligne T1 affichée'
                : 'Ligne T1 masquée'
              }
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusLinesControl;
