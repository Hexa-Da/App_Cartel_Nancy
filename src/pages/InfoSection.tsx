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

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppPanels } from '../AppPanelsContext';
import { useApp } from '../AppContext';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaWrench, FaClock,
  FaFileAlt, FaShieldAlt, FaHotel, FaExclamationTriangle, FaFolderOpen
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

const InfoSection: React.FC = () => {
  const { sectionName } = useParams<{ sectionName: string }>();
  const { isEditing } = useAppPanels();
  const { isAdmin } = useApp();
  const navigate = useNavigate();
  const section = sectionsData[sectionName || ''];
  
  // Forcer la synchronisation des états sur iOS
  useEffect(() => {
    // Vérifier et synchroniser l'état admin depuis localStorage
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    if (adminStatus !== isAdmin) {
      console.log('InfoSection - Synchronisation admin depuis localStorage:', adminStatus);
    }
    
    // Vérifier et synchroniser l'état editing depuis localStorage
    const editingStatus = localStorage.getItem('isEditing') === 'true';
    if (editingStatus !== isEditing) {
      console.log('InfoSection - Synchronisation editing depuis localStorage:', editingStatus);
    }
  }, [isAdmin, isEditing]);

  const handleItemClick = (item: SectionItem) => {
    // Gestion spéciale pour les mentions légales
    if (sectionName === 'legal') {
      if (item.text === 'Politique de Confidentialité') {
        window.open('/privacy-policy.html', '_blank');
      } else if (item.text === 'Conditions Générales d\'Utilisation') {
        window.open('/terms-of-service.html', '_blank');
      }
    }
    
    // Gestion spéciale pour Fichiers - navigation React Router
    if (sectionName === 'planning') {
      if (item.text === 'Tous les fichiers') {
        // Naviguer vers PlanningFiles sans filtre (tous les fichiers)
        navigate('/planning-files?all=true&from=info-section');
      } else if (item.text === 'Fichiers pour les différents sports') {
        // Naviguer vers PlanningFiles avec filtre sports et provenance
        navigate('/planning-files?sports=true&from=info-section');
      } else if (item.text === 'Fichiers pour les restaurants') {
        // Naviguer vers PlanningFiles avec filtre restaurants et provenance
        navigate('/planning-files?restaurants=true&from=info-section');
      } else if (item.text === 'Fichiers pour les hôtels') {
        // Naviguer vers PlanningFiles avec filtre hotel et provenance
        navigate('/planning-files?hotel=true&from=info-section');
      } else if (item.text === 'Fichiers pour les soirées/défilé') {
        // Naviguer vers PlanningFiles avec filtre party et provenance
        navigate('/planning-files?party=true&from=info-section');
      } else if (item.text === 'Fichiers pour les bus fin de soirée') {
        // Naviguer vers PlanningFiles avec filtre bus et provenance
        navigate('/planning-files?bus=true&from=info-section');
      } else if (item.text === 'Fichiers HSE') {
        // Naviguer vers PlanningFiles avec filtre hse et provenance
        navigate('/planning-files?hse=true&from=info-section');
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