import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';
import { useAppPanels } from '../AppPanelsContext';
import { Capacitor } from '@capacitor/core';

interface BottomNavProps {
  closeLayoutPanels?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ closeLayoutPanels }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { closeAllPanels } = useAppPanels();
  const [platformClass, setPlatformClass] = useState('');

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setPlatformClass(platform);
  }, []);

  const handleNavClick = (path: string) => {
    closeAllPanels();
    if (closeLayoutPanels) closeLayoutPanels();
    navigate(path, { replace: false });
  };

  const handleTouchEnd = (e: React.TouchEvent, path: string) => {
    e.stopPropagation();
    handleNavClick(path);
  };

  const handleClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleNavClick(path);
  };

  return (
    <nav className={`bottom-nav ${platformClass}`}>
      <button 
        className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
        onClick={(e) => handleClick(e, '/')}
        onTouchEnd={(e) => handleTouchEnd(e, '/')}
      >
        <svg 
          className="nav-icon"
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/map' ? 'active' : ''}`}
        onClick={(e) => handleClick(e, '/map')}
        onTouchEnd={(e) => handleTouchEnd(e, '/map')}
      >
        <svg 
          className="nav-icon"
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/info' ? 'active' : ''}`}
        onClick={(e) => handleClick(e, '/info')}
        onTouchEnd={(e) => handleTouchEnd(e, '/info')}
      >
        <svg 
          className="nav-icon"
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>
    </nav>
  );
};

export default BottomNav; 