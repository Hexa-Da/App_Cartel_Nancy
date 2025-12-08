/**
 * @fileoverview Sections détaillées d'informations pratiques
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppPanels } from '../AppPanelsContext';
import { useApp } from '../AppContext';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaWrench, FaClock,
  FaFileAlt, FaShieldAlt, FaHotel, FaExclamationTriangle, FaFolderOpen, FaCheckCircle
} from 'react-icons/fa';
import Parie from './Parie';
import './InfoSection.css';

interface SectionItem {
  icon: React.ReactNode;
  text: string;
}

const sectionsData: { [key: string]: { title: string; items: SectionItem[] } } = {
  restauration: {
    title: 'RESTAURATION',
    items: [
      { icon: <FaCoffee />, text: "Infos P'tit dej" },
      { icon: <FaBreadSlice />, text: 'Infos Déjeuner' },
      { icon: <FaUtensils />, text: 'Infos Dîner' },
      { icon: <FaCalendarAlt />, text: 'Planning Dîner' },
      { icon: <FaPizzaSlice />, text: 'Alternatives' },
    ],
  },
  sport: {
    title: 'SPORTS',
    items: [
      { icon: <FaBullhorn />, text: "Cérémonie d'ouverture" },
      { icon: <FaMapMarkerAlt />, text: 'Terrains de sport' },
      { icon: <FaBook />, text: 'Règles et fair-play' },
      { icon: <FaTrophy />, text: 'Podiums et médailles' },
    ]
  },
  party: {
    title: 'SOIRÉES',
    items: [
      { icon: <FaMusic />, text: 'Jeudi soir' },
      { icon: <FaGlassCheers />, text: 'Vendredi soir' },
      { icon: <FaUsers />, text: 'Samedi soir - Gala' },
      { icon: <FaBus />, text: 'Infos navettes' },
    ]
  },
  hotel: {
    title: 'HOTELS',
    items: [
      { icon: <FaMapMarkerAlt />, text: 'Localisation des hôtels' },
      { icon: <FaClock />, text: 'Horaires de réception' },
      { icon: <FaWrench />, text: 'Services disponibles' },
      { icon: <FaQuestionCircle />, text: 'Contact et assistance' },
    ]
  },
  planning: {
    title: 'FICHIERS',
    items: [
      { icon: <FaFolderOpen />, text: 'Tous les fichiers' },
      { icon: <FaTrophy />, text: 'Fichiers pour les différents sports' },
      { icon: <FaUtensils />, text: 'Fichiers pour les restaurants' },
      { icon: <FaHotel />, text: 'Fichiers pour les hôtels' },
      { icon: <FaMusic />, text: 'Fichiers pour les soirées/défilé' },
      { icon: <FaBus />, text: 'Fichiers pour les bus fin de soirée' },
      { icon: <FaExclamationTriangle />, text: 'Fichiers HSE' },
    ]
  },
  legal: {
    title: 'MENTIONS LÉGALES',
    items: [
      { icon: <FaShieldAlt />, text: 'Politique de Confidentialité' },
      { icon: <FaFileAlt />, text: 'Conditions Générales d\'Utilisation' },
    ]
  }
};

// Section Bracelet
const BraceletSection: React.FC = () => {
  const [storedBracelet, setStoredBracelet] = useState<string | null>(null);

  useEffect(() => {
    setStoredBracelet(localStorage.getItem('userBraceletNumber'));
  }, []);

  return (
    <div className="info-section-page">
      <div className="info-section-header">
        <h1>INFOS BRACELET</h1>
      </div>
      <div className="bracelet-content">
        <div className="bracelet-info-card">
          <h2>Votre bracelet participant</h2>
          {storedBracelet ? (
            <div className="bracelet-activated">
              <p className="bracelet-number">N° {storedBracelet}</p>
              <p className="bracelet-status active"><FaCheckCircle /> Activé</p>
            </div>
          ) : (
            <div className="bracelet-not-activated">
              <p className="bracelet-status inactive">Non activé</p>
              <p>Rendez-vous dans "Faites vos paris" pour activer votre bracelet.</p>
            </div>
          )}
        </div>
        <div className="bracelet-rules">
          <h3>À propos du bracelet</h3>
          <ul>
            <li><strong>Port obligatoire :</strong> Gardez-le visible en permanence</li>
            <li><strong>Pass d'accès :</strong> Accès à toutes les zones de l'événement</li>
            <li><strong>Ne pas perdre :</strong> En cas de perte, contactez l'organisation</li>
            <li><strong>Non cessible :</strong> Bracelet personnel, ne peut pas être prêté</li>
          </ul>
        </div>
        <div className="bracelet-contact">
          <h3>En cas de problème</h3>
          <p>Contactez l'organisation au point accueil de chaque site.</p>
        </div>
      </div>
    </div>
  );
};

const InfoSection: React.FC = () => {
  const { sectionName } = useParams<{ sectionName: string }>();
  const { isEditing } = useAppPanels();
  const { isAdmin } = useApp();
  const navigate = useNavigate();
  const section = sectionsData[sectionName || ''];

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    if (adminStatus !== isAdmin) {
      console.log('InfoSection - Sync admin:', adminStatus);
    }
  }, [isAdmin, isEditing]);

  // Sections spéciales
  if (sectionName === 'parie') return <Parie />;
  if (sectionName === 'bracelet') return <BraceletSection />;

  const handleItemClick = (item: SectionItem) => {
    if (sectionName === 'legal') {
      if (item.text === 'Politique de Confidentialité') {
        window.open('/privacy-policy.html', '_blank');
      } else if (item.text === 'Conditions Générales d\'Utilisation') {
        window.open('/terms-of-service.html', '_blank');
      }
      return;
    }
    
    if (sectionName === 'planning') {
      const routes: { [key: string]: string } = {
        'Tous les fichiers': '/planning-files?all=true&from=info-section',
        'Fichiers pour les différents sports': '/planning-files?sports=true&from=info-section',
        'Fichiers pour les restaurants': '/planning-files?restaurants=true&from=info-section',
        'Fichiers pour les hôtels': '/planning-files?hotel=true&from=info-section',
        'Fichiers pour les soirées/défilé': '/planning-files?party=true&from=info-section',
        'Fichiers pour les bus fin de soirée': '/planning-files?bus=true&from=info-section',
        'Fichiers HSE': '/planning-files?hse=true&from=info-section',
      };
      const targetUrl = routes[item.text];
      if (targetUrl) navigate(targetUrl, { state: { from: 'info-section' } });
    }
  };

  if (!section) {
    return (
      <div className="info-section-page">
        <div className="info-section-header"><h1>Section non trouvée</h1></div>
        <p>Cette section n'existe pas.</p>
      </div>
    );
  }

  return (
    <div className="info-section-page">
      <div className="info-section-header">
        <h1>{section.title}</h1>
      </div>
      <ul className="info-section-list">
        {section.items.map((item, index) => (
          <li key={index} className="info-section-list-item" onClick={() => handleItemClick(item)}>
            <span className="item-icon">{item.icon}</span>
            <span className="item-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InfoSection;
