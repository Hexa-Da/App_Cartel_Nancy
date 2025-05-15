import React from 'react';

const Info: React.FC = () => {
  return (
    <div className="info-page">
      <h1>À propos</h1>
      <div className="info-section">
        <h2>Cartel Nancy</h2>
        <p>Application mobile développée pour faciliter l'accès aux informations sur les événements sportifs à Nancy.</p>
      </div>
      
      <div className="info-section">
        <h2>Contact</h2>
        <p>Pour toute question ou suggestion :</p>
        <ul>
          <li>📧 Email : contact@cartelnancy.fr</li>
          <li>📱 Téléphone : 03 XX XX XX XX</li>
        </ul>
      </div>
      
      <div className="info-section">
        <h2>Version</h2>
        <p>Version 1.0.0</p>
      </div>
    </div>
  );
};

export default Info; 