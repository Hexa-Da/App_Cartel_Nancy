import React from 'react';
import './Info.css';
import { FaUtensils, FaShoppingCart, FaMapMarkedAlt, FaTrophy, FaIdCard } from 'react-icons/fa';
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
          icon={<GiPartyPopper />}
          title="Planning Soirées"
          onClick={() => handleCardClick('planning')}
        />
        
        <InfoCard
          icon={<FaIdCard />}
          title="Bracelets Cashless"
          onClick={() => handleCardClick('cashless')}
        />
        
        <InfoCard
          icon={<FaShoppingCart />}
          title="TOSS Shop"
          onClick={() => handleCardClick('shop')}
        />
        
        <InfoCard
          icon={<FaMapMarkedAlt />}
          title="Carte Interactive"
          onClick={() => handleCardClick('map')}
        />
        
        <InfoCard
          icon={<MdLeaderboard />}
          title="Classement Général"
          onClick={() => handleCardClick('ranking')}
        />
        
        <InfoCard
          icon={<MdEventNote />}
          title="Planning TOSS"
          onClick={() => handleCardClick('schedule')}
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