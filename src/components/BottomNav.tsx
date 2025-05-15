import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-button ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/map' ? 'active' : ''}`}
        onClick={() => navigate('/map')}
      >
        <span className="nav-icon">🗺️</span>
        <span className="nav-label">Carte</span>
      </button>
      
      <button 
        className={`nav-button ${location.pathname === '/info' ? 'active' : ''}`}
        onClick={() => navigate('/info')}
      >
        <span className="nav-icon">ℹ️</span>
        <span className="nav-label">Info</span>
      </button>
    </nav>
  );
};

export default BottomNav; 