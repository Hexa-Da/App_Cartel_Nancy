/**
 * @fileoverview Sections détaillées d'informations pratiques avec FAQ
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppPanels } from '../AppPanelsContext';
import { useApp } from '../AppContext';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaWrench, FaClock,
  FaFileAlt, FaShieldAlt, FaHotel, FaExclamationTriangle, FaFolderOpen, FaCheckCircle,
  FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import Parie from './Parie';
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
          { question: "À quelle heure est servi le petit-déjeuner ?", answer: "Le petit-déjeuner est servi de 7h00 à 9h30 dans les espaces dédiés de chaque hôtel partenaire." },
          { question: "Le petit-déjeuner est-il inclus ?", answer: "Oui, le petit-déjeuner est inclus dans votre pack participant. Présentez simplement votre bracelet." },
          { question: "Y a-t-il des options végétariennes ?", answer: "Absolument ! Chaque buffet propose des options végétariennes et sans gluten. N'hésitez pas à demander au personnel." },
          { question: "Puis-je prendre mon petit-déjeuner à emporter ?", answer: "Des sachets à emporter sont disponibles sur demande pour les participants ayant des matchs tôt le matin." },
        ]
      },
      {
        icon: <FaBreadSlice />,
        title: "Infos Déjeuner",
        faqs: [
          { question: "Où sont servis les déjeuners ?", answer: "Les déjeuners sont servis dans les espaces restauration proches des terrains de sport, identifiés sur la carte de l'app." },
          { question: "Quels sont les horaires du déjeuner ?", answer: "Le déjeuner est servi de 12h00 à 14h30. Un service continu est assuré pour s'adapter aux plannings des matchs." },
          { question: "Comment fonctionne le système de ticket ?", answer: "Votre bracelet fait office de ticket. Scannez-le à l'entrée du restaurant pour valider votre repas." },
          { question: "Peut-on manger sur les terrains ?", answer: "Non, la consommation de nourriture est interdite sur les terrains de sport. Des zones pique-nique sont aménagées à proximité." },
        ]
      },
      {
        icon: <FaUtensils />,
        title: "Infos Dîner",
        faqs: [
          { question: "Où se déroulent les dîners ?", answer: "Les dîners ont lieu dans différents restaurants partenaires selon le planning. Consultez l'app pour connaître votre restaurant du soir." },
          { question: "Dois-je réserver ma place ?", answer: "Non, votre place est automatiquement réservée. Présentez-vous simplement au restaurant indiqué avec votre bracelet." },
          { question: "À quelle heure commence le service ?", answer: "Le service du dîner commence à 19h30 et se termine vers 22h00." },
          { question: "Y a-t-il un dress code ?", answer: "Tenue correcte exigée pour les dîners. Le samedi soir (Gala), une tenue plus habillée est recommandée." },
        ]
      },
      {
        icon: <FaCalendarAlt />,
        title: "Planning Dîner",
        faqs: [
          { question: "Comment connaître mon restaurant du soir ?", answer: "Le planning des dîners est disponible dans l'onglet Fichiers de l'app. Vous recevrez aussi une notification le jour même." },
          { question: "Puis-je changer de restaurant ?", answer: "Les changements sont possibles jusqu'à 48h avant, sous réserve de disponibilité. Contactez l'organisation." },
          { question: "Que faire si j'ai un match le soir ?", answer: "Les plannings sont coordonnés. Si vous avez un match tardif, un repas froid peut être prévu. Signalez-le à l'avance." },
        ]
      },
      {
        icon: <FaPizzaSlice />,
        title: "Alternatives",
        faqs: [
          { question: "Y a-t-il des fast-foods à proximité ?", answer: "Oui, plusieurs restaurants rapides sont accessibles à pied depuis les sites. La carte de l'app les indique." },
          { question: "Puis-je manger en dehors des repas officiels ?", answer: "Bien sûr ! Vous êtes libres de manger où vous voulez, mais les repas officiels sont inclus dans votre inscription." },
          { question: "Des snacks sont-ils disponibles ?", answer: "Des stands de snacks et boissons sont présents sur tous les sites sportifs pendant la journée." },
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
          { question: "Quand a lieu la cérémonie d'ouverture ?", answer: "La cérémonie d'ouverture se tiendra le jeudi à 18h00 sur le site principal. Soyez présents 30 minutes avant." },
          { question: "La présence est-elle obligatoire ?", answer: "Oui, la cérémonie est un moment fort de l'événement. Tous les participants sont attendus en tenue de délégation." },
          { question: "Que se passe-t-il pendant la cérémonie ?", answer: "Défilé des délégations, discours officiels, présentation des sports et spectacle d'ouverture." },
          { question: "Combien de temps dure la cérémonie ?", answer: "La cérémonie dure environ 1h30, suivie d'un cocktail de bienvenue." },
        ]
      },
      {
        icon: <FaMapMarkerAlt />,
        title: "Terrains de sport",
        faqs: [
          { question: "Où se trouvent les terrains ?", answer: "Les terrains sont répartis sur plusieurs sites à Nancy. Consultez la carte interactive de l'app pour les localiser." },
          { question: "Comment accéder aux terrains ?", answer: "Des navettes gratuites circulent entre les hôtels et les sites sportifs. Horaires disponibles dans l'app." },
          { question: "Y a-t-il des vestiaires ?", answer: "Oui, chaque site dispose de vestiaires avec douches. Apportez votre cadenas personnel." },
          { question: "Où puis-je m'échauffer ?", answer: "Des zones d'échauffement sont prévues à proximité de chaque terrain. Respectez les créneaux horaires." },
        ]
      },
      {
        icon: <FaBook />,
        title: "Règles et fair-play",
        faqs: [
          { question: "Quelles règles s'appliquent ?", answer: "Les règles officielles de chaque fédération s'appliquent, avec quelques adaptations pour le format tournoi. Détails dans les fichiers sport." },
          { question: "Que faire en cas de litige ?", answer: "Les arbitres ont le dernier mot. En cas de désaccord, un référent sport peut être sollicité." },
          { question: "Y a-t-il des sanctions ?", answer: "Oui, cartons jaunes/rouges selon les sports. Un carton rouge peut entraîner une suspension pour les matchs suivants." },
          { question: "Comment signaler un comportement inapproprié ?", answer: "Utilisez le formulaire VSS de l'app ou adressez-vous à un organisateur sur place." },
        ]
      },
      {
        icon: <FaTrophy />,
        title: "Podiums et médailles",
        faqs: [
          { question: "Quand ont lieu les remises de médailles ?", answer: "Les podiums sont organisés à la fin de chaque tournoi, généralement le samedi après-midi." },
          { question: "Y a-t-il un classement général ?", answer: "Oui ! Un classement par délégation cumule les points de tous les sports. Résultats en direct dans l'app." },
          { question: "Quelles récompenses pour les vainqueurs ?", answer: "Médailles d'or, d'argent et de bronze pour chaque sport, plus un trophée pour la délégation gagnante." },
          { question: "Où a lieu la cérémonie finale ?", answer: "La grande cérémonie de clôture et remise des trophées a lieu samedi soir pendant le Gala." },
        ]
      },
    ]
  },
  party: {
    title: 'SOIRÉES',
    sections: [
      {
        icon: <FaMusic />,
        title: "Jeudi soir",
        faqs: [
          { question: "Que se passe-t-il jeudi soir ?", answer: "Soirée d'intégration après la cérémonie d'ouverture ! DJ set, bar ouvert et ambiance décontractée." },
          { question: "Où a lieu la soirée ?", answer: "Dans un bar/club du centre-ville. L'adresse exacte sera communiquée le jour même via l'app." },
          { question: "Y a-t-il un dress code ?", answer: "Non, venez comme vous êtes ! Tenue décontractée recommandée." },
          { question: "Jusqu'à quelle heure ?", answer: "La soirée se termine vers 2h00. Des navettes retour sont prévues." },
        ]
      },
      {
        icon: <FaGlassCheers />,
        title: "Vendredi soir",
        faqs: [
          { question: "Quel est le programme du vendredi ?", answer: "Soirée thématique avec animations, DJ contest et surprises ! Le thème sera révélé le jour J." },
          { question: "Faut-il se déguiser ?", answer: "Le déguisement n'est pas obligatoire mais fortement encouragé selon le thème annoncé !" },
          { question: "Y a-t-il des consommations offertes ?", answer: "Un ticket boisson est inclus dans votre bracelet. Consommations supplémentaires à votre charge." },
          { question: "Comment rentrer à l'hôtel ?", answer: "Navettes retour toutes les 30 minutes de minuit à 3h00. Arrêts à tous les hôtels partenaires." },
        ]
      },
      {
        icon: <FaUsers />,
        title: "Samedi soir - Gala",
        faqs: [
          { question: "En quoi consiste le Gala ?", answer: "Soirée de clôture avec dîner de gala, remise des trophées, spectacles et soirée dansante jusqu'au bout de la nuit !" },
          { question: "Quelle tenue pour le Gala ?", answer: "Tenue de soirée exigée : costume/chemise pour les hommes, robe/tenue habillée pour les femmes." },
          { question: "À quelle heure arrive-t-on ?", answer: "Accueil dès 19h00, début du dîner à 20h00. Ne soyez pas en retard !" },
          { question: "Jusqu'à quelle heure dure la soirée ?", answer: "La soirée se prolonge jusqu'à 4h00 du matin. Petit-déjeuner tardif prévu le dimanche !" },
        ]
      },
      {
        icon: <FaBus />,
        title: "Infos navettes",
        faqs: [
          { question: "Comment fonctionnent les navettes ?", answer: "Des bus gratuits circulent entre les hôtels, sites sportifs et lieux de soirée. Horaires dans l'app." },
          { question: "Faut-il réserver sa place ?", answer: "Non, les navettes fonctionnent en continu. Présentez simplement votre bracelet au chauffeur." },
          { question: "Y a-t-il des navettes de nuit ?", answer: "Oui ! Navettes retour après chaque soirée, de minuit à la fermeture." },
          { question: "Et si je rate la dernière navette ?", answer: "Des taxis partenaires sont disponibles à tarif préférentiel. Numéro dans l'onglet Infos de l'app." },
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
          { question: "Où sont situés les hôtels ?", answer: "Les hôtels partenaires sont tous situés dans le centre de Nancy ou à proximité immédiate des sites sportifs." },
          { question: "Comment connaître mon hôtel ?", answer: "Votre affectation hôtel vous a été communiquée par email. Elle est aussi visible dans votre espace participant." },
          { question: "Puis-je changer d'hôtel ?", answer: "Les changements sont exceptionnels et soumis à disponibilité. Contactez l'organisation au plus tôt." },
          { question: "Y a-t-il un parking ?", answer: "La plupart des hôtels disposent d'un parking payant. Tarifs préférentiels pour les participants sur présentation du bracelet." },
        ]
      },
      {
        icon: <FaClock />,
        title: "Horaires de réception",
        faqs: [
          { question: "À quelle heure puis-je faire le check-in ?", answer: "Le check-in est possible à partir de 14h00. Bagagerie disponible si vous arrivez plus tôt." },
          { question: "Jusqu'à quelle heure le check-out ?", answer: "Check-out avant 11h00 le dimanche. Une consigne bagages est disponible pour la journée." },
          { question: "La réception est-elle ouverte 24h/24 ?", answer: "Oui, tous nos hôtels partenaires ont une réception disponible jour et nuit." },
          { question: "Puis-je récupérer ma clé en avance ?", answer: "Oui, vous pouvez récupérer votre clé dès votre arrivée, même si la chambre n'est pas encore prête." },
        ]
      },
      {
        icon: <FaWrench />,
        title: "Services disponibles",
        faqs: [
          { question: "Le Wi-Fi est-il gratuit ?", answer: "Oui, tous les hôtels proposent un Wi-Fi gratuit. Code d'accès fourni à la réception." },
          { question: "Y a-t-il une salle de sport ?", answer: "Certains hôtels disposent d'une salle de fitness. Renseignez-vous à la réception de votre hôtel." },
          { question: "Puis-je faire laver mon linge ?", answer: "Un service de blanchisserie express est disponible dans la plupart des hôtels (service payant)." },
          { question: "Le petit-déjeuner est-il en chambre ?", answer: "Le petit-déjeuner est servi en salle. Room service disponible avec supplément dans certains hôtels." },
        ]
      },
      {
        icon: <FaQuestionCircle />,
        title: "Contact et assistance",
        faqs: [
          { question: "Qui contacter en cas de problème ?", answer: "Pour tout souci, contactez d'abord la réception de l'hôtel. En cas d'urgence, un numéro d'astreinte organisation est disponible 24h/24." },
          { question: "J'ai oublié quelque chose, que faire ?", answer: "Contactez directement l'hôtel après votre départ. Les objets trouvés sont conservés 30 jours." },
          { question: "Comment signaler un problème dans ma chambre ?", answer: "Signalez tout problème à la réception qui interviendra dans les plus brefs délais." },
          { question: "Puis-je inviter quelqu'un dans ma chambre ?", answer: "Les visiteurs extérieurs doivent se signaler à la réception. Respect du règlement de l'hôtel obligatoire." },
        ]
      },
    ]
  }
};

// Composant Accordéon Section (cliquable pour afficher les questions)
const SectionAccordion: React.FC<{ section: SectionFAQ; isOpen: boolean; onToggle: () => void }> = ({ section, isOpen, onToggle }) => {
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(null);

  return (
    <div className="faq-section">
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
    <div className="info-section-page">
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
      { question: "Le bracelet est-il obligatoire ?", answer: "Oui, le port du bracelet est obligatoire pendant toute la durée de l'événement. Il doit être visible en permanence." },
      { question: "Que permet le bracelet ?", answer: "Le bracelet vous donne accès à toutes les zones de l'événement : terrains de sport, espaces restauration, soirées et hôtels partenaires." },
      { question: "Puis-je l'enlever ?", answer: "Non, le bracelet ne doit pas être enlevé. Une fois retiré, il ne peut pas être remis et vous devrez contacter l'organisation." },
      { question: "Comment activer mon bracelet dans l'app ?", answer: "Rendez-vous dans la section \"Faites vos paris\" pour saisir votre numéro de bracelet et l'activer." },
    ]
  },
  {
    icon: <FaShieldAlt />,
    title: "Règles et sécurité",
    faqs: [
      { question: "Puis-je prêter mon bracelet ?", answer: "Non, le bracelet est strictement personnel et non cessible. Il est nominatif et lié à votre inscription." },
      { question: "Mon bracelet est abîmé, que faire ?", answer: "Si votre bracelet est endommagé mais toujours lisible, pas de souci. S'il est illisible, rendez-vous au point accueil pour un remplacement." },
      { question: "Le bracelet est-il waterproof ?", answer: "Oui, le bracelet résiste à l'eau. Vous pouvez le garder sous la douche ou à la piscine." },
    ]
  },
  {
    icon: <FaExclamationTriangle />,
    title: "Perte ou vol",
    faqs: [
      { question: "J'ai perdu mon bracelet, que faire ?", answer: "Rendez-vous immédiatement au point accueil le plus proche avec une pièce d'identité pour obtenir un nouveau bracelet." },
      { question: "Mon bracelet a été volé", answer: "Signalez le vol au point accueil. Votre ancien bracelet sera désactivé et un nouveau vous sera remis." },
      { question: "Le remplacement est-il payant ?", answer: "Le premier remplacement est gratuit. Les remplacements suivants peuvent être facturés selon les circonstances." },
    ]
  },
  {
    icon: <FaWrench />,
    title: "Contact et assistance",
    faqs: [
      { question: "Où se trouvent les points accueil ?", answer: "Un point accueil est présent sur chaque site sportif et dans chaque hôtel partenaire. Localisez-les sur la carte de l'app." },
      { question: "Les points accueil sont-ils toujours ouverts ?", answer: "Oui, un point accueil est disponible 24h/24 pendant toute la durée de l'événement." },
      { question: "Puis-je contacter l'organisation par téléphone ?", answer: "Oui, un numéro d'urgence est disponible dans l'onglet Infos de l'app. À utiliser uniquement en cas de besoin urgent." },
    ]
  },
];

// Section Bracelet avec accordéons
const BraceletSection: React.FC = () => {
  const [openSectionIndex, setOpenSectionIndex] = useState<number | null>(null);

  return (
    <div className="info-section-page">
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
  const { isEditing } = useAppPanels();
  const { isAdmin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    if (adminStatus !== isAdmin) {
      console.log('InfoSection - Sync admin:', adminStatus);
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
