import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';
import { useAppPanels } from '../AppPanelsContext';

interface BottomNavProps {
  closeLayoutPanels?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ closeLayoutPanels }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { closeAllPanels } = useAppPanels();

  const handleNavClick = (path: string) => {
    closeAllPanels();
    if (closeLayoutPanels) closeLayoutPanels();
    navigate(path, { replace: false });
  };

  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => handleNavClick('/')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/map' ? 'active' : ''}`}
        onClick={() => handleNavClick('/map')}
      >
        <span className="nav-icon">🗺️</span>
        <span className="nav-label">Carte</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/info' ? 'active' : ''}`}
        onClick={() => handleNavClick('/info')}
      >
        <span className="nav-icon">ℹ️</span>
        <span className="nav-label">Info</span>
      </button>
    </nav>
  );
};

export default BottomNav; 