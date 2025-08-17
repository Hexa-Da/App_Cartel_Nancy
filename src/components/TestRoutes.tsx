import React from 'react';
import { Link } from 'react-router-dom';

const TestRoutes: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Test des Routes</h1>
      <div style={{ margin: '20px 0' }}>
        <Link to="/" style={{ margin: '10px', padding: '10px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Accueil
        </Link>
        <Link to="/privacy" style={{ margin: '10px', padding: '10px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Confidentialité
        </Link>
        <Link to="/terms" style={{ margin: '10px', padding: '10px', background: '#dc3545', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Conditions
        </Link>
      </div>
      <p>Cliquez sur les liens ci-dessus pour tester les routes</p>
    </div>
  );
};

export default TestRoutes;
