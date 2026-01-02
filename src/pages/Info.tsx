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
import { FaUtensils, FaShoppingCart, FaMapMarkedAlt, FaTrophy, FaIdCard, FaGavel, FaHotel, FaFileAlt, FaMoon, FaShieldAlt, FaGlassCheers, FaMusic, FaFileContract, FaRing, FaDice } from 'react-icons/fa';
import { GiPartyPopper } from 'react-icons/gi';
import { MdLeaderboard, MdEventNote } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { BREAKPOINTS, MODAL_SIZES } from '../config/responsive';

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



      <style>{`
        .info-page {
          padding: 20px;
          padding-top: 10px;
          background-color: var(--bg-color);
          min-height: 100%;
        }

        .info-title {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 700;
          text-align: center;
          margin-bottom: clamp(30px, 5vh, 40px);
          color: var(--text-color);
          margin-left: auto;
          margin-right: auto;
          width: 100%;
          max-width: ${MODAL_SIZES.large};
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: minmax(120px, auto);
          gap: clamp(12px, 2vw, 20px);
          padding: 0 clamp(10px, 2vw, 20px);
          max-width: min(900px, 95vw);
          width: 100%;
          margin: auto;
          box-sizing: border-box;
        }

        /* Bento Grid Layout - Tailles variables */
        .info-card-small {
          grid-column: span 1;
          grid-row: span 1;
        }

        .info-card-medium {
          grid-column: span 2;
          grid-row: span 1;
        }

        .info-card-wide {
          grid-column: span 2;
          grid-row: span 1;
        }

        .info-card-large {
          grid-column: span 2;
          grid-row: span 2;
        }

        /* Glassmorphism Effect */
        .info-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: clamp(12px, 2vw, 16px);
          padding: clamp(15px, 3vw, 20px);
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                      box-shadow 0.2s ease,
                      border-color 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: clamp(100px, 15vh, 140px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          position: relative;
          overflow: hidden;
        }

        /* Dark theme glassmorphism */
        [data-theme="dark"] .info-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        /* Light theme glassmorphism */
        [data-theme="light"] .info-card {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        /* Micro-interaction au clic */
        .info-card:active {
          transform: scale(0.98);
          transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .info-card:hover {
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        [data-theme="dark"] .info-card:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .info-card:hover {
          border-color: rgba(0, 0, 0, 0.15);
        }

        .info-icon {
          font-size: clamp(2rem, 4vw, 2.8rem);
          margin-bottom: clamp(6px, 1.5vh, 10px);
          color: var(--text-color);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .info-card-title {
          font-size: clamp(0.75rem, 2vw, 0.95rem);
          margin: 0;
          color: var(--text-color);
          font-weight: 600;
          line-height: 1.3;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* Responsive Mobile First */
        @media (max-width: ${BREAKPOINTS.smallTablet}px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: clamp(10px, 3vw, 16px);
            padding: 0 clamp(8px, 2vw, 12px);
          }

          .info-card-small,
          .info-card-medium,
          .info-card-wide {
            grid-column: span 1;
            grid-row: span 1;
          }

          .info-card-large {
            grid-column: span 2;
            grid-row: span 1;
          }

          .info-card {
            min-height: clamp(90px, 18vh, 130px);
            padding: clamp(12px, 2.5vw, 16px);
          }

          .info-icon {
            font-size: clamp(1.8rem, 5vw, 2.4rem);
          }

          .info-card-title {
            font-size: clamp(0.7rem, 2.5vw, 0.85rem);
          }

          .info-title {
            font-size: clamp(1.6rem, 5vw, 2rem);
            margin-bottom: clamp(20px, 4vh, 30px);
          }
        }

        @media (min-width: ${BREAKPOINTS.smallTablet + 1}px) and (max-width: ${BREAKPOINTS.desktop}px) {
          .info-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .info-card-wide {
            grid-column: span 3;
          }

          .info-card-medium {
            grid-column: span 2;
          }
        }

        @media (min-width: ${BREAKPOINTS.desktop + 1}px) {
          .info-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

      `}</style>
    </div>
  );
};

export default Info; 