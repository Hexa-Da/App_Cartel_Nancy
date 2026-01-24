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
import { FaUtensils, FaTrophy, FaHotel, FaFileAlt, FaMusic, FaFileContract, FaRing, FaDice } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

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
          icon={<FaUtensils />}
          title="Infos Restaurations"
          onClick={() => handleCardClick('restauration')}
          size="wide"
        />
        
        <InfoCard
          icon={<FaTrophy />}
          title="Infos Sports"
          onClick={() => handleCardClick('sport')}
          size="medium"
        />
        
        <InfoCard
          icon={<FaMusic />}
          title="Infos Soirées"
          onClick={() => handleCardClick('party')}
          size="medium"
        />
        
        <InfoCard
          icon={<FaHotel />}
          title="Infos Hotels"
          onClick={() => handleCardClick('hotel')}
          size="small"
        />
        
        <InfoCard
          icon={<FaRing />}
          title="Infos Bracelet"
          onClick={() => handleCardClick('bracelet')}
          size="small"
        />
        
        <InfoCard
          icon={<FaDice />}
          title="Faites vos paris"
          onClick={() => handleCardClick('parie')}
          size="wide"
        />
        
        <InfoCard
          icon={<FaFileAlt />}
          title="Fichiers Utiles"
          onClick={() => handleCardClick('planning')}
          size="small"
        />
        
        <InfoCard
          icon={<FaFileContract />}
          title="Mentions Légales"
          onClick={() => handleCardClick('legal')}
          size="small"
        />
      </div>
    </div>
  );
};

export default Info; 