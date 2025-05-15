import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Bienvenue sur Cartel Nancy</h1>
      <p>Votre application pour suivre les événements sportifs à Nancy</p>
      <div className="features">
        <div className="feature-card">
          <span className="feature-icon">🗺️</span>
          <h3>Carte Interactive</h3>
          <p>Découvrez tous les lieux d'événements sur une carte interactive</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📅</span>
          <h3>Calendrier</h3>
          <p>Consultez le calendrier des événements à venir</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">💬</span>
          <h3>Messages</h3>
          <p>Restez informé des dernières actualités</p>
        </div>
      </div>
    </div>
  );
};

export default Home; 