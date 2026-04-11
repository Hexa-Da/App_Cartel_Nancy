/**
 * @fileoverview Sections détaillées d'informations pratiques avec FAQ
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onValue, ref, set } from 'firebase/database';
import { database } from '../firebase';
import { useEditing } from '../contexts/EditingContext';
import { useApp } from '../AppContext';
import { 
  FaCoffee, FaBreadSlice, FaUtensils, FaCalendarAlt, FaPizzaSlice, 
  FaBullhorn, FaMapMarkerAlt, FaBook, FaTrophy, FaMusic, FaGlassCheers, FaUsers, 
  FaBus, FaQuestionCircle, FaWrench, FaClock,
  FaFileAlt, FaShieldAlt, FaHotel, FaExclamationTriangle, FaFolderOpen,
  FaChevronDown, FaChevronUp, FaArrowDown, FaArrowUp
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

type FaqIconKey =
  | 'coffee'
  | 'breadSlice'
  | 'utensils'
  | 'calendarAlt'
  | 'pizzaSlice'
  | 'bullhorn'
  | 'mapMarkerAlt'
  | 'book'
  | 'trophy'
  | 'music'
  | 'glassCheers'
  | 'users'
  | 'bus'
  | 'questionCircle'
  | 'wrench'
  | 'clock'
  | 'shieldAlt'
  | 'exclamationTriangle';

interface FaqEditableItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqEditableSection {
  id: string;
  iconKey: FaqIconKey;
  title: string;
  faqs: FaqEditableItem[];
}

interface FaqEditableDocument {
  title: string;
  sections: FaqEditableSection[];
  updatedAt?: string;
}

const FAQ_ICON_OPTIONS = [
  { key: 'coffee', label: 'Café', icon: FaCoffee },
  { key: 'breadSlice', label: 'Pain', icon: FaBreadSlice },
  { key: 'utensils', label: 'Ustensiles', icon: FaUtensils },
  { key: 'calendarAlt', label: 'Calendrier', icon: FaCalendarAlt },
  { key: 'pizzaSlice', label: 'Pizza', icon: FaPizzaSlice },
  { key: 'bullhorn', label: 'Haut-parleur', icon: FaBullhorn },
  { key: 'mapMarkerAlt', label: 'Carte', icon: FaMapMarkerAlt },
  { key: 'book', label: 'Livre', icon: FaBook },
  { key: 'trophy', label: 'Trophée', icon: FaTrophy },
  { key: 'music', label: 'Musique', icon: FaMusic },
  { key: 'glassCheers', label: 'Cheers', icon: FaGlassCheers },
  { key: 'users', label: 'Utilisateurs', icon: FaUsers },
  { key: 'bus', label: 'Bus', icon: FaBus },
  { key: 'questionCircle', label: 'Question', icon: FaQuestionCircle },
  { key: 'wrench', label: 'Clé', icon: FaWrench },
  { key: 'clock', label: 'Horloge', icon: FaClock },
  { key: 'shieldAlt', label: 'Sécurité', icon: FaShieldAlt },
  { key: 'exclamationTriangle', label: 'Attention', icon: FaExclamationTriangle },
] as const;

const iconComponentToKey = new Map<React.ElementType, FaqIconKey>(
  FAQ_ICON_OPTIONS.map((opt) => [opt.icon, opt.key] as const)
);

const getIconKeyFromReactNode = (icon: React.ReactNode): FaqIconKey => {
  if (React.isValidElement(icon)) {
    const iconType = icon.type as React.ElementType;
    const mappedKey = iconComponentToKey.get(iconType);
    if (mappedKey) return mappedKey;
  }
  return 'questionCircle';
};

// FAQ Data
const faqData: { [key: string]: { title: string; sections: SectionFAQ[] } } = {
  restauration: {
    title: 'RESTAURATION',
    sections: [
      {
        icon: <FaCoffee />,
        title: "Infos P'tit dej",
        faqs: [
          { question: "Où se trouve le petit-déjeuner ?", answer: "• Au restaurant / salle prévue de ton hôtel.\n• Lieu indiqué sur ton planning ou à la réception." },
          { question: "À quelle heure est servi le petit-déjeuner ?", answer: "• Horaires affichés à la réception (souvent 7h–9h30).\n• Vérifie le panneau ou l’app la veille." },
          { question: "Puis-je prendre un petit-déjeuner supplémentaire si j'ai faim ?", answer: "• Un seul petit-déjeuner inclus par nuitée.\n• Supplément possible sur place (tarif à la réception)." },
          { question: "Y a-t-il des options végétariennes ?", answer: "• Oui, options végétariennes au buffet.\n• Signale tout régime particulier à l’inscription." },
          { question: "Y a-t-il des options sans lactose ou sans gluten ?", answer: "• Demandes possibles ; signale à l’avance à l’organisation.\n• Buffet avec étiquetage quand disponible." },
        ]
      },
      {
        icon: <FaBreadSlice />,
        title: "Infos Déjeuner",
        faqs: [
          { question: "Où sont servis les déjeuners ?", answer: "• Sur les sites sportifs ou lieux indiqués au programme.\n• Vérifie le lieu du jour dans l’app / planning." },
          { question: "Quels sont les horaires du déjeuner ?", answer: "• Créneau indiqué dans le planning (souvent 12h–14h).\n• Respecte la plage pour ne pas manquer les matchs." },
          { question: "Puis-je prendre un déjeuner supplémentaire si j'ai faim ?", answer: "• Un déjeuner inclus par jour.\n• Supplément payant sur place si proposé." },
          { question: "Combien de temps faut-il prévoir pour le déjeuner ?", answer: "• Environ 30–45 min.\n• Prévois un peu plus si file d’attente." },
          { question: "Y a-t-il des options végétariennes ?", answer: "• Oui, choix végétarien au stand déjeuner.\n• Indique tes besoins à l’inscription si besoin." },
          { question: "Y a-t-il des options sans lactose ou sans gluten ?", answer: "• Sur demande ; signale à l’organisation en amont.\n• Étiquetage ou point dédié selon le lieu." },
        ]
      },
      {
        icon: <FaUtensils />,
        title: "Infos Dîner",
        faqs: [
          { question: "Qui a acces au repas du soir ?", answer: "• Participants inscrits au CARTEL avec bracelet.\n• Inclus selon la formule (vérifie ton inscription)." },
          { question: "Où se déroulent les dîners ?", answer: "• Restaurants partenaires indiqués dans le planning.\n• Lieu et adresse dans l’app la veille ou le jour J." },
          { question: "À quelle heure commence le service ?", answer: "• Horaire indiqué sur le planning dîner (ex. 19h30–20h).\n• Présente-toi dans la plage indiquée." },
          { question: "Le menu est-il fixe ou au choix ?", answer: "• Souvent menu du jour ou choix limité selon le restaurant.\n• Options végétariennes/végétaliennes sur demande en amont." },
          { question: "Y a-t-il des options végétaliennes ?", answer: "• Oui si signalé à l’avance à l’organisation.\n• Demande au serveur sur place si pas indiqué." },
          { question: "Y a-t-il des options sans lactose ou sans gluten ?", answer: "• Sur demande ; signale à l’inscription ou à l’accueil.\n• Restaurants prévenus pour les repas groupés." },
        ]
      },
      {
        icon: <FaCalendarAlt />,
        title: "Planning Dîner",
        faqs: [
          { question: "Que faire si je suis en retard au dîner ?", answer: "• Préviens l’organisation ou le responsable de table si possible.\n• Les places sont tenues jusqu’à la fin du créneau indiqué." },
          { question: "Puis-je annuler ma participation à un dîner ?", answer: "• Oui, signale à l’avance à l’accueil CARTEL.\n• Annulation sans frais selon les délais indiqués." },
          { question: "Les restaurants sont-ils accessibles en fauteuil roulant ?", answer: "• Oui pour les lieux prévus au programme ; vérifie les infos dans l’app.\n• Contacte l’organisation pour un trajet adapté si besoin." },
        ]
      },
      {
        icon: <FaPizzaSlice />,
        title: "Alternatives",
        faqs: [
          { question: "Des snacks sont-ils disponibles ?", answer: "• Oui, stands snacks sur les sites (payant).\n• Tu peux aussi apporter de quoi grignoter." },
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
          { question: "Quand a lieu la cérémonie d'ouverture ?", answer: "• Date et heure dans le planning (généralement jeudi soir).\n• Lieu indiqué dans l’app et par mail." },
          { question: "La présence est-elle obligatoire ?", answer: "• Fortement recommandée pour l’esprit CARTEL.\n• Pas de sanction si absence justifiée." },
          { question: "Que se passe-t-il pendant la cérémonie ?", answer: "• Défilé des équipes, discours, animations.\n• Présentation du programme du week-end." },
          { question: "Combien de temps dure la cérémonie ?", answer: "• Environ 1h à 1h30.\n• Prévois d’arriver 15 min avant." },
          { question: "Comment se rendre à la cérémonie d'ouverture ?", answer: "• Navettes prévues ; horaires dans l’app.\n• Adresse et plan dans la rubrique Infos." },
          { question: "Puis-je prendre des photos pendant la cérémonie ?", answer: "• Oui, photos et vidéos autorisées pour usage perso.\n• Pas de flash si demandé par l’organisation." },
          { question: "Que faire si je ne peux pas assister à la cérémonie ?", answer: "• Préviens ton responsable d’équipe ou l’accueil.\n• Tu peux rejoindre les matchs le lendemain selon le planning." },
          { question: "Comment rentrer dans le stade si je suis en retard ?", answer: "• Entrée possible jusqu’à la fin de la cérémonie.\n• Présente ton bracelet et suis les indications du personnel." },
        ]
      },
      {
        icon: <FaMapMarkerAlt />,
        title: "Terrains de sport",
        faqs: [
          { question: "Comment accéder aux terrains ?", answer: "• Accès avec bracelet + respect du planning de ton sport.\n• Plan des sites dans l’app ; suivez les fléchages sur place." },
          { question: "Y a-t-il des vestiaires ?", answer: "• Oui sur les sites prévus ; horaires d’ouverture affichés.\n• Prévois cadenas pour ton casier." },
          { question: "Où puis-je m'échauffer ?", answer: "• Zones dédiées à côté des terrains ou en périphérie.\n• Demande au staff si tu ne trouves pas." },
          { question: "Y a-t-il un service de premiers secours sur les terrains ?", answer: "• Oui, poste secours sur chaque site.\n• Numéro d’urgence affiché ; signale tout incident." },
          { question: "Que faire en cas de mauvais temps ?", answer: "• Programme adapté (report, salle, etc.) ; infos dans l’app et par annonce.\n• Reste sur le site jusqu’à consigne." },
          { question: "Les terrains sont-ils accessibles en fauteuil roulant ?", answer: "• Oui pour les sites indiqués ; infos dans la rubrique accessibilité.\n• Contacte l’organisation pour un parcours adapté." },
          { question: "Y a-t-il des casiers pour ranger mes affaires ?", answer: "• Casiers ou consignes selon le site ; apporte un cadenas.\n• L’organisation décline toute responsabilité en cas de vol." },
          { question: "Puis-je utiliser les douches après mon match ?", answer: "• Oui, douches dans les vestiaires.\n• Respecte les horaires d’ouverture du site." },
        ]
      },
      {
        icon: <FaBook />,
        title: "Règles et fair-play",
        faqs: [
          { question: "Quelles règles s'appliquent ?", answer: "• Règles officielles de chaque fédération + charte CARTEL.\n• Rappel au début des compétitions ; consultable dans l’app." },
          { question: "Que faire en cas de litige ?", answer: "• S’adresser à l’arbitre ou au responsable de terrain.\n• En cas de désaccord : point accueil CARTEL ou responsable sport." },
          { question: "Y a-t-il des sanctions ?", answer: "• Oui : avertissement, exclusion de match ou du week-end selon gravité.\n• Comportement fair-play exigé ; charte signée à l’inscription." },
          { question: "Comment signaler un comportement inapproprié ?", answer: "• Point accueil ou responsable de site.\n• Signalement anonyme possible via l’app ou mail dédié." },
        ]
      },
      {
        icon: <FaTrophy />,
        title: "Podiums et résultats",
        faqs: [
          { question: "Quand ont lieu les remises de médailles ?", answer: "• À la fin des finales de chaque sport ; horaires dans le planning.\n• Podium sur le site du match ou lieu communiqué." },
          { question: "Y a-t-il un classement général ?", answer: "• Oui, classement par sport et éventuellement inter-écoles.\n• Résultats et classements dans l’app." },
          { question: "Où a lieu la cérémonie finale ?", answer: "• Lieu et heure dans le planning (souvent samedi soir ou dimanche).\n• Annonce dans l’app et sur les sites." },
          { question: "Comment connaître les résultats en temps réel ?", answer: "• Dans l’app CARTEL : onglet Résultats / Planning.\n• Affichage aussi sur les sites sportifs." },
          { question: "Y a-t-il des récompenses pour les seconds et troisièmes ?", answer: "• Oui : médailles 2e et 3e selon les sports.\n• Détails dans le règlement de chaque discipline." },
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
          { question: "Que se passe-t-il jeudi soir ?", answer: "• Show Pompoms : spectacle et ambiance.\n• Lieu et horaire dans le planning soirées." },
          { question: "Où a lieu la soirée ?", answer: "• Lieu indiqué dans l’app (rubrique Soirées / planning).\n• Adresse et plan disponibles ; navettes si prévues." },
          { question: "Jusqu'à quelle heure ?", answer: "• Horaire de fin affiché dans le planning (ex. 1h–2h).\n• Navettes de retour jusqu’à l’heure indiquée." },
          { question: "L'entrée est-elle gratuite avec le bracelet ?", answer: "• Oui, entrée incluse avec le bracelet CARTEL.\n• Sans bracelet : entrée payante si autorisée." },
          { question: "Y a-t-il un âge minimum pour participer ?", answer: "• Réservé aux participants inscrits au CARTEL (majeurs ou selon règlement).\n• Pièce d’identité possible à l’entrée." },
          { question: "Y a-t-il un vestiaire pour déposer mes affaires ?", answer: "• Vestiaire ou consigne selon le lieu ; payant ou gratuit selon l’organisateur.\n• Pas d’objets de valeur ; sous ta responsabilité." },
        ]
      },
      {
        icon: <FaGlassCheers />,
        title: "Vendredi soir - Showcase",
        faqs: [
          { question: "Quel est le programme du vendredi ?", answer: "• Showcase : concerts / animations.\n• Détails et horaires dans l’app, rubrique Soirées." },
          { question: "Comment rentrer à l'hôtel ?", answer: "• Navettes prévues ; horaires dans l’app.\n• Sinon taxi / VTC ; numéros utiles dans la rubrique Infos." },
          { question: "À quelle heure commence la soirée ?", answer: "• Horaire de début dans le planning (ex. 21h–22h).\n• Présente-toi avec ton bracelet." },
        ]
      },
      {
        icon: <FaUsers />,
        title: "Samedi soir - DJ Contest",
        faqs: [
          { question: "Jusqu'à quelle heure dure la soirée ?", answer: "• Horaire de fin dans le planning (souvent 2h–4h).\n• Navettes jusqu’à la fin ou horaire indiqué." },
          { question: "Puis-je inviter quelqu'un qui n'est pas participant ?", answer: "• Non : soirées réservées aux participants CARTEL avec bracelet.\n• Exception possible selon organisation ; renseigne-toi à l’accueil." },
          { question: "Y a-t-il un photographe professionnel ?", answer: "• Oui selon les soirées ; photos publiées sur les réseaux ou l’app.\n• Tu peux prendre tes propres photos (usage perso)." },
        ]
      },
      {
        icon: <FaBus />,
        title: "Infos navettes",
        faqs: [
          { question: "Comment fonctionnent les navettes ?", answer: "• Navettes gratuites avec bracelet entre sites, hôtels et soirées.\n• Horaires et lignes dans l’app, rubrique Navettes / Infos." },
          { question: "Faut-il réserver sa place ?", answer: "• Non en général ; montée selon les places disponibles.\n• Pour certains trajets (soirée) une résa peut être demandée ; vérifie l’app." },
          { question: "Et si je rate la dernière navette ?", answer: "• Taxi / VTC à tes frais ; numéros dans l’app.\n• Reste en groupe et préviens ton responsable si possible." },
          { question: "Quelle est la fréquence des navettes ?", answer: "• Fréquence indiquée dans l’app (ex. toutes les 30 min).\n• Plus fréquent en soirée selon affluence." },
          { question: "Où sont les arrêts de navettes ?", answer: "• Carte et liste des arrêts dans l’app (Infos / Navettes).\n• Fléchage sur place vers les arrêts." },
          { question: "Les navettes sont-elles accessibles aux personnes à mobilité réduite ?", answer: "• Oui pour les navettes prévues ; contacte l’organisation pour les horaires adaptés.\n• Indique tes besoins à l’inscription." },
          { question: "Que faire si une navette est en retard ?", answer: "• Attendre à l’arrêt ; prochain passage selon la fréquence.\n• En cas de gros retard : contacter l’accueil CARTEL (numéro dans l’app)." },
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
          { question: "Où sont situés les hôtels ?", answer: "• Liste et adresses dans l’app (Infos / Hôtels).\n• Carte et plan disponibles ; navettes depuis/vers les sites." },
          { question: "Comment connaître mon hôtel ?", answer: "• Indiqué sur ta confirmation d’inscription et dans l’app.\n• Réception CARTEL à l’arrivée si besoin." },
          { question: "Puis-je changer d'hôtel ?", answer: "• Sous réserve de disponibilité ; contacte l’organisation.\n• Changement possible avant l’événement selon conditions." },
          { question: "Y a-t-il un parking ?", answer: "• Selon l’hôtel ; infos dans la fiche de ton hôtel dans l’app.\n• Parkings payants possibles ; renseigne-toi à la réception." },
          { question: "Quelle est la distance entre l'hôtel et les sites sportifs ?", answer: "• Variable selon l’hôtel ; indiqué dans l’app.\n• Navettes prévues pour les trajets principaux." },
          { question: "Y a-t-il des transports en commun à proximité ?", answer: "• Oui selon l’hôtel ; infos dans la fiche hôtel.\n• Lignes et arrêts dans l’app ou à la réception." },
          { question: "Puis-je réserver une chambre supplémentaire pour un invité ?", answer: "• Oui selon disponibilité ; contacte l’organisation ou l’hôtel.\n• Tarif et conditions à demander." },
          { question: "Les hôtels sont-ils accessibles en transport en commun depuis la gare ?", answer: "• Oui pour les hôtels partenaires ; trajet indiqué dans l’app.\n• Navettes possibles à l’arrivée ; vérifie le planning." },
        ]
      },
      {
        icon: <FaClock />,
        title: "Horaires de réception",
        faqs: [
          { question: "À quelle heure puis-je faire le check-in ?", answer: "• À partir de 14h–15h en général ; horaire exact sur ta confirmation.\n• Consulte la fiche de ton hôtel dans l’app." },
          { question: "Jusqu'à quelle heure le check-out ?", answer: "• Souvent 11h–12h ; horaire sur ta confirmation et à la réception.\n• Retarde possible contre supplément selon l’hôtel." },
          { question: "La réception est-elle ouverte 24h/24 ?", answer: "• Selon l’hôtel ; indiqué dans la fiche hôtel.\n• Arrivée tardive : préviens l’hôtel à l’avance." },
          { question: "Puis-je récupérer ma clé en avance ?", answer: "• Si la chambre est prête ; à la discrétion de l’hôtel.\n• Sinon dépôt de bagages possible." },
          { question: "Puis-je laisser mes bagages après le check-out ?", answer: "• Oui, consigne bagages ou dépôt à la réception (souvent gratuit).\n• Récupère-les avant l’heure indiquée." },
          { question: "Y a-t-il une consigne à bagages ?", answer: "• Oui dans la plupart des hôtels ; gratuit ou payant selon l’établissement.\n• Demande à la réception." },
          { question: "Puis-je faire un check-in anticipé si j'arrive tôt ?", answer: "• Si chambre dispo ; sinon dépôt bagages.\n• Supplément possible pour entrée avant l’heure." },
          { question: "Que faire si j'arrive après minuit ?", answer: "• Préviens l’hôtel à l’avance (numéro sur ta confirmation).\n• Réception 24h ou instructions laissées à ton attention." },
        ]
      },
      {
        icon: <FaWrench />,
        title: "Services disponibles",
        faqs: [
          { question: "Le Wi-Fi est-il gratuit ?", answer: "• Oui dans les hôtels partenaires CARTEL.\n• Code à la réception ou dans la chambre." },
          { question: "Y a-t-il une salle de sport ?", answer: "• Selon l’hôtel ; infos dans la fiche hôtel dans l’app.\n• Pas garanti pour tous les établissements." },
          { question: "Puis-je faire laver mon linge ?", answer: "• Service payant selon l’hôtel ; demande à la réception.\n• Laveries à proximité possibles." },
          { question: "Le petit-déjeuner est-il en chambre ?", answer: "• Non en général ; buffet en salle.\n• Room service possible contre supplément selon l’hôtel." },
          { question: "Y a-t-il la climatisation dans les chambres ?", answer: "• Selon l’hôtel ; indiqué dans la fiche.\n• Ventilation ou clim selon la saison." },
          { question: "Puis-je amener mon animal de compagnie ?", answer: "• Non en règle générale pour les hôtels CARTEL.\n• Exception possible ; contacte l’organisation et l’hôtel." },
          { question: "Y a-t-il un minibar dans la chambre ?", answer: "• Selon l’hôtel ; consulte la fiche.\n• Consommation payante." },
          { question: "Le petit-déjeuner est-il servi en buffet ou à la carte ?", answer: "• Souvent buffet ; détail dans la fiche hôtel.\n• Horaires affichés à la réception." },
        ]
      },
      {
        icon: <FaQuestionCircle />,
        title: "Contact et assistance",
        faqs: [
          { question: "Qui contacter en cas de problème ?", answer: "• Réception de l’hôtel pour le séjour.\n• Accueil CARTEL pour l’événement (numéro dans l’app)." },
          { question: "J'ai oublié quelque chose, que faire ?", answer: "• Contacter l’hôtel rapidement ; objets trouvés conservés un temps.\n• Frais d’envoi possibles si envoi postal." },
          { question: "Comment signaler un problème dans ma chambre ?", answer: "• Réception ou numéro interne ; signalement immédiat.\n• Changement de chambre si nécessaire." },
          { question: "Puis-je inviter quelqu'un dans ma chambre ?", answer: "• Visiteurs autorisés selon règlement de l’hôtel.\n• Nuit supplémentaire : réservation et tarif à la réception." },
          { question: "Y a-t-il un numéro d'urgence 24h/24 ?", answer: "• Oui : réception hôtel + numéro accueil CARTEL dans l’app.\n• 15 (SAMU), 17 (police), 18 (pompiers)." },
          { question: "Comment réserver une chambre supplémentaire ?", answer: "• Via l’organisation CARTEL ou directement à l’hôtel.\n• Selon disponibilité ; tarif sur demande." },
          { question: "Que faire en cas d'urgence médicale ?", answer: "• Appeler le 15 ; prévenir la réception et l’accueil CARTEL.\n• Poste secours sur les sites sportifs ; numéros dans l’app." },
          { question: "Puis-je payer ma chambre avec une carte bancaire ?", answer: "• Oui ; CB acceptée dans les hôtels partenaires.\n• Espèces selon l’établissement ; renseigne-toi à la réception." },
        ]
      },
    ]
  }
};

// Composant Accordéon Section (cliquable pour afficher les questions)
const SectionAccordion: React.FC<{
  section: FaqEditableSection;
  isOpen: boolean;
  onToggle: () => void;
  openQuestionId: string | null;
  onToggleQuestion: (questionId: string) => void;
}> = ({ section, isOpen, onToggle, openQuestionId, onToggleQuestion }) => {
  return (
    <div className={`faq-section ${isOpen ? 'open' : ''}`}>
      <div className="faq-section-header" onClick={onToggle}>
        <div className="faq-section-left">
          <span className="faq-section-icon">{renderFaqSectionIcon(section.iconKey)}</span>
          <h2>{section.title}</h2>
        </div>
        <span className="faq-section-chevron">
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </div>

      {isOpen && (
        <div className="faq-list">
          {section.faqs.map((faq) => {
            const isQuestionOpen = openQuestionId === faq.id;
            return (
              <div key={faq.id} className="faq-item">
                <div className="faq-question" onClick={() => onToggleQuestion(faq.id)}>
                  <span>{faq.question}</span>
                  {isQuestionOpen ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {isQuestionOpen && <div className="faq-answer">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Composant Page FAQ (lecture + états contrôlés)
const FAQView: React.FC<{ doc: FaqEditableDocument }> = ({ doc }) => {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  useEffect(() => {
    setOpenSectionId(null);
    setOpenQuestionId(null);
  }, [doc.title, doc.sections]);

  const handleToggleSection = (sectionId: string) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
    setOpenQuestionId(null);
  };

  const handleToggleQuestion = (questionId: string) => {
    setOpenQuestionId((prev) => (prev === questionId ? null : questionId));
  };

  return (
    <div className="page-content scrollable info-section-page">
      <div className="info-section-header">
        <h1>{doc.title}</h1>
      </div>
      <div className="faq-container">
        {doc.sections.map((section) => (
          <SectionAccordion
            key={section.id}
            section={section}
            isOpen={openSectionId === section.id}
            onToggle={() => handleToggleSection(section.id)}
            openQuestionId={openQuestionId}
            onToggleQuestion={handleToggleQuestion}
          />
        ))}
      </div>
    </div>
  );
};

const FAQAdminEditor: React.FC<{ sectionKey: string; doc: FaqEditableDocument }> = ({ sectionKey, doc }) => {
  const [draftDoc, setDraftDoc] = useState<FaqEditableDocument>(() => doc);
  const [isSaving, setIsSaving] = useState(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const autoSaveDebounceMs = 700;

  useEffect(() => {
    setDraftDoc(doc);
    dirtyRef.current = false;
    setIsSaving(false);
  }, [doc]);

  const createId = (prefix: string) => `${sectionKey}-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const updateSection = (sectionId: string, updater: (section: FaqEditableSection) => FaqEditableSection) => {
    dirtyRef.current = true;
    setDraftDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? updater(s) : s)),
    }));
  };

  const updateFaq = (
    sectionId: string,
    faqId: string,
    updater: (faq: FaqEditableItem) => FaqEditableItem
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      faqs: section.faqs.map((faq) => (faq.id === faqId ? updater(faq) : faq)),
    }));
  };

  const handleAddSection = () => {
    dirtyRef.current = true;
    setDraftDoc((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: createId('section'),
          iconKey: 'questionCircle',
          title: 'Nouvelle section',
          faqs: [
            {
              id: createId('q'),
              question: 'Nouvelle question',
              answer: '',
            },
          ],
        },
      ],
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    dirtyRef.current = true;
    setDraftDoc((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    dirtyRef.current = true;
    setDraftDoc((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return prev;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.sections.length) return prev;
      const sections = [...prev.sections];
      const tmp = sections[idx];
      sections[idx] = sections[nextIdx];
      sections[nextIdx] = tmp;
      return { ...prev, sections };
    });
  };

  const handleAddQuestion = (sectionId: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      faqs: [
        ...section.faqs,
        {
          id: createId('q'),
          question: 'Nouvelle question',
          answer: '',
        },
      ],
    }));
  };

  const handleRemoveQuestion = (sectionId: string, faqId: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      faqs: section.faqs.filter((f) => f.id !== faqId),
    }));
  };

  const handleMoveQuestion = (sectionId: string, faqId: string, direction: 'up' | 'down') => {
    updateSection(sectionId, (section) => {
      const idx = section.faqs.findIndex((f) => f.id === faqId);
      if (idx < 0) return section;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= section.faqs.length) return section;
      const faqs = [...section.faqs];
      const tmp = faqs[idx];
      faqs[idx] = faqs[nextIdx];
      faqs[nextIdx] = tmp;
      return { ...section, faqs };
    });
  };

  useEffect(() => {
    if (!dirtyRef.current) return;
    if (!draftDoc) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const payload: FaqEditableDocument = {
          ...draftDoc,
          updatedAt: new Date().toISOString(),
        };

        await set(ref(database, `faqOverrides/${sectionKey}`), payload);
        dirtyRef.current = false;
      } catch (error) {
        logger.error('[InfoSection] Erreur sauvegarde FAQ:', error);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDebounceMs);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [draftDoc, sectionKey]);

  return (
    <div className="page-content scrollable info-section-page">
      <div className="info-section-header">
        <h1>{draftDoc.title}</h1>
      </div>

      <div className="faq-admin-editor">
        {draftDoc.sections.map((section, sectionIndex) => (
          <div key={section.id} className="faq-admin-section">
            <div className="faq-admin-faq-item-header faq-admin-section-order-row">
              <span className="faq-admin-faq-item-order-label">Position</span>
              <div className="faq-admin-faq-item-order">
                <button
                  type="button"
                  className="faq-admin-btn faq-admin-btn-icon"
                  onClick={() => handleMoveSection(section.id, 'up')}
                  disabled={isSaving || sectionIndex === 0}
                  aria-label="Monter la section"
                >
                  <FaArrowUp aria-hidden />
                </button>
                <button
                  type="button"
                  className="faq-admin-btn faq-admin-btn-icon"
                  onClick={() => handleMoveSection(section.id, 'down')}
                  disabled={isSaving || sectionIndex === draftDoc.sections.length - 1}
                  aria-label="Descendre la section"
                >
                  <FaArrowDown aria-hidden />
                </button>
              </div>
            </div>

            <div className="faq-admin-section-header">
              <label className="faq-admin-field">
                <span className="faq-admin-label">Icône</span>
                <select
                  className="faq-admin-select"
                  value={section.iconKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    if (!FAQ_ICON_KEY_SET.has(nextKey as FaqIconKey)) return;
                    updateSection(section.id, (s) => ({ ...s, iconKey: nextKey as FaqIconKey }));
                  }}
                  disabled={isSaving}
                >
                  {FAQ_ICON_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="faq-admin-field">
                <span className="faq-admin-label">Titre</span>
                <input
                  className="faq-admin-input"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, (s) => ({ ...s, title: e.target.value }))}
                  disabled={isSaving}
                />
              </label>

              <button
                type="button"
                className="faq-admin-btn faq-admin-btn-danger"
                onClick={() => handleRemoveSection(section.id)}
                disabled={isSaving || draftDoc.sections.length <= 1}
              >
                Supprimer section
              </button>
            </div>

            <div className="faq-admin-faq-list">
              {section.faqs.map((faq, faqIndex) => (
                <div key={faq.id} className="faq-admin-faq-item">
                  <div className="faq-admin-faq-item-header">
                    <span className="faq-admin-faq-item-order-label">Position</span>
                    <div className="faq-admin-faq-item-order">
                      <button
                        type="button"
                        className="faq-admin-btn faq-admin-btn-icon"
                        onClick={() => handleMoveQuestion(section.id, faq.id, 'up')}
                        disabled={isSaving || faqIndex === 0}
                        aria-label="Monter la question"
                      >
                        <FaArrowUp aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="faq-admin-btn faq-admin-btn-icon"
                        onClick={() => handleMoveQuestion(section.id, faq.id, 'down')}
                        disabled={isSaving || faqIndex === section.faqs.length - 1}
                        aria-label="Descendre la question"
                      >
                        <FaArrowDown aria-hidden />
                      </button>
                    </div>
                  </div>
                  <label className="faq-admin-field">
                    <span className="faq-admin-label">Question</span>
                    <input
                      className="faq-admin-input"
                      value={faq.question}
                      onChange={(e) =>
                        updateFaq(section.id, faq.id, (f) => ({ ...f, question: e.target.value }))
                      }
                      disabled={isSaving}
                    />
                  </label>

                  <label className="faq-admin-field">
                    <span className="faq-admin-label">Réponse</span>
                    <textarea
                      className="faq-admin-textarea"
                      value={faq.answer}
                      rows={5}
                      onChange={(e) =>
                        updateFaq(section.id, faq.id, (f) => ({ ...f, answer: e.target.value }))
                      }
                      disabled={isSaving}
                    />
                  </label>

                  <button
                    type="button"
                    className="faq-admin-btn faq-admin-btn-danger"
                    onClick={() => handleRemoveQuestion(section.id, faq.id)}
                    disabled={isSaving || section.faqs.length <= 1}
                  >
                    Supprimer question
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="faq-admin-btn faq-admin-btn-secondary"
                onClick={() => handleAddQuestion(section.id)}
                disabled={isSaving}
              >
                + Ajouter une question
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="faq-admin-btn faq-admin-btn-secondary faq-admin-add-section"
          onClick={handleAddSection}
          disabled={isSaving}
        >
          + Ajouter une section
        </button>
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
      { question: "Le bracelet est-il obligatoire ?", answer: "• Oui : accès aux sites, repas et soirées.\n• Sans bracelet tu ne peux pas participer aux activités CARTEL." },
      { question: "Que permet le bracelet ?", answer: "• Accès terrains, repas, soirées, navettes.\n• Identification participant ; à porter en permanence." },
      { question: "Puis-je l'enlever ?", answer: "• Déconseillé : risque de perte et d’accès refusé.\n• Retrait possible pour douche/sport ; garde-le en sécurité." },
      { question: "Comment activer mon bracelet dans l'app ?", answer: "• Dans l’app : rubrique Bracelet / Mon bracelet ; scan ou code.\n• Suis les instructions à l’écran." },
      { question: "Le bracelet permet-il de payer des achats ?", answer: "• Non en général ; paiement CB/espèces sur les stands.\n• Selon l’édition : fonction paiement indiquée dans l’app." },
      { question: "Puis-je accéder aux zones VIP avec mon bracelet ?", answer: "• Selon ta formule (VIP ou non) ; type indiqué sur le bracelet.\n• Zones réservées selon les couleurs/types." },
      { question: "Y a-t-il une photo sur le bracelet ?", answer: "• Non en règle générale ; identification par code/QR.\n• Pièce d’identité peut être demandée en complément." },
      { question: "Mes données personnelles sont-elles stockées dans le bracelet ?", answer: "• Données limitées (ID, type) ; pas de données sensibles.\n• Politique de confidentialité dans l’app." },
    ]
  },
  {
    icon: <FaShieldAlt />,
    title: "Règles et sécurité",
    faqs: [
      { question: "Puis-je prêter mon bracelet ?", answer: "• Non : usage strictement personnel ; interdit par le règlement.\n• En cas de prêt : risque de confiscation et sanction." },
      { question: "Mon bracelet est abîmé, que faire ?", answer: "• Va à un point accueil CARTEL avec pièce d’identité.\n• Remplacement si défectueux ; abîmé par toi : conditions à l’accueil." },
      { question: "Le bracelet est-il waterproof ?", answer: "• Oui pour douche et pluie ; évite piscine et immersion prolongée.\n• En cas de doute : retire-le pour la douche." },
      { question: "Que faire si mon bracelet ne fonctionne plus ?", answer: "• Point accueil avec pièce d’identité ; remplacement si défaillance.\n• Vérifie qu’il n’est pas endommagé (coup, eau)." },
      { question: "Le bracelet est-il résistant aux chocs ?", answer: "• Résistant à l’usage normal ; évite chocs violents.\n• En cas de casse : remplacement à l’accueil." },
      { question: "Puis-je personnaliser mon bracelet ?", answer: "• Non : pas de modification (couleur = type d’accès).\n• Tu peux le porter au poignet que tu préfères." },
    ]
  },
  {
    icon: <FaExclamationTriangle />,
    title: "Perte ou vol",
    faqs: [
      { question: "J'ai perdu mon bracelet, que faire ?", answer: "• Signale immédiatement à un point accueil ; ancien bracelet désactivé.\n• Nouveau bracelet contre justificatif et éventuel frais." },
      { question: "Mon bracelet a été volé", answer: "• Signale à l’accueil et éventuellement aux organisateurs sur site.\n• Ancien bracelet désactivé ; remplacement selon conditions." },
      { question: "Le remplacement est-il payant ?", answer: "• Souvent oui (frais de remplacement) ; montant à l’accueil.\n• Premier remplacement gratuit selon organisation." },
      { question: "Combien de temps faut-il pour obtenir un nouveau bracelet ?", answer: "• Sur place à l’accueil : immédiat après vérification.\n• Pièce d’identité obligatoire." },
      { question: "Dois-je apporter une preuve d'identité pour le remplacement ?", answer: "• Oui : pièce d’identité obligatoire.\n• Inscription vérifiée ; ancien bracelet invalidé." },
      { question: "Que faire si je trouve mon bracelet après l'avoir signalé perdu ?", answer: "• Ne plus l’utiliser : il est désactivé.\n• Remets-le à l’accueil ; garde le nouveau bracelet." },
    ]
  },
  {
    icon: <FaWrench />,
    title: "Contact et assistance",
    faqs: [
      { question: "Où se trouvent les points accueil ?", answer: "• Lieux indiqués dans l’app (Infos / Accueil).\n• Sur les sites sportifs et à l’entrée des soirées." },
      { question: "Les points accueil sont-ils toujours ouverts ?", answer: "• Horaires dans l’app ; ouverts pendant les créneaux d’activités.\n• Numéro d’urgence disponible en dehors des créneaux." },
      { question: "Puis-je contacter l'organisation par téléphone ?", answer: "• Oui : numéro dans l’app (rubrique Infos / Contact).\n• Réponse selon disponibilité ; SMS possible." },
      { question: "Y a-t-il un email de contact pour l'organisation ?", answer: "• Oui ; adresse dans l’app (Infos / Contact).\n• Réponse sous 24–48h selon affluence." },
      { question: "Puis-je contacter l'organisation via l'application ?", answer: "• Oui : rubrique Contact / Aide dans l’app.\n• Formulaire ou lien email selon l’app." },
      { question: "Y a-t-il un chat en direct disponible ?", answer: "• Selon l’édition ; indiqué dans l’app (Contact / Chat).\n• Sinon : téléphone ou email." },
    ]
  },
];

function buildDefaultFaqDoc(sectionKey: string): FaqEditableDocument | null {
  if (sectionKey === 'bracelet') {
    return {
      title: 'INFOS BRACELET',
      sections: braceletFaqData.map((section, sectionIndex) => ({
        id: `${sectionKey}-section-${sectionIndex}`,
        iconKey: getIconKeyFromReactNode(section.icon),
        title: section.title,
        faqs: section.faqs.map((faq, faqIndex) => ({
          id: `${sectionKey}-section-${sectionIndex}-q-${faqIndex}`,
          question: faq.question,
          answer: faq.answer,
        })),
      })),
    };
  }

  const data = faqData[sectionKey];
  if (!data) return null;

  return {
    title: data.title,
    sections: data.sections.map((section, sectionIndex) => ({
      id: `${sectionKey}-section-${sectionIndex}`,
      iconKey: getIconKeyFromReactNode(section.icon),
      title: section.title,
      faqs: section.faqs.map((faq, faqIndex) => ({
        id: `${sectionKey}-section-${sectionIndex}-q-${faqIndex}`,
        question: faq.question,
        answer: faq.answer,
      })),
    })),
  };
}

const FAQ_ICON_KEY_SET = new Set<FaqIconKey>(FAQ_ICON_OPTIONS.map((opt) => opt.key));

const iconKeyToNode = FAQ_ICON_OPTIONS.reduce((acc, opt) => {
  acc[opt.key] = React.createElement(opt.icon);
  return acc;
}, {} as Record<FaqIconKey, React.ReactNode>);

function renderFaqSectionIcon(iconKey: FaqIconKey): React.ReactNode {
  return iconKeyToNode[iconKey] ?? iconKeyToNode.questionCircle;
}

function coerceFaqEditableDocument(
  raw: unknown,
  fallbackDoc: FaqEditableDocument,
  sectionKey: string
): FaqEditableDocument | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawObj = raw as Record<string, unknown>;
  const sectionsRaw = rawObj.sections;
  if (!Array.isArray(sectionsRaw)) return null;

  const title = typeof rawObj.title === 'string' ? rawObj.title : fallbackDoc.title;

  const sections: FaqEditableSection[] = sectionsRaw.map((secRaw, secIndex) => {
    if (!secRaw || typeof secRaw !== 'object') {
      return fallbackDoc.sections[secIndex] ?? {
        id: `${sectionKey}-section-${secIndex}`,
        iconKey: 'questionCircle',
        title: '',
        faqs: [],
      };
    }

    const secObj = secRaw as Record<string, unknown>;

    const rawIconKey = secObj.iconKey;
    const iconKey =
      typeof rawIconKey === 'string' && FAQ_ICON_KEY_SET.has(rawIconKey as FaqIconKey)
        ? (rawIconKey as FaqIconKey)
        : fallbackDoc.sections[secIndex]?.iconKey ?? 'questionCircle';

    const id = typeof secObj.id === 'string' ? secObj.id : `${sectionKey}-section-${secIndex}`;
    const sectionTitle =
      typeof secObj.title === 'string' ? secObj.title : fallbackDoc.sections[secIndex]?.title ?? '';

    const faqsRaw = secObj.faqs;
    const faqs: FaqEditableItem[] = Array.isArray(faqsRaw)
      ? faqsRaw.map((faqRaw, faqIndex) => {
          if (!faqRaw || typeof faqRaw !== 'object') {
            return {
              id: `${sectionKey}-section-${secIndex}-q-${faqIndex}`,
              question: '',
              answer: '',
            };
          }

          const faqObj = faqRaw as Record<string, unknown>;
          const qId =
            typeof faqObj.id === 'string'
              ? faqObj.id
              : `${sectionKey}-section-${secIndex}-q-${faqIndex}`;

          const question = typeof faqObj.question === 'string' ? faqObj.question : '';
          const answer = typeof faqObj.answer === 'string' ? faqObj.answer : '';

          return { id: qId, question, answer };
        })
      : [];

    return { id, iconKey, title: sectionTitle, faqs };
  });

  const updatedAt = typeof rawObj.updatedAt === 'string' ? rawObj.updatedAt : undefined;
  return { title, sections, updatedAt };
}

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

  const sectionKey = sectionName || '';

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    if (adminStatus !== isAdmin) {
      logger.log('InfoSection - Sync admin:', adminStatus);
    }
  }, [isAdmin, isEditing]);

  const defaultDoc = useMemo(() => buildDefaultFaqDoc(sectionKey), [sectionKey]);
  const [overrideDoc, setOverrideDoc] = useState<FaqEditableDocument | null>(null);

  useEffect(() => {
    if (!defaultDoc) {
      setOverrideDoc(null);
      return;
    }

    const overridesRef = ref(database, `faqOverrides/${sectionKey}`);
    const unsubscribe = onValue(overridesRef, (snapshot) => {
      const raw = snapshot.val();
      if (!raw) {
        setOverrideDoc(null);
        return;
      }

      const coerced = coerceFaqEditableDocument(raw, defaultDoc, sectionKey);
      setOverrideDoc(coerced);
    });

    return () => unsubscribe();
  }, [defaultDoc, sectionKey]);

  if (sectionName === 'parie') return <Parie />;

  // Sections FAQ (lecture)
  if (defaultDoc) {
    const docToRender = overrideDoc ?? defaultDoc;
    if (isAdmin && isEditing) {
      return <FAQAdminEditor sectionKey={sectionKey} doc={docToRender} />;
    }

    return <FAQView doc={docToRender} />;
  }

  // Sections avec liste simple
  const section = sectionsData[sectionName || ''];

  const handleItemClick = (item: { text: string }) => {
    if (sectionName === 'legal') {
      if (item.text === 'Politique de Confidentialité') {
        navigate('/privacy-policy?from=legal');
      } else if (item.text === 'Conditions Générales d\'Utilisation') {
        navigate('/terms-of-service?from=legal');
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
