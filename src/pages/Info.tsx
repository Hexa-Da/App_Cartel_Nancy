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
import { FaUtensils, FaShoppingCart, FaMapMarkedAlt, FaTrophy, FaIdCard, FaGavel, FaHotel, FaFileAlt, FaMoon, FaShieldAlt, FaGlassCheers, FaMusic, FaFileContract } from 'react-icons/fa';
import { GiPartyPopper } from 'react-icons/gi';
import { MdLeaderboard, MdEventNote } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, onClick }) => {
  return (
    <div className="info-card" onClick={onClick}>
      <div className="info-icon">{icon}</div>
      <h3 className="info-card-title">{title}</h3>
    </div>
  );
};

const Info: React.FC = () => {
  const navigate = useNavigate();

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
    if (section === 'map') {
      navigate('/map');
    } else {
      navigate(`/info/${section}`);
    }
  };

  return (
    <div className="info-page">
      <h1 className="info-title">INFOS PRATIQUES</h1>
      
      <div className="info-grid">
        <InfoCard
          icon={<FaUtensils />}
          title="Infos Restauration"
          onClick={() => handleCardClick('restauration')}
        />
        
        <InfoCard
          icon={<FaTrophy />}
          title="Info Sport"
          onClick={() => handleCardClick('activities')}
        />
        
        <InfoCard
          icon={<FaMusic />}
          title="Planning Soirées"
          onClick={() => handleCardClick('planning')}
        />
        
        <InfoCard
          icon={<FaHotel />}
          title="Info Hotels"
          onClick={() => handleCardClick('cashless')}
        />
        
        <InfoCard
          icon={<FaFileAlt />}
          title="Planning Files"
          onClick={() => handleCardClick('shop')}
        />
        
        <InfoCard
          icon={<FaFileContract />}
          title="Mentions Légales"
          onClick={() => handleCardClick('legal')}
        />
      </div>



      <style>{`
        .info-page {
          padding: 20px;
          margin-top: 40px;
          background-color: var(--bg-color);
          min-height: 100vh;
        }

        .info-title {
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 40px;
          color: var(--text-color);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          padding: 0 10px;
          max-width: 800px;
          margin: 0 auto;
        }

        .info-card {
          background-color: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .info-icon {
          font-size: 2rem;
          margin-bottom: 10px;
          color: var(--text-color);
        }

        .info-card-title {
          font-size: 0.9rem;
          margin: 0;
          color: var(--text-color);
          font-weight: 500;
        }

        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            padding: 0 5px;
          }

          .info-card {
            padding: 15px;
            min-height: 100px;
          }

          .info-icon {
            font-size: 1.8rem;
          }

          .info-card-title {
            font-size: 0.8rem;
          }

          .info-title {
            font-size: 2rem;
            margin-bottom: 30px;
          }
        }

        @media (min-width: 601px) and (max-width: 1024px) {
          .info-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }


      `}</style>
    </div>
  );
};

export default Info; 