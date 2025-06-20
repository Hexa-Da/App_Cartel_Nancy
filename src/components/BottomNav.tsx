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

  return (
    <nav className={`bottom-nav ${platformClass}`}>
      <button 
        className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => handleNavClick('/')}
      >
        <span className="nav-icon">🏠</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/map' ? 'active' : ''}`}
        onClick={() => handleNavClick('/map')}
      >
        <span className="nav-icon">🗺️</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/info' ? 'active' : ''}`}
        onClick={() => handleNavClick('/info')}
      >
        <span className="nav-icon">ℹ️</span>
      </button>
    </nav>
  );
};

export default BottomNav; 