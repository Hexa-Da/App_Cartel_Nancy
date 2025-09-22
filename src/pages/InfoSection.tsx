/**
 * @fileoverview Composant pour l'affichage des sections détaillées d'informations
 * 
 * Ce composant gère :
 * - Affichage dynamique des sections selon l'URL (restauration, sport, soirées, etc.)
 * - Navigation vers les sous-éléments de chaque section
 * - Gestion spéciale des mentions légales avec liens externes
 * - Interface cohérente pour toutes les sections d'information
 * - Gestion des clics pour les documents légaux (politique, CGU)
 * 
 * Nécessaire car :
 * - Centralise la logique d'affichage des sections
 * - Évite la duplication de code entre sections
 * - Gère la navigation dynamique basée sur l'URL
 * - Assure l'accès aux documents légaux obligatoires
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaCreditCard, FaWallet, FaWrench, FaTshirt, FaGift, FaClock, FaMedal, FaMoon,
  FaFileAlt, FaShieldAlt
} from 'react-icons/fa';
import './InfoSection.css';

interface SectionItem {
  icon: React.ReactNode;
  text: string;
}

interface SectionData {
  title: string;
  items: SectionItem[];
}

const sectionsData: { [key: string]: SectionData } = {
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
  activities: {
    title: 'SPORTS',
    items: [
      { icon: <FaBullhorn />, text: "Cérémonie d'ouverture" },
      { icon: <FaMapMarkerAlt />, text: 'Terrains de sport' },
      { icon: <FaBook />, text: 'Règles et fair-play' },
      { icon: <FaTrophy />, text: 'Podiums et médailles' },
    ]
  },
  planning: {
      title: 'SOIRÉES',
      items: [
        { icon: <FaMusic />, text: 'Jeudi soir' },
        { icon: <FaGlassCheers />, text: 'Vendredi soir' },
        { icon: <FaUsers />, text: 'Samedi soir - Gala' },
        { icon: <FaBus />, text: 'Infos navettes' },
      ]
  },
  cashless: {
    title: 'BRACELETS',
    items: [
      { icon: <FaQuestionCircle />, text: 'Comment ça marche ?' },
      { icon: <FaCreditCard />, text: 'Recharger mon bracelet' },
      { icon: <FaWallet />, text: 'Consulter mon solde' },
      { icon: <FaWrench />, text: 'Problèmes et SAV' },
    ]
  },
  shop: {
    title: 'TOSS SHOP',
    items: [
      { icon: <FaTshirt />, text: 'Vêtements' },
      { icon: <FaGift />, text: 'Goodies' },
      { icon: <FaClock />, text: 'Horaires d\'ouverture' },
    ]
  },
  ranking: {
    title: 'CLASSEMENT GÉNÉRAL',
    items: [
      { icon: <FaUsers />, text: 'Classement par délégation' },
      { icon: <FaTrophy />, text: 'Classement par sport' },
      { icon: <FaMedal />, text: 'Médailles' },
    ]
  },
  schedule: {
    title: 'PLANNING TOSS',
    items: [
      { icon: <FaCalendarAlt />, text: 'Planning des matchs' },
      { icon: <FaMoon />, text: 'Planning des soirées' },
      { icon: <FaUtensils />, text: 'Planning restauration' },
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

const InfoSection: React.FC = () => {
  const { sectionName } = useParams<{ sectionName: string }>();
  const section = sectionsData[sectionName || ''];

  const handleItemClick = (item: SectionItem) => {
    // Gestion spéciale pour les mentions légales
    if (sectionName === 'legal') {
      if (item.text === 'Politique de Confidentialité') {
        window.open('/privacy-policy.html', '_blank');
      } else if (item.text === 'Conditions Générales d\'Utilisation') {
        window.open('/terms-of-service.html', '_blank');
      }
    }
  };

  if (!section) {
    return (
        <div className="info-section-page">
            <div className="info-section-header">
                <h1>Section non trouvée</h1>
            </div>
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