/**
 * @fileoverview Layout principal de l'application avec header, navigation et chat intégré
 * 
 * Ce composant fournit :
 * - Structure générale de l'application (header + contenu + navigation)
 * - Chat en temps réel intégré avec gestion des messages
 * - Header avec logo conditionnel et boutons de navigation
 * - Navigation inférieure avec onglets
 * - Gestion des états de l'application (admin, panels, etc.)
 * - Intégration Firebase pour le chat temps réel
 * 
 * Nécessaire car :
 * - Définit la structure commune à toutes les pages
 * - Centralise la logique du chat intégré
 * - Gère la navigation entre les sections
 * - Assure la cohérence de l'interface utilisateur
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import './Layout.css';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { database } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import Header from './Header';
import { useAppPanels } from '../AppPanelsContext';
import { useApp } from '../AppContext';
import VSSForm from './VSSForm';
import EmergencyPopup from './EmergencyPopup';
import HSECharterPopup from './HSECharterPopup';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import './ModalForm.css';

const sportEmojis = {
  'Football': '⚽',
  'Basketball': '🏀',
  'Handball': '🤾',
  'Rugby': '🏉',
  'Ultimate': '🥏',
  'Natation': '🏊',
  'Badminton': '🏸',
  'Tennis': '🎾',
  'Cross': '👟',
  'Volleyball': '🏐',
  'Ping-pong': '🏓',
  'Echecs': '♟️',
  'Athlétisme': '🏃‍♂️',
  'Spikeball': '⚡️',
  'Pétanque': '🍹',
  'Escalade': '🧗‍♂️',
} as const;

const eventTypeEmojis: { [key: string]: string } = {
  'DJ contest': '🎧',
  'Show Pompom': '🎀',
  'Showcase': '🎤',
};

const indicationTypeEmojis: { [key: string]: string } = {
  'Soins': '🚑',
  'Poubelle': '🗑️',
  'Dejeuner': '🥐',
  'Bar': '🍺',
  'Accès handicapé': '👨‍🦽',
  'Safe place': '🗣️',
  'Toilette': '🚾',
  'Zone fumeur': '🚬',
  'Vestiaire': '🧥',
  'Stand de prévention': '⚠️',
  'Stand entreprise': '👩‍💼'
};

interface Message {
  id?: string;
  content: string;
  sender: string;
  timestamp: number;
  isAdmin: boolean;
}

interface Match {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  type: 'match';
  teams: string;
  sport: string;
  time: string;
  endTime?: string;
  result?: string;
  venueId: string;
  emoji: string;
}

interface Venue {
  id?: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
  matches?: Match[];
}

const Layout: React.FC = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  
  // État pour le popup HSE - vérifie si la charte a déjà été acceptée
  const [showHSECharter, setShowHSECharter] = useState(() => {
    const hasAccepted = localStorage.getItem('hseCharterAccepted');
    return hasAccepted !== 'true';
  });

  // Fonction pour gérer l'acceptation de la charte HSE et activer le bracelet
  const handleHSEAccept = async (braceletNumber: string) => {
    localStorage.setItem('hseCharterAccepted', 'true');
    setShowHSECharter(false);
    
    // Activer le bracelet dans Firebase
    try {
      const getDeviceId = (): string => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
      };

      const trimmedNumber = braceletNumber.trim();
      const deviceId = getDeviceId();
      
      const participantRef = ref(database, `participants/${trimmedNumber}`);
      const snapshot = await get(participantRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.deviceId && data.deviceId !== deviceId) {
          // Le bracelet est déjà utilisé sur un autre appareil
          console.warn('Ce bracelet est déjà utilisé sur un autre appareil');
        }
        
        // Utiliser update pour préserver les champs existants
        await update(participantRef, {
          deviceId: deviceId,
          activatedAt: Date.now()
        });
        
        // Stocker le numéro de bracelet dans localStorage
        localStorage.setItem('userBraceletNumber', trimmedNumber);
      } else {
        console.warn('Numéro de bracelet invalide');
      }
    } catch (err) {
      console.error('Erreur activation bracelet:', err);
    }
  };
  
  const { isEditing, setIsEditing, activeTab, setActiveTab, showEmergency, setShowEmergency, showChat, setShowChat, chatOriginTab, showSettings, setShowSettings, showVSSForm, setShowVSSForm, showAdminModal, setShowAdminModal, showEditMatchModal, setShowEditMatchModal, showEditVenueModal, setShowEditVenueModal, showEditResultModal, setShowEditResultModal, showEditDescriptionModal, setShowEditDescriptionModal, showEditHotelDescriptionModal, setShowEditHotelDescriptionModal, showEditRestaurantDescriptionModal, setShowEditRestaurantDescriptionModal, showPlaceTypeModal, setShowPlaceTypeModal, selectedPlaceType, setSelectedPlaceType, isAddingPlace, setIsAddingPlace, isPlacingMarker, setIsPlacingMarker, // États du formulaire de lieu
    newVenueName, setNewVenueName, newVenueDescription, setNewVenueDescription, newVenueAddress, setNewVenueAddress,     selectedSport, setSelectedSport, selectedEmoji, setSelectedEmoji, selectedEventType, setSelectedEventType, selectedIndicationType, setSelectedIndicationType, tempMarker, setTempMarker, editingVenue, setEditingVenue, // États du formulaire de match
    editingMatch, setEditingMatch, newMatch, setNewMatch, selectedEvent, setSelectedEvent, selectedPartyForMap, setSelectedPartyForMap } = useAppPanels();
  const { isAdmin, setIsAdmin, user, setUser, venues, messages, getAllDelegations, hasGenderMatches } = useApp();
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Annuler l'ajout de message si isEditing passe à false
  useEffect(() => {
    if (!isEditing && showAddMessage) {
      setShowAddMessage(false);
      setNewMessage('');
    }
  }, [isEditing, showAddMessage]);

  const [newMessageSender, setNewMessageSender] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Fermer le formulaire de message si on navigue vers une autre page
  useEffect(() => {
    if (showAddMessage && !showChat) {
      setShowAddMessage(false);
      setNewMessage('');
      setNewMessageSender('');
    }
  }, [location.pathname, showChat, showAddMessage]);

    // Synchroniser activeTab avec location.pathname
    useEffect(() => {
      if (location.pathname === '/home') {
        setActiveTab('home');
      } else if (location.pathname === '/info') {
        setActiveTab('info');
      } else if (location.pathname.startsWith('/info/')) {
        // Garder 'info' pour les sous-routes
        setActiveTab('info');
      }
    }, [location.pathname]);

  // Ajoute la classe de la plateforme au body et configure la barre de statut
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    document.body.classList.add(platform);
    
    // Configuration de la barre de statut et de navigation pour Android
    if (platform === 'android') {
      const setupStatusBar = async () => {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#00000000' }); // Transparent
          await StatusBar.setOverlaysWebView({ overlay: true });
        } catch (error) {
          console.log('StatusBar plugin not available:', error);
        }
      };
      setupStatusBar();
    }
  }, []);

  // Pas de gestion JavaScript du clavier - utilisation CSS pure uniquement

  // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
  useEffect(() => {
    if (!localStorage.getItem('lastSeenChatTimestamp')) {
      const now = Date.now();
      localStorage.setItem('lastSeenChatTimestamp', String(now));
    }
  }, []);

  // Fonction utilitaire pour mettre à jour le timestamp de dernière lecture
  // Cette fonction est appelée à chaque fois que le chat est fermé pour s'assurer
  // que le macaron de notification n'apparaît que quand il y a de nouveaux messages
  const updateLastSeenTimestamp = () => {
    if (messages.length > 0) {
      // Maintenant que les messages sont triés par ordre décroissant, le premier est le plus récent
      const mostRecentMsg = messages[0];
      const newTimestamp = mostRecentMsg.timestamp;
      localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
    }
  };

  // Gestion du bouton physique retour des téléphones
  useEffect(() => {
    let isHandlingPopState = false;

    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingPopState) return;
      isHandlingPopState = true;

      // Utiliser window.location pour avoir la vraie URL actuelle du navigateur
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      // Fermer EventDetails en premier si ouvert
      if (selectedEvent) {
        setSelectedEvent(null);
        window.history.replaceState({ path: currentPath, eventDetails: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si RestaurantDescriptionModal est ouvert, le fermer
      if (showEditRestaurantDescriptionModal) {
        setShowEditRestaurantDescriptionModal(false);
        window.history.replaceState({ path: currentPath, restaurantDescription: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si HotelDescriptionModal est ouvert, le fermer
      if (showEditHotelDescriptionModal) {
        setShowEditHotelDescriptionModal(false);
        window.history.replaceState({ path: currentPath, hotelDescription: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si DescriptionModal est ouvert, le fermer
      if (showEditDescriptionModal) {
        setShowEditDescriptionModal(false);
        window.history.replaceState({ path: currentPath, description: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si ResultModal est ouvert, le fermer
      if (showEditResultModal) {
        setShowEditResultModal(false);
        window.history.replaceState({ path: currentPath, result: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si VenueModal est ouvert, le fermer
      if (showEditVenueModal) {
        setShowEditVenueModal(false);
        window.history.replaceState({ path: currentPath, venue: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si MatchModal est ouvert, le fermer
      if (showEditMatchModal) {
        setShowEditMatchModal(false);
        window.history.replaceState({ path: currentPath, match: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si AddPlaceModal est ouvert, le fermer
      if (isAddingPlace) {
        setIsAddingPlace(false);
        window.history.replaceState({ path: currentPath, addPlace: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si AdminModal est ouvert, le fermer
      if (showAdminModal) {
        setShowAdminModal(false);
        window.history.replaceState({ path: currentPath, admin: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si VSSForm est ouvert, le fermer
      if (showVSSForm) {
        setShowVSSForm(false);
        window.history.replaceState({ path: currentPath, vssForm: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si SettingsMenu est ouvert, le fermer
      if (showSettings) {
        setShowSettings(false);
        window.history.replaceState({ path: currentPath, settings: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si EmergencyPopup est ouvert, le fermer
      if (showEmergency) {
        setShowEmergency(false);
        window.history.replaceState({ path: currentPath, emergency: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      if (showChat) {
        updateLastSeenTimestamp();
        setShowAddMessage(false);
        setNewMessage('');
        setNewMessageSender('');
        setShowChat(false);
        window.history.replaceState({ path: currentPath, chat: false }, '', currentPath);
        isHandlingPopState = false;
        return;
      }

      // Si on est sur le calendrier, revenir à l'onglet d'origine
      if (activeTab === 'calendar') {
        const calendarOriginTab = localStorage.getItem('calendarOriginTab') as TabType | null;
        if (calendarOriginTab === 'events' || calendarOriginTab === 'map') {
          setActiveTab(calendarOriginTab);
          localStorage.removeItem('calendarOriginTab'); // Nettoyer après utilisation
        } else {
          // Fallback: revenir à map par défaut
          setActiveTab('map');
        }
        isHandlingPopState = false;
        return;
      }

      // Si on est sur la page party-map, revenir à la carte principale
      if (activeTab === 'party-map') {
        setSelectedPartyForMap(null);
        setActiveTab('map');
        isHandlingPopState = false;
        return;
      }

      // Si on est sur /planning-files, naviguer vers la page d'origine
      if (currentPath === '/planning-files') {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');
        
        if (fromParam === 'info-section') {
          navigate('/info/planning');
        } else {
          navigate('/info');
        }
        isHandlingPopState = false;
        return;
      }

      // Pour les navigations de routes /info et sous-routes, laisser React Router gérer
      if (currentPath.startsWith('/info')) {
        isHandlingPopState = false;
        return;
      }

      // Pour les autres cas, appeler handleBack() pour gérer la navigation
      handleBack();
      isHandlingPopState = false;
    };

    // Écouter les événements de navigation (bouton retour physique)
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showChat, showEmergency, showVSSForm, showSettings, showAdminModal, showEditMatchModal, showEditVenueModal, showEditResultModal, showEditDescriptionModal, showEditHotelDescriptionModal, showEditRestaurantDescriptionModal, isAddingPlace, location.pathname, activeTab, navigate, messages, selectedEvent]);    
  useEffect(() => {
    if (location.pathname === '/home' || location.pathname === '/info') {
      // Vérifier si c'est la première visite pour éviter les replaceState répétés
      const hasReplaced = sessionStorage.getItem(`historyReplaced_${location.pathname}`);
      if (!hasReplaced) {
        window.history.replaceState({ path: location.pathname }, '', location.pathname);
        sessionStorage.setItem(`historyReplaced_${location.pathname}`, 'true');
      }
    }
  }, [location.pathname]);
  
  // Effet pour mettre à jour le timestamp de dernière lecture lors de la navigation
  useEffect(() => {
    // Si le chat était ouvert et qu'on navigue vers une autre page, mettre à jour le timestamp
    if (showChat && messages.length > 0) {
      updateLastSeenTimestamp();
    }
  }, [location.pathname, showChat, messages]);

  // État pour gérer les traductions des messages
  const [translatedMessages, setTranslatedMessages] = useState<{[key: string]: string}>({});

  // Fonction pour traduire un message en anglais
  const translateMessage = async (messageId: string, text: string) => {
    try {
      // Si le message est déjà traduit, on revient au français
      if (translatedMessages[messageId]) {
        setTranslatedMessages(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
        return;
      }

      // Utilisation de l'API de traduction gratuite
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      const data = await response.json();
      
      if (data && data[0]) {
        // Concaténer tous les segments traduits pour obtenir le texte complet
        const translatedText = data[0]
          .filter((segment: any) => segment && segment[0])
          .map((segment: any[]) => segment[0])
          .join('');
        // Stocker la traduction dans l'état
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: translatedText
        }));
      } else {
        alert('Erreur lors de la traduction');
      }
    } catch (error) {
      console.error('Erreur de traduction:', error);
      alert('Erreur lors de la traduction. Veuillez réessayer.');
    }
  };

  // Calcul du nombre de messages non lus
  const lastSeenChatTimestamp = Number(localStorage.getItem('lastSeenChatTimestamp') || 0);
  const unreadCount = messages.filter(m => m.timestamp > lastSeenChatTimestamp).length;

  const handleAdminClick = async () => {
    // Cette fonction est maintenant utilisée uniquement pour la déconnexion
    // La connexion se fait directement dans le Header via le modal
  };

  const handleEditClick = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Si on désactive le mode édition, on réinitialise tous les états liés à l'édition
      setIsAddingPlace(false);
      setEditingVenue({ id: null, venue: null });
      setTempMarker(null);
      setIsPlacingMarker(false);
      setEditingMatch({ venueId: null, match: null });
      setNewMatch({
        date: '',
        teams: '',
        description: '',
        endTime: '',
        result: ''
      });
    }
  };

  const handleAddVenue = async () => {
    if (!isAdmin) return;

    let coordinates: [number, number] | null = null;
    
    if (tempMarker) {
      coordinates = tempMarker;
    } else if (newVenueAddress) {
      // Géocodage de l'adresse
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newVenueAddress)}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          coordinates = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        } else {
          // Si le géocodage échoue, utiliser des coordonnées par défaut (centre de Nancy)
          coordinates = [48.6921, 6.1844];
        }
      } catch (error) {
        console.error('Erreur de géocodage:', error);
        // En cas d'erreur, utiliser des coordonnées par défaut
        coordinates = [48.6921, 6.1844];
      }
    } else {
      // Si aucune adresse ni marqueur, utiliser des coordonnées par défaut
      coordinates = [48.6921, 6.1844]; // Coordonnées par défaut (Nancy)
    }

    const venuesRef = ref(database, 'venues');
    const newVenueRef = push(venuesRef);
    const newVenue: any = {
      name: newVenueName || '',
      position: coordinates,
      description: newVenueDescription || '',
      address: newVenueAddress || `${coordinates[0]}, ${coordinates[1]}`,
      matches: [],
      sport: selectedSport || 'Football',
      date: '',
      latitude: coordinates[0],
      longitude: coordinates[1],
      emoji: selectedEmoji || '⚽',
      type: 'venue',
      placeType: selectedPlaceType || 'sport'
    };
    
    // Ajouter les champs spécifiques selon le type
    if (selectedPlaceType === 'soirée') {
      newVenue.eventType = selectedEventType;
    }
    if (selectedPlaceType === 'indication') {
      newVenue.indicationType = selectedIndicationType;
    }

    try {
      await set(newVenueRef, newVenue);
      
      setNewVenueName('');
      setNewVenueDescription('');
      setNewVenueAddress('');
      setSelectedSport('Football');
      setSelectedEventType('DJ contest');
      setSelectedIndicationType('Soins');
      setTempMarker(null);
      setIsPlacingMarker(false);
      setIsAddingPlace(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du lieu:', error);
      alert('Une erreur est survenue lors de l\'ajout du lieu.');
    }
  };

  const handleUpdateVenue = async () => {
    if (!isAdmin || !editingVenue.id) return;

    const coordinates: [number, number] = tempMarker || [editingVenue.venue?.latitude || 0, editingVenue.venue?.longitude || 0];
    
    const venueRef = ref(database, `venues/${editingVenue.id}`);
    // Utiliser directement les valeurs des champs (même si vides) pour permettre la suppression
    const updatedVenue: any = {
      ...editingVenue.venue,
      name: newVenueName,
      description: newVenueDescription,
      address: newVenueAddress || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
      sport: selectedSport || editingVenue.venue?.sport || 'Football',
      latitude: coordinates[0],
      longitude: coordinates[1],
      position: coordinates,
      emoji: selectedEmoji || editingVenue.venue?.emoji || '⚽',
      placeType: selectedPlaceType || editingVenue.venue?.placeType || 'sport'
    };
    
    // Ajouter les champs spécifiques selon le type
    if (selectedPlaceType === 'soirée') {
      updatedVenue.eventType = selectedEventType;
    } else {
      // Supprimer eventType si ce n'est plus une soirée
      delete updatedVenue.eventType;
    }
    
    if (selectedPlaceType === 'indication') {
      updatedVenue.indicationType = selectedIndicationType;
    } else {
      // Supprimer indicationType si ce n'est plus une indication
      delete updatedVenue.indicationType;
    }

    try {
      await set(venueRef, updatedVenue);
      
      setNewVenueName('');
      setNewVenueDescription('');
      setNewVenueAddress('');
      setSelectedSport('Football');
      setSelectedEventType('DJ contest');
      setSelectedIndicationType('Soins');
      setTempMarker(null);
      setEditingVenue({ id: null, venue: null });
      setIsAddingPlace(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lieu:', error);
      alert('Une erreur est survenue lors de la mise à jour du lieu.');
    }
  };

  const deleteVenue = async (id: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.')) {
      return;
    }

    const venueRef = ref(database, `venues/${id}`);
    await set(venueRef, null);
  };

  // Fonction pour ajouter un nouveau match
  const handleAddMatch = async (venueId: string) => {
    if (!isAdmin) return;

    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await get(venueRef);
      const venue = snapshot.val();
      if (!venue) return;

      // Extraire latitude/longitude de position si non définis
      const lat = venue.latitude ?? (venue.position ? venue.position[0] : 0);
      const lng = venue.longitude ?? (venue.position ? venue.position[1] : 0);

      const matchId = uuidv4();
      const match = {
        id: matchId,
        name: `${venue.name} - Match`,
        description: newMatch.description || '',
        date: newMatch.date || '',
        teams: newMatch.teams || '',
        endTime: newMatch.endTime || '',
        result: newMatch.result || ''
      };

      const updatedMatches = [...(venue.matches || []), match];
      
      await set(venueRef, {
        ...venue,
        matches: updatedMatches
      });

      // Réinitialiser le formulaire
      setNewMatch({
        date: '',
        teams: '',
        description: '',
        endTime: '',
        result: ''
      });
      setEditingMatch({ venueId: null, match: null });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du match:', error);
      alert('Une erreur est survenue lors de l\'ajout du match.');
    }
  };

  // Fonction pour mettre à jour un match
  const handleUpdateMatch = async (venueId: string, matchId: string, updatedData: Partial<Match>) => {
    if (!isAdmin) return;
    
    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await get(venueRef);
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.map((match: Match) =>
        match.id === matchId ? { ...match, ...updatedData } : match
      );
      
      await set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
      
      setEditingMatch({ venueId: null, match: null });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du match:', error);
      alert('Une erreur est survenue lors de la mise à jour du match.');
    }
  };

  // Fonction pour supprimer un match
  const deleteMatch = async (venueId: string, matchId: string) => {
    if (!isAdmin) return;

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.')) {
      return;
    }
    
    const venueRef = ref(database, `venues/${venueId}`);
    
    try {
      const snapshot = await get(venueRef);
      const venue = snapshot.val();
      if (!venue) return;

      const updatedMatches = venue.matches.filter((match: Match) => match.id !== matchId);
      
      await set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du match:', error);
      alert('Une erreur est survenue lors de la suppression du match.');
    }
  };

  // Fonction pour commencer l'édition d'un match
  const startEditingMatch = (venueId: string, match: Match | null) => {
    if (!isAdmin) return;

    setEditingMatch({ venueId, match });
    
    if (match) {
      setNewMatch({
        date: match.date,
        teams: match.teams,
        description: match.description,
        endTime: match.endTime,
        result: match.result
      });
    } else {
      setNewMatch({ date: '', teams: '', description: '', endTime: '', result: '' });
    }
  };

  // Fonction pour terminer l'édition d'un match
  const finishEditingMatch = () => {
    setEditingMatch({ venueId: null, match: null });
  };

  // Ajout d'un message dans Firebase
  const handleAddMessage = (msg: string, sender: string) => {
    const newMsgRef = push(ref(database, 'chatMessages'));
    set(newMsgRef, {
      content: msg,
      sender: sender,
      timestamp: Date.now(),
      isAdmin: true
    });

    // Notification locale (web)
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Nouveau message de l\'organisation', {
        body: msg,
        icon: '/favicon.png'
      });
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Nouveau message de l\'organisation', {
            body: msg,
            icon: '/favicon.png'
          });
        }
      });
    }
  };

  // Modification d'un message dans Firebase
  const handleEditMessage = (id: string, newContent: string, newSender: string) => {
    update(ref(database, `chatMessages/${id}`), { content: newContent, sender: newSender});
  };

  // Suppression d'un message dans Firebase
  const handleDeleteMessage = (id: string) => {
    remove(ref(database, `chatMessages/${id}`));
  };

  // Fonction pour fermer les panneaux locaux (chat, urgence, admin)
  const closeLayoutPanels = () => {
    // Mettre à jour le timestamp de dernière lecture avant de fermer le chat
    if (showChat) {
      updateLastSeenTimestamp();
      // Fermer le formulaire de message si on ferme le chat
      setShowAddMessage(false);
      setNewMessage('');
      setNewMessageSender('');
    }
    
    setShowChat(false);
    setShowEmergency(false);
    setShowAdmin(false);
  };

  const handleBack = () => {
    if (showChat) {

      // Mettre à jour le timestamp de dernière lecture avant de fermer le chat
      updateLastSeenTimestamp();
      // Fermer le formulaire de message si on ferme le chat
      setShowAddMessage(false);
      setNewMessage('');
      setNewMessageSender('');
      setShowChat(false);
      // Ne pas changer activeTab - rester sur la page actuelle
      return;
    }

    
    // Gestion de la navigation selon l'URL actuelle
    // Utiliser window.location pour avoir la vraie URL actuelle du navigateur
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    // Navigation spécifique selon les routes
    if (currentPath.startsWith('/info/')) {
      // Retour depuis InfoSection vers Info
      navigate('/info');
      return;
    }
    
    if (currentPath === '/planning-files') {
      // Vérifier s'il y a un paramètre indiquant la provenance
      const urlParams = new URLSearchParams(currentSearch);
      const fromParam = urlParams.get('from');
      
      if (fromParam === 'info-section') {
        // Retour vers la section Planning Files dans Info
        navigate('/info/planning');
      } else {
        // Retour par défaut vers Info
        navigate('/info');
      }
      return;
    }
    
    // Utiliser la même logique de navigation que dans App.tsx pour les autres cas
    switch (activeTab) {
      case 'events':
        setActiveTab('map');
        break;
      case 'calendar':
        // Revenir à l'onglet d'origine (map ou events)
        // Récupérer l'onglet d'origine depuis localStorage
        const calendarOriginTab = localStorage.getItem('calendarOriginTab') as TabType | null;
        if (calendarOriginTab === 'events' || calendarOriginTab === 'map') {
          setActiveTab(calendarOriginTab);
          localStorage.removeItem('calendarOriginTab'); // Nettoyer après utilisation
        } else {
          // Fallback: revenir à map par défaut
          setActiveTab('map');
        }
        break;
      case 'party-map':
        setSelectedPartyForMap(null);
        setActiveTab('map');
        break;
      case 'chat':
        // Géré au-dessus
        break;
      case 'home':
      case 'info':
        // Pas de retour possible depuis les pages principales
        return;
      default:
        setActiveTab('map');
    }
  };

  // Mise à jour du timestamp de dernière lecture lors de l'ouverture/fermeture du chat
  const handleChatToggle = () => {
    const wasChatOpen = showChat;
    setShowChat(!showChat);

    if (!wasChatOpen) {
      // Quand on OUVRE le chat, ajouter une entrée dans l'historique
      window.history.pushState({ 
        path: location.pathname, 
        chat: true 
      }, '', location.pathname);
    }
    
    // Fermer le formulaire de message si on ferme le chat
    if (wasChatOpen) {
      setShowAddMessage(false);
      setNewMessage('');
      setNewMessageSender('');
    }
    
    // Mettre à jour le timestamp de dernière lecture à l'ouverture ET à la fermeture
    updateLastSeenTimestamp();
  };



  return (
    <div className="layout">
      <Header
        onChat={handleChatToggle}
        onEmergency={() => {
          setShowEmergency(true);
          window.history.pushState({ path: location.pathname, emergency: true }, '', location.pathname);
        }}
        onAdmin={handleAdminClick}
        showChat={showChat}
        unreadCount={unreadCount}
        onBack={handleBack}
        onEditModeToggle={handleEditClick}
        isEditing={isEditing}
        isBackDisabled={(location.pathname === '/home' || (location.pathname === '/info' && !location.pathname.startsWith('/info/'))) && !showChat && activeTab !== 'events' && activeTab !== 'calendar' && activeTab !== 'party-map'}
        hideBackButton={(location.pathname === '/home' || location.pathname === '/map' || (location.pathname === '/info' && !location.pathname.startsWith('/info/'))) && !showChat && activeTab !== 'events' && activeTab !== 'calendar' && activeTab !== 'party-map'}
      />
      <main className="app-main">
        <Outlet />
      </main>
      {/* Footer supprimé - remplacé par un bouton dans Info.tsx */}
      <BottomNav closeLayoutPanels={closeLayoutPanels} />

      {/* Fenêtre modale pour le chat */}
      {showChat && (
        <div className={`chat-panel ${location.pathname === '/home' || location.pathname === '/info' || location.pathname.startsWith('/info/') || location.pathname === '/planning-files' ? 'home-info-chat' : ''}`}>
          <div className="chat-panel-header">
            <h3>Messages de l'orga</h3>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative'}}>
              {isAdmin && isEditing && (
                <button
                  className="add-message-button"
                  onClick={() => setShowAddMessage((v) => !v)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 20, 
                    width: 70, 
                    position: 'absolute',
                    top: '-0.5rem',
                    right: 0,
                    zIndex: 10
                  }}
                >
                  {showAddMessage ? 'Annuler' : 'Ajouter'}
                </button>
              )}
            </div>
          </div>
          {showAddMessage && (
                  <form
                    className="add-message-form"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '12px', 
                      padding: '1.5rem', 
                      alignItems: 'stretch',
                      background: 'var(--bg-color)', 
                      borderBottom: '1px solid var(--border-color)',
                      width: '100%',
                      maxWidth: '800px',
                      margin: '0 auto'
                    }}
                    onSubmit={e => {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        if (editingMessageId) {
                          // Si on édite un message existant
                          handleEditMessage(editingMessageId, newMessage, newMessageSender);
                        } else {
                          // Sinon, on ajoute un nouveau message
                          handleAddMessage(newMessage, newMessageSender);
                        }
                        setNewMessage('');
                        setNewMessageSender('');
                        setShowAddMessage(false);
                        setEditingMessageId(null);
                      }
                    }}
                  >
                    {isAdmin && (
                      <input
                        type="text"
                        value={newMessageSender}
                        onChange={e => setNewMessageSender(e.target.value)}
                        placeholder="Nom (ex: Organisation, Prénom...)"
                        style={{ 
                          width: 280,
                          height: 25,
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-color)',
                          position: 'fixed',
                          top: '7rem',
                          left: '1.5rem'
                        }}
                      />
                    )}
                    <textarea
                      value={newMessage}
                      onChange={e => {
                        setNewMessage(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder="Votre message..."
                      style={{
                        flex: 1,
                        height: '25px',
                        minHeight: '25px', 
                        maxHeight: '200px',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-color)',
                        resize: 'none',
                        overflow: 'hidden',
                        marginTop: '2rem'
                      }}
                      autoFocus
                    />
                    <button 
                      type="submit" 
                      style={{ 
                        background: 'none',
                        border: 'none', 
                        cursor: 'pointer',
                        padding: 0,
                        position: 'fixed',
                        top: '7rem',
                        fontSize: '22px',
                        right: '1.5rem'
                      }}
                    >
                      ➡️
                    </button>
                  </form>
                )}
          <div className="chat-container">
            {messages.map((message, index) => (
              <div key={message.id || index} className={`chat-message ${message.isAdmin ? 'admin' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div className="chat-message-header" style={{ justifyContent: 'space-between' }}>
                  <span>{message.sender}</span>
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <div className="chat-message-content" style={{ textAlign: 'left' }}>
                  {translatedMessages[message.id || `msg-${index}`] || message.content}
                </div>
                {/* Bouton de traduction en bas à droite */}
                <button
                  className="translate-button"
                  onClick={() => translateMessage(message.id || `msg-${index}`, message.content)}
                  title={translatedMessages[message.id || `msg-${index}`] ? "Revenir au français" : "Traduire en anglais"}
                >
                  {translatedMessages[message.id || `msg-${index}`] ? "Original" : "🌐 Translate"}
                </button>
                                 {isAdmin && isEditing && (
                   <div className="chat-admin-buttons">
                     <button
                       className="edit-message-button"
                       title="Modifier"
                       onClick={() => {
                         setShowAddMessage(true);
                         setNewMessage(message.content);
                         setNewMessageSender(message.sender);
                         setEditingMessageId(message.id || null);
                       }}
                     >
                       ✏️
                     </button>
                     <button
                       className="delete-message-button"
                       title="Supprimer"
                       onClick={() => {
                         if (window.confirm('Supprimer ce message ?') && message.id) {
                           handleDeleteMessage(message.id);
                         }
                       }}
                     >
                       🗑️
                     </button>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fenêtre modale pour les contacts d'urgence */}
      <EmergencyPopup 
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        onShowVSS={() => {
          setShowVSSForm(true);
          window.history.pushState({ path: location.pathname, vssForm: true }, '', location.pathname);
        }}
      />

      {/* Formulaire VSS */}
      {showVSSForm && (
        <VSSForm onClose={() => setShowVSSForm(false)} />
      )}

      {/* Popup Charte HSE - Affichée à la première ouverture */}
      {showHSECharter && (
        <HSECharterPopup onAccept={handleHSEAccept} />
      )}

      {/* Fenêtre modale pour l'administration */}
      {showAdmin && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <h3>Administration</h3>
          </div>
          <div className="chat-container">
            {user ? (
              isAdmin ? (
                <div>
                  <p>Bienvenue, administrateur !</p>
                  <button onClick={() => {
                    localStorage.removeItem('isAdmin');
                    setUser(null);
                    setIsAdmin(false);
                  }}>Se déconnecter</button>
                </div>
              ) : (
                <p>Vous n'avez pas les droits d'administrateur.</p>
              )
            ) : (
              <p>Veuillez vous connecter pour accéder à l'administration.</p>
            )}
          </div>
        </div>
      )}

      {/* Formulaire d'ajout/modification de match */}
      {editingMatch.venueId && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingMatch.match ? 'Modifier le match' : 'Ajouter un match'}</h2>
              <button className="close-button" onClick={finishEditingMatch}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="match-date">Date et heure de début</label>
                <input id="match-date" type="datetime-local" value={editingMatch.match ? editingMatch.match.date : newMatch.date} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, date: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, date: e.target.value }); } }} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-end-time">Heure de fin</label>
                <input id="match-end-time" type="datetime-local" value={editingMatch.match ? editingMatch.match.endTime : (newMatch.endTime || '')} min={editingMatch.match ? editingMatch.match.date : newMatch.date} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, endTime: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, endTime: e.target.value }); } }} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-teams">Équipes</label>
                <input id="match-teams" type="text" value={editingMatch.match ? editingMatch.match.teams : newMatch.teams} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, teams: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, teams: e.target.value }); } }} placeholder="Ex: Nancy vs Alès" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-description">Description</label>
                <input id="match-description" type="text" value={editingMatch.match ? editingMatch.match.description : newMatch.description} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, description: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, description: e.target.value }); } }} placeholder="Ex: Phase de poules M" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-result">Résultat</label>
                <input id="match-result" type="text" value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, result: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, result: e.target.value }); } }} placeholder="Ex: 2-1 (à saisir si disponible)" className="modal-form-input" />
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => { if (editingMatch.match) { handleUpdateMatch(editingMatch.venueId!, editingMatch.match.id, { date: editingMatch.match.date, endTime: editingMatch.match.endTime || '', teams: editingMatch.match.teams, description: editingMatch.match.description, result: editingMatch.match.result }); finishEditingMatch(); } else { handleAddMatch(editingMatch.venueId!); } }}>{editingMatch.match ? 'Mettre à jour' : 'Ajouter'}</button>
                <button className="modal-form-cancel" onClick={finishEditingMatch}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Sport */}
      {isAddingPlace && selectedPlaceType === 'sport' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un lieu de sport'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Gymnase Raymond Poincaré" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Pour rentrer il faut..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-sport">Sport</label>
                <select id="venue-sport" value={selectedSport} onChange={(e) => { setSelectedSport(e.target.value); setSelectedEmoji(sportEmojis[e.target.value as keyof typeof sportEmojis] || '⚽'); }} className="modal-form-input">
                  <option value="Football">Football ⚽</option>
                  <option value="Basketball">Basketball 🏀</option>
                  <option value="Handball">Handball 🤾</option>
                  <option value="Rugby">Rugby 🏉</option>
                  <option value="Ultimate">Ultimate 🥏</option>
                  <option value="Natation">Natation 🏊</option>
                  <option value="Badminton">Badminton 🏸</option>
                  <option value="Tennis">Tennis 🎾</option>
                  <option value="Cross">Cross 👟</option>
                  <option value="Volleyball">Volleyball 🏐</option>
                  <option value="Ping-pong">Ping-pong 🏓</option>
                  <option value="Echecs">Echecs ♟️</option>
                  <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
                  <option value="Spikeball">Spikeball ⚡️</option>
                  <option value="Pétanque">Pétanque 🍹</option>
                  <option value="Escalade">Escalade 🧗‍♂️</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Hôtel */}
      {isAddingPlace && selectedPlaceType === 'hotel' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un hôtel'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'hôtel</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Hôtel de Ville" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'hôtel..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Restaurant */}
      {isAddingPlace && selectedPlaceType === 'resto' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un restaurant'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du restaurant</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Le Bistrot" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le restaurant..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Défilé */}
      {isAddingPlace && selectedPlaceType === 'défilé' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un défilé'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Place Stanislas" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le défilé..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Soirée */}
      {isAddingPlace && selectedPlaceType === 'soirée' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter une soirée'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Salle des fêtes" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur la soirée..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-event">Event</label>
                <select id="venue-event" value={selectedEventType} onChange={(e) => { 
                  setSelectedEventType(e.target.value);
                  setSelectedEmoji(eventTypeEmojis[e.target.value as keyof typeof eventTypeEmojis] || '🎉');
                }} className="modal-form-input">
                  <option value="DJ contest">DJ contest 🎧</option>
                  <option value="Show Pompom">Show Pompom 🎀</option>
                  <option value="Showcase">Showcase 🎤</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Indication */}
      {isAddingPlace && selectedPlaceType === 'indication' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter une indication'}</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'indication</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Point de soins" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'indication..." className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-type">Type</label>
                <select id="venue-type" value={selectedIndicationType} onChange={(e) => { 
                  setSelectedIndicationType(e.target.value);
                  setSelectedEmoji(indicationTypeEmojis[e.target.value as keyof typeof indicationTypeEmojis] || '📍');
                }} className="modal-form-input">
                  <option value="Soins">Soins 🚑</option>
                  <option value="Poubelle">Poubelle 🗑️</option>
                  <option value="Dejeuner">Dejeuner 🥐</option>
                  <option value="Bar">Bar 🍺</option>
                  <option value="Accès handicapé">Accès handicapé 👨‍🦽</option>
                  <option value="Safe place">Safe place 🗣️</option>
                  <option value="Toilette">Toilette 🚾</option>
                  <option value="Zone fumeur">Zone fumeur 🚬</option>
                  <option value="Vestiaire">Vestiaire 🧥</option>
                  <option value="Stand de prévention">Stand de prévention ⚠️</option>
                  <option value="Stand entreprise">Stand entreprise 👩‍💼</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button
                  className="modal-form-submit"
                  onClick={() => (editingVenue.id ? handleUpdateVenue() : handleAddVenue())}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout; 