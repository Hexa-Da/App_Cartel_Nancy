/**
 * @fileoverview Sections détaillées d'informations pratiques avec FAQ
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditing } from '../contexts/EditingContext';
import { useApp } from '../AppContext';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaWrench, FaClock,
  FaFileAlt, FaShieldAlt, FaHotel, FaExclamationTriangle, FaFolderOpen, FaCheckCircle,
  FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import Parie from './Parie';
import logger from '../services/Logger';
import './InfoSection.css';

interface FAQItem {
  question: string;
  answer: string;
}

interface SectionFAQ {
  icon: React.ReactNode;
  title: string;
  faqs: FAQItem[];
}

// FAQ Data
const faqData: { [key: string]: { title: string; sections: SectionFAQ[] } } = {
  restauration: {
    title: 'RESTAURATION',
    sections: [
      {
        icon: <FaCoffee />,
        title: "Infos P'tit dej",
        faqs: [
          { question: "Où se trouve le petit-déjeuner ?", answer: "réponse à venir" },
          { question: "À quelle heure est servi le petit-déjeuner ?", answer: "réponse à venir" },
          { question: "Y a-t-il des options végétariennes ?", answer: "réponse à venir" },
          { question: "Y a-t-il des options sans lactose ou sans gluten ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaBreadSlice />,
        title: "Infos Déjeuner",
        faqs: [
          { question: "Où sont servis les déjeuners ?", answer: "réponse à venir" },
          { question: "Quels sont les horaires du déjeuner ?", answer: "réponse à venir" },
          { question: "Combien de temps faut-il prévoir pour le déjeuner ?", answer: "réponse à venir" },
          { question: "Puis-je prendre un déjeuner supplémentaire si j'ai faim ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaUtensils />,
        title: "Infos Dîner",
        faqs: [
          { question: "Qui a acces au repas du soir ?", answer: "réponse à venir" },
          { question: "Où se déroulent les dîners ?", answer: "réponse à venir" },
          { question: "À quelle heure commence le service ?", answer: "réponse à venir" },
          { question: "Le menu est-il fixe ou au choix ?", answer: "réponse à venir" },
          { question: "Y a-t-il des options végétaliennes ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaCalendarAlt />,
        title: "Planning Dîner",
        faqs: [
          { question: "Comment connaître mon restaurant du soir ?", answer: "réponse à venir" },
          { question: "Puis-je changer de restaurant ?", answer: "réponse à venir" },
          { question: "Que faire si j'ai un match le soir ?", answer: "réponse à venir" },
          { question: "Que faire si je suis en retard au dîner ?", answer: "réponse à venir" },
          { question: "Puis-je annuler ma participation à un dîner ?", answer: "réponse à venir" },
          { question: "Les restaurants sont-ils accessibles en fauteuil roulant ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaPizzaSlice />,
        title: "Alternatives",
        faqs: [
          { question: "Y a-t-il des fast-foods à proximité ?", answer: "réponse à venir" },
          { question: "Puis-je manger en dehors des repas officiels ?", answer: "réponse à venir" },
          { question: "Des snacks sont-ils disponibles ?", answer: "réponse à venir" },
        ]
      },
    ]
  },
  sport: {
    title: 'SPORTS',
    sections: [
      {
        icon: <FaBullhorn />,
        title: "Cérémonie d'ouverture",
        faqs: [
          { question: "Quand a lieu la cérémonie d'ouverture ?", answer: "réponse à venir" },
          { question: "La présence est-elle obligatoire ?", answer: "réponse à venir" },
          { question: "Que se passe-t-il pendant la cérémonie ?", answer: "réponse à venir" },
          { question: "Combien de temps dure la cérémonie ?", answer: "réponse à venir" },
          { question: "Comment se rendre à la cérémonie d'ouverture ?", answer: "réponse à venir" },
          { question: "Puis-je prendre des photos pendant la cérémonie ?", answer: "réponse à venir" },
          { question: "Que faire si je ne peux pas assister à la cérémonie ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaMapMarkerAlt />,
        title: "Terrains de sport",
        faqs: [
          { question: "Comment accéder aux terrains ?", answer: "réponse à venir" },
          { question: "Y a-t-il des vestiaires ?", answer: "réponse à venir" },
          { question: "Où puis-je m'échauffer ?", answer: "réponse à venir" },
          { question: "Y a-t-il un service de premiers secours sur les terrains ?", answer: "réponse à venir" },
          { question: "Que faire en cas de mauvais temps ?", answer: "réponse à venir" },
          { question: "Les terrains sont-ils accessibles en fauteuil roulant ?", answer: "réponse à venir" },
          { question: "Y a-t-il des casiers pour ranger mes affaires ?", answer: "réponse à venir" },
          { question: "Puis-je utiliser les douches après mon match ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaBook />,
        title: "Règles et fair-play",
        faqs: [
          { question: "Quelles règles s'appliquent ?", answer: "réponse à venir" },
          { question: "Que faire en cas de litige ?", answer: "réponse à venir" },
          { question: "Y a-t-il des sanctions ?", answer: "réponse à venir" },
          { question: "Comment signaler un comportement inapproprié ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaTrophy />,
        title: "Podiums et résultats",
        faqs: [
          { question: "Quand ont lieu les remises de médailles ?", answer: "réponse à venir" },
          { question: "Y a-t-il un classement général ?", answer: "réponse à venir" },
          { question: "Où a lieu la cérémonie finale ?", answer: "réponse à venir" },
          { question: "Comment connaître les résultats en temps réel ?", answer: "réponse à venir" },
          { question: "Y a-t-il des récompenses pour les seconds et troisièmes ?", answer: "réponse à venir" },
        ]
      },
    ]
  },
  party: {
      title: 'SOIRÉES',
    sections: [
      {
        icon: <FaMusic />,
        title: "Jeudi soir - Show Pompoms",
        faqs: [
          { question: "Que se passe-t-il jeudi soir ?", answer: "réponse à venir" },
          { question: "Où a lieu la soirée ?", answer: "réponse à venir" },
          { question: "Jusqu'à quelle heure ?", answer: "réponse à venir" },
          { question: "L'entrée est-elle gratuite avec le bracelet ?", answer: "réponse à venir" },
          { question: "Y a-t-il un âge minimum pour participer ?", answer: "réponse à venir" },
          { question: "Y a-t-il un vestiaire pour déposer mes affaires ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaGlassCheers />,
        title: "Vendredi soir - Showcase",
        faqs: [
          { question: "Quel est le programme du vendredi ?", answer: "réponse à venir" },
          { question: "Comment rentrer à l'hôtel ?", answer: "réponse à venir" },
          { question: "À quelle heure commence la soirée ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaUsers />,
        title: "Samedi soir - DJ Contest",
        faqs: [
          { question: "Jusqu'à quelle heure dure la soirée ?", answer: "réponse à venir" },
          { question: "Puis-je inviter quelqu'un qui n'est pas participant ?", answer: "réponse à venir" },
          { question: "Y a-t-il un photographe professionnel ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaBus />,
        title: "Infos navettes",
        faqs: [
          { question: "Comment fonctionnent les navettes ?", answer: "réponse à venir" },
          { question: "Faut-il réserver sa place ?", answer: "réponse à venir" },
          { question: "Et si je rate la dernière navette ?", answer: "réponse à venir" },
          { question: "Quelle est la fréquence des navettes ?", answer: "réponse à venir" },
          { question: "Où sont les arrêts de navettes ?", answer: "réponse à venir" },
          { question: "Les navettes sont-elles accessibles aux personnes à mobilité réduite ?", answer: "réponse à venir" },
          { question: "Que faire si une navette est en retard ?", answer: "réponse à venir" },
        ]
      },
      ]
  },
  hotel: {
    title: 'HÔTELS',
    sections: [
      {
        icon: <FaMapMarkerAlt />,
        title: "Localisation des hôtels",
        faqs: [
          { question: "Où sont situés les hôtels ?", answer: "réponse à venir" },
          { question: "Comment connaître mon hôtel ?", answer: "réponse à venir" },
          { question: "Puis-je changer d'hôtel ?", answer: "réponse à venir" },
          { question: "Y a-t-il un parking ?", answer: "réponse à venir" },
          { question: "Quelle est la distance entre l'hôtel et les sites sportifs ?", answer: "réponse à venir" },
          { question: "Y a-t-il des transports en commun à proximité ?", answer: "réponse à venir" },
          { question: "Puis-je réserver une chambre supplémentaire pour un invité ?", answer: "réponse à venir" },
          { question: "Les hôtels sont-ils accessibles en transport en commun depuis la gare ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaClock />,
        title: "Horaires de réception",
        faqs: [
          { question: "À quelle heure puis-je faire le check-in ?", answer: "réponse à venir" },
          { question: "Jusqu'à quelle heure le check-out ?", answer: "réponse à venir" },
          { question: "La réception est-elle ouverte 24h/24 ?", answer: "réponse à venir" },
          { question: "Puis-je récupérer ma clé en avance ?", answer: "réponse à venir" },
          { question: "Puis-je laisser mes bagages après le check-out ?", answer: "réponse à venir" },
          { question: "Y a-t-il une consigne à bagages ?", answer: "réponse à venir" },
          { question: "Puis-je faire un check-in anticipé si j'arrive tôt ?", answer: "réponse à venir" },
          { question: "Que faire si j'arrive après minuit ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaWrench />,
        title: "Services disponibles",
        faqs: [
          { question: "Le Wi-Fi est-il gratuit ?", answer: "réponse à venir" },
          { question: "Y a-t-il une salle de sport ?", answer: "réponse à venir" },
          { question: "Puis-je faire laver mon linge ?", answer: "réponse à venir" },
          { question: "Le petit-déjeuner est-il en chambre ?", answer: "réponse à venir" },
          { question: "Y a-t-il la climatisation dans les chambres ?", answer: "réponse à venir" },
          { question: "Puis-je amener mon animal de compagnie ?", answer: "réponse à venir" },
          { question: "Y a-t-il un minibar dans la chambre ?", answer: "réponse à venir" },
          { question: "Le petit-déjeuner est-il servi en buffet ou à la carte ?", answer: "réponse à venir" },
        ]
      },
      {
        icon: <FaQuestionCircle />,
        title: "Contact et assistance",
        faqs: [
          { question: "Qui contacter en cas de problème ?", answer: "réponse à venir" },
          { question: "J'ai oublié quelque chose, que faire ?", answer: "réponse à venir" },
          { question: "Comment signaler un problème dans ma chambre ?", answer: "réponse à venir" },
          { question: "Puis-je inviter quelqu'un dans ma chambre ?", answer: "réponse à venir" },
          { question: "Y a-t-il un numéro d'urgence 24h/24 ?", answer: "réponse à venir" },
          { question: "Comment réserver une chambre supplémentaire ?", answer: "réponse à venir" },
          { question: "Que faire en cas d'urgence médicale ?", answer: "réponse à venir" },
          { question: "Puis-je payer ma chambre avec une carte bancaire ?", answer: "réponse à venir" },
        ]
      },
    ]
  }
};

// Composant Accordéon Section (cliquable pour afficher les questions)
const SectionAccordion: React.FC<{ section: SectionFAQ; isOpen: boolean; onToggle: () => void }> = ({ section, isOpen, onToggle }) => {
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(null);

  // Fermer la question ouverte quand la section se ferme
  useEffect(() => {
    if (!isOpen) {
      setOpenQuestionIndex(null);
    }
  }, [isOpen]);

  return (
    <div className={`faq-section ${isOpen ? 'open' : ''}`}>
      <div className="faq-section-header" onClick={onToggle}>
        <div className="faq-section-left">
          <span className="faq-section-icon">{section.icon}</span>
          <h2>{section.title}</h2>
        </div>
        <span className="faq-section-chevron">
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </div>
      
      {isOpen && (
        <div className="faq-list">
          {section.faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <div 
                className="faq-question"
                onClick={() => setOpenQuestionIndex(openQuestionIndex === index ? null : index)}
              >
                <span>{faq.question}</span>
                {openQuestionIndex === index ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              {openQuestionIndex === index && (
                <div className="faq-answer">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Composant Page FAQ
const FAQPage: React.FC<{ sectionKey: string }> = ({ sectionKey }) => {
  const data = faqData[sectionKey];
  const [openSectionIndex, setOpenSectionIndex] = useState<number | null>(null);
  
  if (!data) return null;

  return (
    <div className="page-content scrollable info-section-page">
      <div className="info-section-header">
        <h1>{data.title}</h1>
      </div>
      <div className="faq-container">
        {data.sections.map((section, index) => (
          <SectionAccordion 
            key={index} 
            section={section}
            isOpen={openSectionIndex === index}
            onToggle={() => setOpenSectionIndex(openSectionIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
};

// FAQ Data pour Bracelet
const braceletFaqData: SectionFAQ[] = [
  {
    icon: <FaQuestionCircle />,
    title: "À quoi sert le bracelet ?",
    faqs: [
      { question: "Le bracelet est-il obligatoire ?", answer: "réponse à venir" },
      { question: "Que permet le bracelet ?", answer: "réponse à venir" },
      { question: "Puis-je l'enlever ?", answer: "réponse à venir" },
      { question: "Comment activer mon bracelet dans l'app ?", answer: "réponse à venir" },
      { question: "Le bracelet permet-il de payer des achats ?", answer: "réponse à venir" },
      { question: "Puis-je accéder aux zones VIP avec mon bracelet ?", answer: "réponse à venir" },
      { question: "Y a-t-il une photo sur le bracelet ?", answer: "réponse à venir" },
      { question: "Mes données personnelles sont-elles stockées dans le bracelet ?", answer: "réponse à venir" },
    ]
  },
  {
    icon: <FaShieldAlt />,
    title: "Règles et sécurité",
    faqs: [
      { question: "Puis-je prêter mon bracelet ?", answer: "réponse à venir" },
      { question: "Mon bracelet est abîmé, que faire ?", answer: "réponse à venir" },
      { question: "Le bracelet est-il waterproof ?", answer: "réponse à venir" },
      { question: "Que faire si mon bracelet ne fonctionne plus ?", answer: "réponse à venir" },
      { question: "Le bracelet est-il résistant aux chocs ?", answer: "réponse à venir" },
      { question: "Puis-je personnaliser mon bracelet ?", answer: "réponse à venir" },
    ]
  },
  {
    icon: <FaExclamationTriangle />,
    title: "Perte ou vol",
    faqs: [
      { question: "J'ai perdu mon bracelet, que faire ?", answer: "réponse à venir" },
      { question: "Mon bracelet a été volé", answer: "réponse à venir" },
      { question: "Le remplacement est-il payant ?", answer: "réponse à venir" },
      { question: "Combien de temps faut-il pour obtenir un nouveau bracelet ?", answer: "réponse à venir" },
      { question: "Dois-je apporter une preuve d'identité pour le remplacement ?", answer: "réponse à venir" },
      { question: "Que faire si je trouve mon bracelet après l'avoir signalé perdu ?", answer: "réponse à venir" },
    ]
  },
  {
    icon: <FaWrench />,
    title: "Contact et assistance",
    faqs: [
      { question: "Où se trouvent les points accueil ?", answer: "réponse à venir" },
      { question: "Les points accueil sont-ils toujours ouverts ?", answer: "réponse à venir" },
      { question: "Puis-je contacter l'organisation par téléphone ?", answer: "réponse à venir" },
      { question: "Y a-t-il un email de contact pour l'organisation ?", answer: "réponse à venir" },
      { question: "Puis-je contacter l'organisation via l'application ?", answer: "réponse à venir" },
      { question: "Y a-t-il un chat en direct disponible ?", answer: "réponse à venir" },
    ]
  },
];

// Section Bracelet avec accordéons
const BraceletSection: React.FC = () => {
  const [openSectionIndex, setOpenSectionIndex] = useState<number | null>(null);

  return (
    <div className="page-content scrollable info-section-page">
      <div className="info-section-header">
        <h1>INFOS BRACELET</h1>
      </div>
      <div className="faq-container">
        {braceletFaqData.map((section, index) => (
          <SectionAccordion 
            key={index} 
            section={section}
            isOpen={openSectionIndex === index}
            onToggle={() => setOpenSectionIndex(openSectionIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
};

// Sections avec liste simple (planning, legal)
const sectionsData: { [key: string]: { title: string; items: { icon: React.ReactNode; text: string }[] } } = {
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
  const { isEditing } = useEditing();
  const { isAdmin } = useApp();
  const navigate = useNavigate();
  
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    if (adminStatus !== isAdmin) {
      logger.log('InfoSection - Sync admin:', adminStatus);
    }
  }, [isAdmin, isEditing]);

  // Sections spéciales
  if (sectionName === 'parie') return <Parie />;
  if (sectionName === 'bracelet') return <BraceletSection />;

  // Sections FAQ
  if (sectionName && faqData[sectionName]) {
    return <FAQPage sectionKey={sectionName} />;
  }

  // Sections avec liste simple
  const section = sectionsData[sectionName || ''];

  const handleItemClick = (item: { text: string }) => {
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
        <div className="page-content scrollable info-section-page">
        <div className="info-section-header"><h1>Section non trouvée</h1></div>
            <p>Cette section n'existe pas.</p>
      </div>
    );
  }

  return (
    <div className="page-content scrollable info-section-page">
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
