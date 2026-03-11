/**
 * @fileoverview Page des informations pratiques de l'application Cartel Nancy
 * 
 * Cette page fournit :
 * - Menu de navigation vers les sections d'information
 * - Cartes cliquables pour chaque catégorie (restauration, sport, soirées, etc.)
 * - Navigation vers les sous-sections détaillées
 * - Accès aux mentions légales (politique de confidentialité, CGU)
 * - Design responsive avec grille adaptative
 * 
 * Nécessaire car :
 * - Centralise l'accès aux informations pratiques
 * - Interface intuitive pour naviguer entre les sections
 * - Conformité légale avec les mentions obligatoires
 * - Point d'entrée pour toutes les informations non-événementielles
 */

import React from 'react';
import './Info.css';
import { useNavigate } from 'react-router-dom';
import braceletImg from '../assets/info/IMG_bracelet.png';
import hotelImg from '../assets/info/IMG_hotel.png';
import legalImg from '../assets/info/IMG_legal.png';
import parisImg from '../assets/info/IMG_paris.png';
import partyImg from '../assets/info/IMG_party.png';
import planningImg from '../assets/info/IMG_planning.png';
import restoImg from '../assets/info/IMG_resto.png';
import sportImg from '../assets/info/IMG_sport.png';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  size?: 'small' | 'medium' | 'large' | 'wide';
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, onClick, size = 'small' }) => {
  return (
    <div className={`info-card info-card-${size}`} onClick={onClick}>
      <div className="info-icon">{icon}</div>
      <h3 className="info-card-title">{title}</h3>
    </div>
  );
};

const Info: React.FC = () => {
  const navigate = useNavigate();

  // Réinitialiser le scroll au chargement de la page
  React.useEffect(() => {
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.scrollTop = 0;
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);

  // Écouter la connexion admin réussie pour rafraîchir la page
  React.useEffect(() => {
    const handleAdminLoginSuccess = () => {
      // Rafraîchir l'état sans recharger complètement la page
      // pour éviter les problèmes avec la BottomNav
      setTimeout(() => {
        // Petit délai pour laisser le temps aux autres composants de se mettre à jour
        window.dispatchEvent(new Event('adminStateChanged'));
      }, 100);
    };

    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    return () => window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
  }, []);

  const handleCardClick = (section: string) => {
    navigate(`/info/${section}`);
  };

  return (
    <div className="page-content scrollable info-page">
      <h1 className="info-title">INFOS PRATIQUES</h1>
      
      <div className="info-grid">
        <InfoCard
          icon={<img src={restoImg} alt="Infos Restaurations" className="info-icon-image" />}
          title="Infos Restaurations"
          onClick={() => handleCardClick('restauration')}
          size="wide"
        />
        
        <InfoCard
          icon={<img src={sportImg} alt="Infos Sports" className="info-icon-image" />}
          title="Infos Sports"
          onClick={() => handleCardClick('sport')}
          size="medium"
        />
        
        <InfoCard
          icon={<img src={partyImg} alt="Infos Soirées" className="info-icon-image" />}
          title="Infos Soirées"
          onClick={() => handleCardClick('party')}
          size="medium"
        />
        
        <InfoCard
          icon={<img src={hotelImg} alt="Infos Hotels" className="info-icon-image" />}
          title="Infos Hotels"
          onClick={() => handleCardClick('hotel')}
          size="small"
        />
        
        <InfoCard
          icon={<img src={braceletImg} alt="Infos Bracelet" className="info-icon-image" />}
          title="Infos Bracelet"
          onClick={() => handleCardClick('bracelet')}
          size="small"
        />
        
        <InfoCard
          icon={<img src={parisImg} alt="Faites vos paris" className="info-icon-image" />}
          title="Faites vos paris"
          onClick={() => handleCardClick('parie')}
          size="wide"
        />
        
        <InfoCard
          icon={<img src={planningImg} alt="Fichiers Utiles" className="info-icon-image" />}
          title="Fichiers Utiles"
          onClick={() => handleCardClick('planning')}
          size="small"
        />
        
        <InfoCard
          icon={<img src={legalImg} alt="Mentions Légales" className="info-icon-image" />}
          title="Mentions Légales"
          onClick={() => handleCardClick('legal')}
          size="small"
        />
      </div>
    </div>
  );
};

export default Info; 