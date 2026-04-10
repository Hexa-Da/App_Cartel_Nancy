/**
 * @fileoverview Composant principal de l'application Cartel Nancy - Page Map
 * 
 * Ce composant gère :
 * - Carte interactive avec Leaflet et géolocalisation
 * - Affichage des événements et lieux avec marqueurs
 * - Chat en temps réel intégré avec Firebase
 * - Mode administrateur avec édition des messages
 * - Filtres d'événements par sport, lieu et délégation
 * - Gestion des événements passés avec styles différenciés
 * - Intégration Google Analytics pour le suivi
 * 
 * Nécessaire car :
 * - Composant central de l'application avec la carte
 * - Gère l'état complexe de l'application (événements, chat, admin)
 * - Interface principale pour la navigation et la consultation
 * - Centralise la logique métier de l'application
 */

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import './GlobalUtilities.css';
import './MapStyles.css';
import { ref, set } from 'firebase/database';
import { database } from './firebase';
import logger from './services/Logger';
import L from 'leaflet';
import ReactGA from 'react-ga4';
import CalendarPopup from './components/CalendarPopup';
import { Venue, Match } from './types';
import { Hotel, Restaurant, Party } from './types/venue';
import { Outlet, useLocation} from 'react-router-dom';
import { useNavigation, TabType } from './contexts/NavigationContext';
import { useModal } from './contexts/ModalContext';
import { useForm } from './contexts/FormContext';
import { useEditing } from './contexts/EditingContext';
import { useApp } from './AppContext';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import BusLines from './components/BusLines';
import './components/ModalForm.css';
import {
  onModalSingleLineInputEnterKey,
  onModalTextareaEnterKeyDone,
} from './utils/mobileFormKeyboard';
import PartyMap from './pages/PartyMap';
import ChatPanel from './components/ChatPanel';
import EventsTab from './components/EventsTab';
import EventDetails, { Event as EventDetailsEvent } from './components/EventDetails';
import { venueService } from './services/VenueService';
import { matchService } from './services/MatchService';
import { mapService } from './services/MapService';
import { editableDataService } from './services/EditableDataService';
import { isIssueDeSecoursIndication, ISSUE_DE_SECOURS_MARKER_PUBLIC_PATH } from './config/indicationMarkers';
import { LocationMarker } from './components/map/LocationMarker';
import { MapEvents } from './components/map/MapEvents';
import { ZoomListener } from './components/map/ZoomListener';
import { useMapState, mapStyles } from './hooks/useMapState';
import { useEventFilters } from './hooks/useEventFilters';
import { usePortraitOrientationLock } from './hooks/usePortraitOrientationLock';
import type { MapHistoryAction } from './types/mapHistory';
import { mapEventsTabRowToEventDetails } from './utils/convertEventToEventDetails';
import type { IEventsTabRow } from './utils/convertEventToEventDetails';

// Interfaces moved to src/types/venue.ts

type Place = Venue | Hotel | Party | Restaurant;

// Google Analytics initialization moved to src/config/analytics.ts and called in main.tsx


// Components moved to src/components/map/


function App() {
  const { activeTab, setActiveTab } = useNavigation();
  const { isEditing, setIsEditing } = useEditing();
  const {
    setShowEmergency,
    showChat,
    setShowChat,
    chatOriginTab,
    setChatOriginTab,
    showEditResultModal,
    setShowEditResultModal,
    showEditDescriptionModal,
    setShowEditDescriptionModal,
    showEditHotelDescriptionModal,
    setShowEditHotelDescriptionModal,
    showEditRestaurantDescriptionModal,
    setShowEditRestaurantDescriptionModal,
    showPlaceTypeModal,
    setShowPlaceTypeModal
  } = useModal();
  const {
    selectedPlaceType,
    setSelectedPlaceType,
    isAddingPlace,
    setIsAddingPlace,
    isPlacingMarker,
    setIsPlacingMarker,
    newVenueName,
    setNewVenueName,
    newVenueDescription,
    setNewVenueDescription,
    newVenueAddress,
    setNewVenueAddress,
    selectedSport,
    setSelectedSport,
    selectedEmoji,
    setSelectedEmoji,
    selectedEventType,
    setSelectedEventType,
    selectedIndicationType,
    setSelectedIndicationType,
    tempMarker,
    setTempMarker,
    editingVenue,
    setEditingVenue,
    editingMatch,
    setEditingMatch,
    newMatch,
    setNewMatch,
    setSelectedPartyForMap
  } = useForm();
  
  const location = useLocation();
  usePortraitOrientationLock();

  // Effet pour gérer le changement de route et forcer la recréation des marqueurs
  useEffect(() => {
    if (location.pathname === '/map' && activeTab === 'map') {
      setActiveTab('map');
      // Forcer la mise à jour de la carte
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
      // Forcer la recréation des marqueurs en déclenchant un re-render
      // On utilise un timeout pour s'assurer que la carte est bien prête
      setTimeout(() => {
        if (mapRef.current) {
          // Forcer la mise à jour en modifiant appAction
          // Cela déclenchera le useEffect principal qui recrée les marqueurs
          setAppAction(prev => prev + 1);
        }
      }, 200);
    }
  }, [location.pathname, activeTab]);

  // Effet pour gérer les changements de localisation
  useEffect(() => {
    const handleLocationChange = (e: StorageEvent) => {
      if (e.key === 'location' && location.pathname === '/map') {
        setActiveTab('map');
        // Forcer la mise à jour des marqueurs
        setAppAction(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleLocationChange);
    return () => window.removeEventListener('storage', handleLocationChange);
  }, [location.pathname]);

  const eventsButtonRef = useRef<HTMLButtonElement | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const { isAdmin, userRole, user, setUser, setUserRole, setIsAdmin, setIsRespoSport, venues, isLoadingVenues: isVenuesLoading } = useApp();
  // Refs pour accéder aux valeurs actuelles dans les handlers de popup
  const isAdminRef = useRef(isAdmin);
  const isEditingRef = useRef(isEditing);
  const userRoleRef = useRef(userRole);
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);
  
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  const [_, setIsCalendarOpen] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const { messages } = useApp();
  const [previousTab, setPreviousTab] = useState<TabType>('map');
  
  // Effet pour gérer le lieu sélectionné depuis la page Home
  useEffect(() => {
    const selectedVenueData = localStorage.getItem('selectedVenue');
    if (selectedVenueData && location.pathname === '/map') {
      try {
        const selectedVenue = JSON.parse(selectedVenueData);
        
        // Attendre que la carte et les marqueurs soient chargés
        const checkAndFlyTo = () => {
          if (mapRef.current && markersRef.current.length > 0) {
            // Centrer la carte sur le lieu sélectionné
            mapRef.current.flyTo([selectedVenue.latitude, selectedVenue.longitude], 18, {
              duration: 2.5
            });
            
            // Trouver et ouvrir le marqueur correspondant
            const marker = markersRef.current.find(m => {
              const latlng = m.getLatLng();
              return Math.abs(latlng.lat - selectedVenue.latitude) < 0.0001 && 
                     Math.abs(latlng.lng - selectedVenue.longitude) < 0.0001;
            });
            
            if (marker) {
              setTimeout(() => {
                marker.openPopup();
              }, 2500);
            }
            
            // Nettoyer le localStorage
            localStorage.removeItem('selectedVenue');
          } else {
            // Réessayer après un court délai si les marqueurs ne sont pas encore chargés
            setTimeout(checkAndFlyTo, 100);
          }
        };
        
        // Démarrer la vérification
        checkAndFlyTo();
        
      } catch (error) {
        logger.error('Erreur lors du parsing du lieu sélectionné:', error);
        localStorage.removeItem('selectedVenue');
      }
    }
  }, [location.pathname, venues]); // Ajouter venues comme dépendance pour s'assurer que les marqueurs sont chargés

  useEffect(() => {
    if (location.pathname === '/map') {
      setActiveTab('map');
    }
  }, [location.pathname]);
  
  const [_isLoading, setIsLoading] = useState(false);

  // Écouter la connexion admin réussie pour rafraîchir l'application
  useEffect(() => {
    const handleAdminLoginSuccess = () => {
      // Forcer la mise à jour des marqueurs et de l'interface
      if (updateMapMarkersRef.current) {
        triggerMarkerUpdate(updateMapMarkersRef.current);
      } else {
        // Si updateMapMarkers n'est pas encore défini, juste incrémenter appAction
        setAppAction(prev => prev + 1);
      }
      // Recharger les marqueurs d'hôtels et restaurants
      createHotelAndRestaurantMarkers();
    };

    const handleAdminLogout = () => {
      // Forcer la mise à jour des marqueurs et de l'interface
      if (updateMapMarkersRef.current) {
        triggerMarkerUpdate(updateMapMarkersRef.current);
      } else {
        // Si updateMapMarkers n'est pas encore défini, juste incrémenter appAction
        setAppAction(prev => prev + 1);
      }
      // Recharger les marqueurs d'hôtels et restaurants
      createHotelAndRestaurantMarkers();
    };

    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminLogout', handleAdminLogout);
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
      window.removeEventListener('adminLogout', handleAdminLogout);
    };
  }, []);


  // Fonction pour vérifier les droits d'administration avant d'exécuter une action
  const checkAdminRights = () => {
    if (!isAdmin) {
      alert('Cette action nécessite des droits d\'administrateur.');
      return false;
    }
    return true;
  };

  // Fonction pour vérifier si l'utilisateur peut éditer les matchs (admin ou respoSport)
  const canEditMatches = () => {
    return isAdmin || userRole === 'respoSport';
  };

  const [hotels, setHotels] = useState<Hotel[]>(() => {
    // Les descriptions seront chargées depuis Firebase via les listeners
    return [
      {
        id: '1',
        name: "Ibis Styles Nancy Sud Houdemont",
        position: [48.638767, 6.183726],
        description: '',
        address: "8 Allée De La Genelière, Rn 57, 54180 Houdemont",
        telephone: "03 83 56 10 25",
        type: 'hotel',
        date: '',
        latitude: 48.638751,
        longitude: 6.183532,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '2',
        name: "Nemea Home Suite Nancy Centre",
        position: [48.685828, 6.190530],
        description: '',
        address: "13 Rue Albert Lebrun, 54000 Nancy",
        telephone: "03 83 33 88 40",
        type: 'hotel',
        date: '',
        latitude: 48.685828,
        longitude: 6.190530,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '3',
        name: "Nemea Grand Coeur Nancy Centre",
        position: [48.685564, 6.181711],
        description: '',
        address: "12 Rue Charles III, 54000 Nancy",
        telephone: "03 83 27 02 66",
        type: 'hotel',
        date: '',
        latitude: 48.685564,
        longitude: 6.181711,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '4',
        name: "Hotel Ibis Nancy Brabois",
        position: [48.650700, 6.144908],
        description: '',
        address: "All. de Bourgogne, 54500 Vandœuvre-lès-Nancy",
        telephone: "03 83 44 55 77",
        type: 'hotel',
        date: '',
        latitude: 48.650700,
        longitude: 6.144908,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '5',
        name: "Hotel Residome Nancy",
        position: [48.694090, 6.195636],
        description: '',
        address: "9 Bd de la Mothe, 54000 Nancy",
        telephone: "03 83 19 55 60",
        type: 'hotel',
        date: '',
        latitude: 48.694090,
        longitude: 6.195636,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '6',
        name: "Ibis Budget Nancy Laxou",
        position: [48.695594, 6.124011],
        description: '',
        address: "1 Rue du Vair, 54520 Laxou",
        telephone: "08 92 68 04 82",
        type: 'hotel',
        date: '',
        latitude: 48.695594,
        longitude: 6.124011,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '7',
        name: "Hotel Revotel Nancy Centre",
        position: [48.689027, 6.170853],
        description: '',
        address: "41 Rue Raymond Poincaré, 54000 Nancy",
        telephone: "03 83 28 02 13",
        type: 'hotel',
        date: '',
        latitude: 48.689027,
        longitude: 6.170853,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '8',
        name: "Hotel Cerise Nancy",
        position: [48.699409, 6.144490],
        description: '',
        address: "1339 Av. Raymond Pinchard, 54100 Nancy",
        telephone: "03 83 98 03 33",
        type: 'hotel',
        date: '',
        latitude: 48.699409,
        longitude: 6.144490,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '9',
        name: "F1 Nancy Sud Houdemont",
        position: [48.639247, 6.183667],
        description: '',
        address: "Zac Houdemont, 4 All. de la Genelière, 54180 Heillecourt",
        telephone: "08 91 70 53 34",
        type: 'hotel',
        date: '',
        latitude: 48.639247,
        longitude: 6.183667,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '10',
        name: "F1 Nancy Nord Bouxières aux Dames",
        position: [48.758371, 6.152435],
        description: '',
        address: "4 Rue Charles Bourseul, 54136 Bouxières-aux-Dames",
        telephone: "08 91 70 53 33",
        type: 'hotel',
        date: '',
        latitude: 48.758371,
        longitude: 6.152435,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '11',
        name: "Greet Hôtel Nancy Sud",
        position: [48.636457, 6.180432],
        description: '',
        address: "2 rue des Egrez, ZAC des Egrez, 54180 Houdemont",
        telephone: "03 54 00 16 54",
        type: 'hotel',
        date: '',
        latitude: 48.636457,
        longitude: 6.180432,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '12',
        name: "Hôtel Ibis Styles Sud Houdemont",
        position: [48.637822, 6.183618],
        description: '',
        address: "8, allée de la Genellière, 54180 Houdemont",
        telephone: "03 83 56 10 25",
        type: 'hotel',
        date: '',
        latitude: 48.637822,
        longitude: 6.183618,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '13',
        name: "Hôtel Ibis Budget Centre",
        position: [48.692579, 6.195264],
        description: '',
        address: "4, allée du Chanoine Drioton, 54000 Nancy",
        telephone: "08 92 68 12 86",
        type: 'hotel',
        date: '',
        latitude: 48.692579,
        longitude: 6.195264,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '14',
        name: "Kosy coeur de ville",
        position: [48.690394, 6.174923],
        description: '',
        address: "Place Simone Veil nº2, 54000 Nancy",
        telephone: "03 83 28 93 45",
        type: 'hotel',
        date: '',
        latitude: 48.690394,
        longitude: 6.174923,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '15',
        name: "Hôtel In Hôtel",
        position: [48.743194, 6.151185],
        description: '',
        address: "5 Rue de Nerbevaux, 54390 Frouard",
        telephone: "03 83 23 49 02",
        type: 'hotel',
        date: '',
        latitude: 48.743194,
        longitude: 6.151185,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '16',
        name: "Campanile Nancy Gare",
        position: [48.691665, 6.175432],
        description: '',
        address: "12 rue de Serre, 54000 Nancy",
        telephone: "03 57 29 10 07",
        type: 'hotel',
        date: '',
        latitude: 48.691665,
        longitude: 6.175432,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
      {
        id: '17',
        name: "Kyriad Vandoeuvre",
        position: [48.650664, 6.146260],
        description: '',
        address: "1 avenue de Forêt de Haye, 54500 Vandoeuvre",
        telephone: "03 83 44 66 00",
        type: 'hotel',
        date: '',
        latitude: 48.650664,
        longitude: 6.146260,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      }
    ];
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    // Les descriptions seront chargées depuis Firebase via les listeners
    return [
      {
        id: 'salle-fetes-gentilly',
        name: "Salle des Fêtes de Gentilly",
        position: [48.698430, 6.139541],
        description: "Repas du Vendredi soir",
        address: "5001F Av. du Rhin, 54100 Nancy",
        type: 'restaurant',
        date: '',
        latitude: 48.698430, 
        longitude: 6.139541,
        emoji: '🍽️',
        sport: 'Restaurant', 
        mealType: 'soir',
        matches: []
      },
      {
        id: 'parc-expo-hall-a1',
        name: "Parc Expo Hall A1",
        position: [48.663070, 6.191429],
        description: "Repas du Jeudi et Vendredi soir",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        type: 'restaurant',
        date: '',
        latitude: 48.663070,
        longitude: 6.191429,
        emoji: '🍽️',
        sport: 'Restaurant',
        mealType: 'soir',
        matches: []
      },
      {
        id: 'parc-saint-marie',
        name: "Parc Saint-Marie",
        position: [48.680392, 6.170733],
        description: "Brunch du Dimanche matin",
        address: "1 Av. Boffrand, 54000 Nancy",
        type: 'restaurant',
        date: '',
        latitude: 48.680392,
        longitude: 6.170733,
        emoji: '🍽️',
        sport: 'Restaurant',
        mealType: 'midi',
        matches: []
      }
    ];
  });

  const [parties, setParties] = useState<Party[]>(() => {
    // Les descriptions et résultats seront chargés depuis Firebase via les listeners
    return [
      {
        id: 'place-stanislas',
        name: "Place Stanislas — Défilé",
        position: [48.693524, 6.183270],
        description: 'Défilé 14h–16h30 (informations sur place dès midi)',
        address: "Pl. Stanislas, 54000 Nancy",
        type: 'party',
        date: '2026-04-16T14:00:00',
        endDate: '2026-04-16T16:30:00',
        latitude: 48.693524,
        longitude: 6.183270,
        emoji: '🎺',
        sport: 'Defile'
      },
      {
        id: 'parc-expo-pompom',
        name: "Parc Expo — Soirée Pompoms",
        position: [48.663257, 6.189841],
        description: "Soirée Pompoms du 16 avril, 21h-3h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        type: 'party',
        date: '2026-04-16T20:00:00',
        endDate: '2026-04-17T02:00:00',
        latitude: 48.663257,
        longitude: 6.189841,
        emoji: '🎀',
        sport: 'Pompom',
        result: ''
      },
      {
        id: 'parc-expo-showcase',
        name: "Parc Expo — Showcase",
        position: [48.663636, 6.190061],
        description: "Soirée Showcase 17 avril, 20h-4h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        type: 'party',
        date: '2026-04-17T20:00:00',
        endDate: '2026-04-18T02:00:00',
        latitude: 48.663636,
        longitude: 6.190061,
        emoji: '🎤',
        sport: 'Party',
        result: ''
      },
      {
        id: 'zenith',
        name: "Zénith — DJ Contest",
        position: [48.710136, 6.139169],
        description: "Soirée DJ Contest 18 avril, 20h-4h",
        address: "Rue du Zénith, 54320 Maxéville",
        type: 'party',
        date: '2026-04-18T20:30:00',
        endDate: '2026-04-19T04:00:00',
        latitude: 48.710136,
        longitude: 6.139169,
        emoji: '🎧',
        sport: 'Party',
        result: ''
      }
    ];
  });

  const [showVenuesLoadingOverlay, setShowVenuesLoadingOverlay] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isVenuesLoading) {
      timer = setTimeout(() => setShowVenuesLoadingOverlay(true), 500);
    } else {
      setShowVenuesLoadingOverlay(false);
      if (timer) clearTimeout(timer);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVenuesLoading]);

  const [_selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [editingPartyResult, setEditingPartyResult] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [editingResult, setEditingResult] = useState('');
  const [editingPartyDescription, setEditingPartyDescription] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [editingDescription, setEditingDescription] = useState('');
  const [editingHotelDescription, setEditingHotelDescription] = useState<{hotelId: string | null, isEditing: boolean}>({ hotelId: null, isEditing: false });
  const [editingHotelDescriptionText, setEditingHotelDescriptionText] = useState('');
  const [editingRestaurantDescription, setEditingRestaurantDescription] = useState<{restaurantId: string | null, isEditing: boolean}>({ restaurantId: null, isEditing: false });
  const [editingRestaurantDescriptionText, setEditingRestaurantDescriptionText] = useState('');
  const [_openPopup, setOpenPopup] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [_userLocation, setUserLocation] = useState<[number, number] | null>(null);
  // Use custom hooks for map state and filters
  const { mapStyle, setMapStyle: _setMapStyle, currentZoom, setCurrentZoom, mapRef, markersRef, indicationMarkersRef, appAction, setAppAction, triggerMarkerUpdate } = useMapState();
  const { eventFilter, setEventFilter, delegationFilter, setDelegationFilter, venueFilter, setVenueFilter, showFemale, setShowFemale, showMale, setShowMale, showMixed, setShowMixed, showFilters, setShowFilters } = useEventFilters();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [_fromEvents, setFromEvents] = useState(false);

  // État pour l'historique des actions et l'index actuel
  const [history, setHistory] = useState<MapHistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);


  // triggerMarkerUpdate is now provided by useMapState hook

  // Écouter les changements de préférences
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredSport' && e.newValue) {
        // Ne plus modifier directement le filtre
        // setEventFilter(e.newValue);
        // triggerMarkerUpdate();
      }
      if (e.key === 'preferredDelegation' && e.newValue) {
        // Ne plus modifier directement le filtre
        // setDelegationFilter(e.newValue);
        // triggerMarkerUpdate();
      }
      // Les changements d'hôtel/restaurant sont gérés par un effet spécifique
      // if (e.key === 'preferredHotel' || e.key === 'preferredRestaurant') {
      //   triggerMarkerUpdate();
      // }
    };

    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'preferredSport') {
        // Ne plus modifier directement le filtre
        // setEventFilter(e.detail.value);
        // triggerMarkerUpdate();
      }
      // Les changements d'hôtel/restaurant sont gérés par un effet spécifique
      // if (e.detail.key === 'preferredHotel' || e.detail.key === 'preferredRestaurant') {
      //   triggerMarkerUpdate();
      // }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('preferenceChange', handlePreferenceChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('preferenceChange', handlePreferenceChange as EventListener);
    };
  }, []);


  // mapStyles moved to useMapState hook

  const sportEmojis: { [key: string]: string } = {
    Football: '⚽',
    Basketball: '🏀',
    Handball: '🤾',
    Rugby: '🏉',
    Volleyball: '🏐',
    Tennis: '🎾',
    Badminton: '🏸',
    'Ping-pong': '🏓',
    Ultimate: '🥏',
    Natation: '🏊',
    Cross: '👟',
    Echecs: '♟️',
    Athlétisme: '🏃‍♂️',
    Escalade: '🧗‍♂️',
    Spikeball: '⚡️',
    Pétanque: '🍹',
    Pompom: '🎀',
    Defile: '🎺',
    Party: '🎉',
    Hotel: '🏢',
    Restaurant: '🍽️'
  };

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
    'Stand entreprise': '👩‍💼',
    'Issue de secours': '➜',
    'Reception Alumni': '👨‍🎓',
  };

  // Utiliser les services pour les fonctions utilitaires
  const geocodeAddress = venueService.geocodeAddress.bind(venueService);
  const getMarkerColor = mapService.getMarkerColor.bind(mapService);
  const getSportIcon = mapService.getSportIcon.bind(mapService);

  // Charger les descriptions et résultats depuis Firebase au démarrage
  useEffect(() => {
    const unsubscribeFunctions = editableDataService.loadEditableData({
      onPartyResultsUpdate: (partyId: string, result: string) => {
        setParties((prevParties: Party[]) => 
          prevParties.map((party: Party) => 
            party.id === partyId ? { ...party, result } : party
          )
        );
      },
      onPartyDescriptionUpdate: (partyId: string, description: string) => {
        setParties((prevParties: Party[]) => 
          prevParties.map((party: Party) => 
            party.id === partyId ? { ...party, description } : party
          )
        );
      },
      onHotelDescriptionUpdate: (hotelId: string, description: string) => {
        setHotels((prevHotels: Hotel[]) => 
          prevHotels.map((hotel: Hotel) => 
            hotel.id === hotelId ? { ...hotel, description } : hotel
          )
        );
        createHotelAndRestaurantMarkers();
      },
      onRestaurantDescriptionUpdate: (restaurantId: string, description: string) => {
        setRestaurants((prevRestaurants: Restaurant[]) => 
          prevRestaurants.map((restaurant: Restaurant) => 
            restaurant.id === restaurantId ? { ...restaurant, description } : restaurant
          )
        );
      },
      onAllDataLoaded: () => {
        updateLocalStateFromFirebase();
      }
    });

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  // Initialiser la branche Firebase editableData au démarrage
  useEffect(() => {
    if (isAdmin) {
      editableDataService.initializeEditableDataBranch(parties, hotels, restaurants)
        .then(() => {
          updateLocalStateFromFirebase();
        })
        .catch((error) => {
          logger.error('[App] Erreur initialisation editableData:', error);
        });
    }
  }, [isAdmin, parties, hotels, restaurants]);

  // Mettre à jour l'état local au démarrage avec les données du localStorage
  useEffect(() => {
    // Mettre à jour l'état local avec les données existantes
    updateLocalStateFromFirebase();
  }, []);

  // Fonction pour ajouter une action à l'historique
  const addToHistory = (action: MapHistoryAction) => {
    // Supprimer les actions futures (si on est revenu en arrière)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Fonction pour annuler la dernière action
  const undoLastAction = async () => {
    if (historyIndex >= 0) {
      const action = history[historyIndex];
      await action.undo();
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Fonction pour refaire la dernière action annulée
  const redoLastAction = async () => {
    if (historyIndex < history.length - 1) {
      const nextAction = history[historyIndex + 1];
      
      // Recréer l'action en fonction du type
      switch (nextAction.type) {
        case 'ADD_VENUE':
          // Ré-ajouter le lieu
          {
            const venueData = nextAction.data;
            const venueRef = ref(database, `venues/${venueData.id}`);
            await set(venueRef, {
              name: venueData.name,
              position: [venueData.latitude, venueData.longitude],
              description: venueData.description,
              address: venueData.address,
              matches: venueData.matches || [],
              sport: venueData.sport,
              date: venueData.date,
              latitude: venueData.latitude,
              longitude: venueData.longitude,
              emoji: venueData.emoji
            });
          }
          break;
        case 'UPDATE_VENUE':
          // Réappliquer la mise à jour
          {
            const { after } = nextAction.data;
            const venueRef = ref(database, `venues/${after.id}`);
            await set(venueRef, after);
          }
          break;
        case 'DELETE_VENUE':
          // Supprimer à nouveau le lieu
          {
            const venueData = nextAction.data;
            const venueRef = ref(database, `venues/${venueData.id}`);
            await set(venueRef, null);
          }
          break;
        case 'ADD_MATCH':
          // Ré-ajouter le match
          {
            const { venueId, match } = nextAction.data;
            const venue = venues.find(v => v.id === venueId);
            if (venue) {
              const matches = [...(venue.matches || [])];
              // Vérifier si le match existe déjà pour éviter les doublons
              if (!matches.some(m => m.id === match.id)) {
                matches.push(match);
                const venueRef = ref(database, `venues/${venueId}`);
                await set(venueRef, {
                  ...venue,
                  matches
                });
              }
            }
          }
          break;
        case 'UPDATE_MATCH':
          // Réappliquer la mise à jour du match
          {
            const { venueId, matchId, after } = nextAction.data;
            const venue = venues.find(v => v.id === venueId);
            if (venue) {
              const updatedMatches = venue.matches.map(match =>
                match.id === matchId ? { ...match, ...after } : match
              );
              const venueRef = ref(database, `venues/${venueId}`);
              await set(venueRef, {
                ...venue,
                matches: updatedMatches
              });
            }
          }
          break;
        case 'DELETE_MATCH':
          // Supprimer à nouveau le match
          {
            const { venueId, match } = nextAction.data;
            const venue = venues.find(v => v.id === venueId);
            if (venue) {
              const updatedMatches = venue.matches.filter(m => m.id !== match.id);
              const venueRef = ref(database, `venues/${venueId}`);
              await set(venueRef, {
                ...venue,
                matches: updatedMatches
              });
            }
          }
          break;
      }
      
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Gestionnaire d'événements pour écouter Ctrl+Z (undo) et Shift+Ctrl+Z (redo)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+Z ou Cmd+Z (Mac) pour annuler
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        await undoLastAction();
      }
      
      // Shift+Ctrl+Z ou Shift+Cmd+Z (Mac) pour refaire
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        await redoLastAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [history, historyIndex, venues]);

  // Modifier la fonction qui gère l'ajout d'un lieu
  const handleAddVenue = async () => {
    if (!checkAdminRights()) return;

    let coordinates: [number, number] | null = null;
    
    if (tempMarker) {
      coordinates = tempMarker;
    } else if (newVenueAddress) {
      coordinates = await geocodeAddress(newVenueAddress);
      // Si le géocodage échoue, utiliser des coordonnées par défaut (centre de Nancy)
      if (!coordinates) {
        coordinates = [48.6921, 6.1844]; // Coordonnées par défaut (Nancy)
      }
    } else {
      // Si aucune adresse ni marqueur, utiliser des coordonnées par défaut
      coordinates = [48.6921, 6.1844]; // Coordonnées par défaut (Nancy)
    }

    try {
      const venueId = await venueService.addVenue({
        name: newVenueName || '',
        description: newVenueDescription || '',
        address: newVenueAddress || `${coordinates[0]}, ${coordinates[1]}`,
        coordinates,
        sport: selectedSport || 'Football',
        emoji: selectedEmoji || '⚽',
        placeType: selectedPlaceType || 'sport',
        eventType: selectedPlaceType === 'soirée' ? selectedEventType : undefined,
        indicationType: selectedPlaceType === 'indication' ? selectedIndicationType : undefined
      });

      updateMapMarkers();
      safeTriggerMarkerUpdate(); 
      
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
      
      if (selectedPlaceType === 'soirée') {
        newVenue.eventType = selectedEventType;
      }
      if (selectedPlaceType === 'indication') {
        newVenue.indicationType = selectedIndicationType;
      }

      addToHistory(venueService.createAddHistoryAction(venueId, { ...newVenue, id: venueId }));
      
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
      logger.error('Erreur lors de l\'ajout du lieu:', error);
      alert('Une erreur est survenue lors de l\'ajout du lieu.');
    }
  };

  // Ajouter le gestionnaire de clic sur la carte
  const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
    if (isPlacingMarker) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setTempMarker([lat, lng]);
      // Garder uniquement les coordonnées comme adresse
      setNewVenueAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      // Réactiver le formulaire après le placement du marqueur
      setIsPlacingMarker(false);
      setIsAddingPlace(true);
      safeTriggerMarkerUpdate();
    }
  };

  // Fonction pour supprimer un lieu
  const deleteVenue = async (id: string) => {
    if (!checkAdminRights()) return;

    // Demander confirmation avant la suppression
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.')) {
      return;
    }
    
    // Sauvegarder l'état du lieu avant suppression pour pouvoir annuler
    const venue = venues.find(v => v.id === id);
    if (venue) {
      try {
        await venueService.deleteVenue(id);
        updateMapMarkers();
        safeTriggerMarkerUpdate(); 
        
        // Ajouter l'action à l'historique avec une fonction d'annulation
        addToHistory(venueService.createDeleteHistoryAction(id, venue));
        
        setSelectedVenue(null);
      } catch (error) {
        logger.error('Erreur lors de la suppression du lieu:', error);
        alert('Une erreur est survenue lors de la suppression du lieu.');
      }
    }
  };

  // Fonction pour ajouter un nouveau match
  const handleAddMatch = async (venueId: string) => {
    if (!checkAdminRights()) return;

    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;

    try {
      const match = await matchService.addMatch(venueId, venue, {
        date: newMatch.date || '',
        teams: newMatch.teams || '',
        description: newMatch.description || '',
        endTime: newMatch.endTime || '',
        result: newMatch.result || ''
      });

      updateMapMarkers();
      safeTriggerMarkerUpdate();
      
      // Ajouter l'action à l'historique
      addToHistory(matchService.createAddHistoryAction(venueId, venue, match));

      // Réinitialiser le formulaire
      setNewMatch({
        date: '',
        teams: '',
        description: '',
        endTime: '',
        result: ''
      });
      setEditingMatch({ venueId: null, match: null });
      setOpenPopup(venueId);

      // Ouvrir le popup du lieu après l'ajout
      const marker = markersRef.current.find(m => 
        m.getLatLng().lat === venue.latitude && m.getLatLng().lng === venue.longitude
      );
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du match:', error);
      alert('Une erreur est survenue lors de l\'ajout du match.');
    }
  };

  // Fonction pour mettre à jour un match
  const handleUpdateMatch = async (venueId: string, matchId: string, updatedData: Partial<Match>) => {
    if (!checkAdminRights()) return;
    
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;

    const venueBefore = { ...venue };
    const matchBefore = venue.matches.find(m => m.id === matchId);
    
    try {
      await matchService.updateMatch(venueId, venue, matchId, updatedData);
      updateMapMarkers();
      safeTriggerMarkerUpdate();
      
      if (matchBefore) {
        const matchAfter = { ...matchBefore, ...updatedData };
        addToHistory(matchService.createUpdateHistoryAction(venueId, venueBefore, matchId, matchBefore, matchAfter));
      }
      
      setOpenPopup(venueId);
      
      const marker = markersRef.current.find(m => 
        m.getLatLng().lat === venue.latitude && m.getLatLng().lng === venue.longitude
      );
      
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du match:', error);
      alert('Une erreur est survenue lors de la mise à jour du match.');
    }
  };

  // Fonction pour supprimer un match
  const deleteMatch = async (venueId: string, matchId: string) => {
    if (!canEditMatches()) {
      alert('Cette action nécessite des droits d\'édition de match.');
      return;
    }

    // Demander confirmation avant la suppression
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.')) {
      return;
    }
    
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;

    // Sauvegarder l'état avant suppression pour pouvoir annuler
    const venueBefore = { ...venue };
    const matchToDelete = venue.matches.find(m => m.id === matchId);
    
    try {
      const deletedMatch = await matchService.deleteMatch(venueId, venue, matchId);
      if (!deletedMatch) return;

      updateMapMarkers();
      safeTriggerMarkerUpdate();
      
      // Ajouter l'action à l'historique
      if (matchToDelete) {
        addToHistory(matchService.createDeleteHistoryAction(venueId, venueBefore, matchToDelete));
      }
    } catch (error) {
      logger.error('Erreur lors de la suppression du match:', error);
      alert('Une erreur est survenue lors de la suppression du match.');
    }
  };

  // Fonction pour mettre à jour un lieu existant
  const handleUpdateVenue = async () => {
    if (!checkAdminRights()) return;

    if (editingVenue.id) {
      // Trouver le lieu dans la liste
      const venue = venues.find(v => v.id === editingVenue.id);
      
      if (venue) {
        // Sauvegarder l'état avant modification pour pouvoir annuler
        const venueBefore = { ...venue };
        
        // Utiliser les coordonnées du marqueur temporaire si disponible
        const coordinates: [number, number] = tempMarker || [venue.latitude, venue.longitude];
        
        // Créer l'objet de mise à jour
        // Utiliser directement les valeurs des champs (même si vides) pour permettre la suppression
        const venueAny = venue as any;
        const updatedVenue: any = {
          ...venue,
          name: newVenueName,
          description: newVenueDescription,
          address: newVenueAddress || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
          latitude: coordinates[0],
          longitude: coordinates[1],
          position: coordinates,
          placeType: selectedPlaceType || venueAny.placeType || 'sport'
        };
        
        // Ajouter les champs spécifiques selon le type
        if (selectedPlaceType === 'sport') {
          updatedVenue.sport = selectedSport;
          updatedVenue.emoji = selectedEmoji;
          // Supprimer les champs qui ne sont pas pour les venues sport
          delete updatedVenue.eventType;
          delete updatedVenue.indicationType;
        } else if (selectedPlaceType === 'soirée') {
          updatedVenue.emoji = selectedEmoji;
          updatedVenue.eventType = selectedEventType;
          // Supprimer les champs qui ne sont pas pour les soirées
          delete updatedVenue.indicationType;
        } else if (selectedPlaceType === 'indication') {
          updatedVenue.emoji = selectedEmoji;
          updatedVenue.indicationType = selectedIndicationType;
          // Supprimer les champs qui ne sont pas pour les indications
          delete updatedVenue.eventType;
        } else {
          // Pour hotel, resto, défilé, utiliser l'emoji sélectionné ou celui du venue
          updatedVenue.emoji = selectedEmoji || venue.emoji || '📍';
          // Supprimer les champs qui ne sont pas pour ces types
          delete updatedVenue.eventType;
          delete updatedVenue.indicationType;
        }
        
        try {
          // Mise à jour Firebase - c'est l'opération critique
          await venueService.updateVenue(editingVenue.id, updatedVenue);
          
          // Si la mise à jour Firebase réussit, on fait les opérations secondaires
          // Ces opérations sont dans un try/catch séparé pour ne pas bloquer en cas d'erreur
          try {
            updateMapMarkers();
            safeTriggerMarkerUpdate();
            
            // Ajouter l'action à l'historique avec une fonction d'annulation
            addToHistory(venueService.createUpdateHistoryAction(editingVenue.id, venueBefore, updatedVenue));
          } catch (secondaryError) {
            // Log l'erreur mais ne bloque pas - la mise à jour a réussi
            logger.error('Erreur lors des opérations secondaires après mise à jour:', secondaryError);
          }
          
          // Réinitialiser le formulaire et l'état d'édition
          setNewVenueName('');
          setNewVenueDescription('');
          setNewVenueAddress('');
          setSelectedSport('Football');
          setSelectedEventType('DJ contest');
          setSelectedIndicationType('Soins');
          setSelectedPlaceType(null);
          setTempMarker(null);
          setEditingVenue({ id: null, venue: null });
          setIsAddingPlace(false);
        } catch (error) {
          // Seulement cette erreur est critique - la mise à jour Firebase a échoué
          logger.error('Erreur lors de la mise à jour du lieu:', error);
          alert('Une erreur est survenue lors de la mise à jour du lieu.');
        }
      }
    }
  };

  // Fonction pour commencer l'édition d'un lieu
  const startEditingVenue = (venue: Place) => {
    setEditingVenue({ id: venue.id, venue: venue as unknown as Venue });
    setIsEditing(true);
    setIsAddingPlace(true); 
    
    // Déterminer le type de lieu selon le type stocké ou les propriétés
    let placeType: string | null = null;
    const venueAny = venue as any;
    
    if (venue.type === 'hotel') {
      placeType = 'hotel';
    } else if (venue.type === 'restaurant') {
      placeType = 'resto';
    } else if (venue.type === 'party') {
      placeType = 'soirée';
    } else if (venue.type === 'venue') {
      // Pour les venues sans type ou type 'venue', vérifier les propriétés supplémentaires
      if (venueAny.placeType) {
        placeType = venueAny.placeType;
      } else if (venueAny.eventType) {
        placeType = 'soirée';
      } else if (venueAny.indicationType) {
        placeType = 'indication';
      } else {
        // Par défaut, considérer comme sport
        placeType = 'sport';
      }
    }
    
    // S'assurer qu'un type est toujours défini
    if (!placeType) {
      placeType = 'sport';
    }
    
    setSelectedPlaceType(placeType);
    
    setNewVenueName(venue.name || '');
    setNewVenueDescription(venue.description || '');
    setNewVenueAddress(venue.address || '');
    setSelectedSport(venue.sport || 'Football');
    setTempMarker([venue.latitude, venue.longitude]);
    
    // Gérer les types d'événements pour les soirées
    if (placeType === 'soirée') {
      if (venueAny.eventType) {
        setSelectedEventType(venueAny.eventType);
        // Mettre à jour l'emoji selon le type d'event
        const eventEmoji = eventTypeEmojis[venueAny.eventType as keyof typeof eventTypeEmojis];
        if (eventEmoji) {
          setSelectedEmoji(eventEmoji);
        } else {
          // Si l'emoji n'est pas trouvé, utiliser celui du venue ou une valeur par défaut
          setSelectedEmoji(venue.emoji || '🎉');
        }
      } else {
        // Valeur par défaut si pas d'eventType
        setSelectedEventType('DJ contest');
        setSelectedEmoji(eventTypeEmojis['DJ contest'] || '🎉');
      }
      // Réinitialiser indicationType si ce n'est pas une indication
      setSelectedIndicationType('Soins');
    } 
    // Gérer les types d'indication
    else if (placeType === 'indication') {
      if (venueAny.indicationType) {
        // Charger le type d'indication depuis le venue
        const indicationTypeValue = String(venueAny.indicationType).trim();
        if (indicationTypeValue) {
          setSelectedIndicationType(indicationTypeValue);
          // Mettre à jour l'emoji selon le type d'indication
          const indicationEmoji = indicationTypeEmojis[indicationTypeValue as keyof typeof indicationTypeEmojis];
          if (indicationEmoji) {
            setSelectedEmoji(indicationEmoji);
          } else {
            // Si l'emoji n'est pas trouvé, utiliser celui du venue ou une valeur par défaut
            setSelectedEmoji(venue.emoji || '📍');
          }
        } else {
          // Valeur par défaut si indicationType est vide
          setSelectedIndicationType('Soins');
          setSelectedEmoji(indicationTypeEmojis['Soins'] || '📍');
        }
      } else {
        // Valeur par défaut si pas d'indicationType
        setSelectedIndicationType('Soins');
        setSelectedEmoji(indicationTypeEmojis['Soins'] || '📍');
      }
      // Réinitialiser eventType si ce n'est pas une soirée
      setSelectedEventType('DJ contest');
    } 
    // Pour les autres types (sport, hotel, resto, défilé)
    else {
      // Réinitialiser les valeurs spécifiques
      setSelectedEventType('DJ contest');
      setSelectedIndicationType('Soins');
    }
    
    // Pour les autres types (sport, hotel, resto, défilé), utiliser l'emoji du venue ou une valeur par défaut
    if (placeType === 'sport') {
      if (venue.emoji) {
        setSelectedEmoji(venue.emoji);
      } else {
        setSelectedEmoji(sportEmojis[venue.sport as keyof typeof sportEmojis] || '⚽');
      }
    } else if (placeType && placeType !== 'soirée' && placeType !== 'indication') {
      // Pour hotel, resto, défilé, utiliser l'emoji du venue ou une valeur par défaut
      setSelectedEmoji(venue.emoji || '📍');
    }
    
    setIsPlacingMarker(false);
  };

  // Fonction pour annuler l'édition
  const cancelEditingVenue = () => {
    setEditingVenue({ id: null, venue: null });
    setNewVenueName('');
    setNewVenueDescription('');
    setNewVenueAddress('');
    setSelectedSport('Football');
    setSelectedEventType('DJ contest');
    setSelectedIndicationType('Soins');
    setSelectedPlaceType(null);
    setTempMarker(null);
    setIsPlacingMarker(false);
    setIsAddingPlace(false);
    safeTriggerMarkerUpdate();
  };

  // Utiliser les services pour les fonctions utilitaires
  const isMatchPassed = mapService.isMatchPassed.bind(mapService);
  const delegationMatches = mapService.delegationMatches.bind(mapService);


  // Utiliser le service pour formater la date
  const formatDateTime = mapService.formatDateTime.bind(mapService);

  // Fonction pour ouvrir dans Google Maps
  const openInGoogleMaps = async (place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    
    if (Capacitor.isNativePlatform()) {
      // Sur mobile natif, utiliser le plugin Capacitor Browser
      try {
        await Browser.open({ url });
      } catch (error) {
        logger.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
        // Fallback vers window.open si le plugin échoue
        window.open(url, '_blank');
      }
    } else {
      // Sur web, utiliser window.open
      window.open(url, '_blank');
    }
  };

  // Fonction pour gérer l'ouverture des popups
  function handlePopupOpen() {
    // Attendre que le popup soit ouvert et le DOM mis à jour
    setTimeout(() => {
      const popup = document.querySelector('.leaflet-popup-content');
      if (popup) {
        const matchesScrollContainer = popup.querySelector('.matches-scroll-container');
        if (matchesScrollContainer) {
          const firstNonPassedMatch = matchesScrollContainer.querySelector('.match-item:not(.match-passed)');
          if (firstNonPassedMatch) {
            // Calculer la position avec un offset pour laisser de l'espace en haut
            const containerRect = matchesScrollContainer.getBoundingClientRect();
            const elementRect = firstNonPassedMatch.getBoundingClientRect();
            const offset = 35; // 40px d'espace en haut
            
            const scrollTop = matchesScrollContainer.scrollTop + (elementRect.top - containerRect.top) - offset;
            matchesScrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }
      }
    }, 100);
  }

  const handleLocationSuccess = (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setUserLocation([latitude, longitude]);
    setLocationError(null);
    setLocationLoading(false);
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = "Impossible d'obtenir votre position. ";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "L'accès à la géolocalisation a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "La position n'est pas disponible. Vérifiez que la géolocalisation est activée sur votre appareil.";
        break;
      case error.TIMEOUT:
        errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
        break;
      default:
        errorMessage = "Une erreur inattendue s'est produite.";
    }
    setLocationError(errorMessage);
    setShowLocationPrompt(true);
  };

  const retryLocation = () => {
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      { enableHighAccuracy: true }
    );
  };

  // Générer les marqueurs pour la carte
  useEffect(() => {
    // S'assurer qu'on est sur la page map avant de créer les marqueurs
    if (location.pathname !== '/map' && activeTab !== 'map') {
      return;
    }

    // Attendre que la carte soit prête
    if (!mapRef.current) {
      // Si la carte n'est pas encore prête, réessayer après un court délai
      const timeoutId = setTimeout(() => {
        if (mapRef.current && (location.pathname === '/map' || activeTab === 'map')) {
          // Déclencher une mise à jour pour créer les marqueurs
          setAppAction(prev => prev + 1);
        }
      }, 100);
      // Retourner la fonction de cleanup
      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Nettoyer uniquement les marqueurs de venues et parties (pas les hôtels/restaurants)
    markersRef.current = markersRef.current.filter(marker => {
      const isHotelOrRestaurant = marker.getElement()?.classList.contains('hotel-marker') || 
                                marker.getElement()?.classList.contains('restaurant-marker');
      if (!isHotelOrRestaurant) {
        marker.remove();
        return false;
      }
      return true;
    });
    
    // Nettoyer les marqueurs d'indication
    indicationMarkersRef.current.forEach(marker => {
      marker.remove();
    });
    indicationMarkersRef.current = [];

    // VENUES
    venues.forEach(venue => {
        // Filtrage par délégation
        const delegationMatch =
          delegationFilter === 'all' ||
          (venue.matches && venue.matches.some(match =>
            delegationMatches(match.teams, delegationFilter)
          ));

        // Filtrage par genre : au moins un match du lieu doit correspondre au filtre de genre
        let genderMatch = true;
        if (venue.matches && venue.matches.length > 0) {
          genderMatch = venue.matches.some(match => {
            const desc = match.description?.toLowerCase() || '';
            const isFemale = desc.includes('féminin');
            const isMale = desc.includes('masculin');
            const isMixed = desc.includes('mixte');
            return (
              (isFemale && showFemale) ||
              (isMale && showMale) ||
              (isMixed && showMixed) ||
              (!isFemale && !isMale && !isMixed) // Si pas de genre précisé, toujours afficher
            );
          });
        }

        // Filtrage par event et lieu
        const shouldShow =
          (eventFilter === 'all' || eventFilter === 'match' || eventFilter === venue.sport) &&
          (venueFilter === 'Tous' || venue.id === venueFilter) &&
          delegationMatch &&
          genderMatch;

        if (!shouldShow) return;

        // Vérifier si c'est une indication
        const venueAny = venue as any;
        const isIndication = venueAny.placeType === 'indication' || venueAny.indicationType;
                
        let markerHtml: string;
        let markerSize: [number, number];
        let iconAnchor: [number, number];
        let popupAnchor: [number, number];
        let markerClassName: string;
        
        if (isIndication) {
          // Marqueur d'indication : fond blanc, même taille que les venues
          const typeStr = venueAny.indicationType ? String(venueAny.indicationType).trim() : '';
          const indicationEmoji = typeStr
            ? indicationTypeEmojis[typeStr as keyof typeof indicationTypeEmojis] || venue.emoji
            : venue.emoji;
          const innerMarkup = isIssueDeSecoursIndication(typeStr)
            ? `<img src="${ISSUE_DE_SECOURS_MARKER_PUBLIC_PATH}" alt="" class="indication-marker__icon" />`
            : `<span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${indicationEmoji}</span>`;
          markerHtml = `<div class="marker-content indication-marker" style="background-color: white; color: #333; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #333; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                         ${innerMarkup}
                       </div>`;
          markerSize = [30, 30];
          iconAnchor = [15, 15];
          popupAnchor = [0, -15];
          markerClassName = 'custom-marker indication-marker';
        } else {
          // Marqueur normal (venue)
        const markerColor = getMarkerColor(venue.date);
          markerHtml = `<div class="marker-content" style="background-color: ${markerColor.color}; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                         <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getSportIcon(venue.sport)}</span>
                       </div>`;
          markerSize = [30, 30];
          iconAnchor = [15, 15];
          popupAnchor = [0, -15];
          markerClassName = 'custom-marker';
        }

        const marker = L.marker([venue.latitude, venue.longitude], {
          icon: L.divIcon({
            className: markerClassName,
            html: markerHtml,
            iconSize: markerSize,
            iconAnchor: iconAnchor,
            popupAnchor: popupAnchor
          })
        });

        // Créer le contenu du popup
        const popupContent = document.createElement('div');
        popupContent.className = 'venue-popup';
        if (isIndication) {
          popupContent.innerHTML = `
            <h3>${venue.name}</h3>
            <p>${venue.description}</p>
          `;
        } else {
        popupContent.innerHTML = `
          <h3>${venue.name}</h3>
          <p>${venue.description}</p>
        `;
        }

        // Boutons d'actions (uniquement pour les venues normales, pas pour les indications)
        if (!isIndication) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'popup-buttons';
        const mapsButton = document.createElement('button');
        mapsButton.className = 'maps-button';
        mapsButton.textContent = 'Ouvrir dans Google Maps';
        mapsButton.addEventListener('click', async () => {
          await openInGoogleMaps(venue);
        });
        buttonsContainer.appendChild(mapsButton);
        popupContent.appendChild(buttonsContainer);
        }

        // Ajouter les matchs au popup (uniquement pour les venues normales, pas pour les indications)
        const matchesListDiv = document.createElement('div');
        matchesListDiv.className = 'matches-list';
        if (!isIndication && venue.matches && venue.matches.length > 0) {
          matchesListDiv.innerHTML = '<h4>Matchs :</h4>';
          const sortedMatches = [...venue.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const matchesScrollContainer = document.createElement('div');
          matchesScrollContainer.className = 'matches-scroll-container';
          sortedMatches.forEach(match => {
            const matchItemDiv = document.createElement('div');
            matchItemDiv.className = `match-item ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`;
            matchItemDiv.innerHTML = `
              <p class="match-date">${formatDateTime(match.date, match.endTime)}</p>
              <p class="match-teams">${match.teams}</p>
              <p class="match-description">${match.description}</p>
              ${match.result ? `<p class="match-result"><strong>Résultat :</strong> ${match.result}</p>` : ''}
            `;
            if (isEditing && canEditMatches()) {
              const matchActionsDiv = document.createElement('div');
              matchActionsDiv.className = 'match-actions';
              const editButton = document.createElement('button');
              editButton.className = 'edit-match-button';
              editButton.textContent = 'Modifier';
              editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                startEditingMatch(venue.id || '', match);
              });
              const deleteButton = document.createElement('button');
              deleteButton.className = 'delete-match-button';
              deleteButton.textContent = 'Supprimer';
              deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteMatch(venue.id || '', match.id);
              });
              matchActionsDiv.appendChild(editButton);
              matchActionsDiv.appendChild(deleteButton);
              matchItemDiv.appendChild(matchActionsDiv);
            }
            matchesScrollContainer.appendChild(matchItemDiv);
          });
          matchesListDiv.appendChild(matchesScrollContainer);
          popupContent.appendChild(matchesListDiv);
        } else if (!isIndication) {
          matchesListDiv.innerHTML = '<p>Aucun match prévu</p>';
          popupContent.appendChild(matchesListDiv);
        }
        if (isEditing && canEditMatches()) {
          const editButtonsContainer = document.createElement('div');
          editButtonsContainer.className = 'popup-buttons';
          // Ne pas afficher le bouton d'ajout de match pour les indications
          if (!isIndication) {
          const addMatchButton = document.createElement('button');
          addMatchButton.className = 'add-match-button';
          addMatchButton.textContent = 'Ajouter un match';
          addMatchButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditingMatch(venue.id || '', null);
          });
          editButtonsContainer.appendChild(addMatchButton);
          }
          const editButton = document.createElement('button');
          editButton.className = 'modif-button';
          editButton.textContent = 'Modifier ce lieu';
          editButton.addEventListener('click', () => {
            startEditingVenue(venue);
          });
          editButtonsContainer.appendChild(editButton);
          const deleteButton = document.createElement('button');
          deleteButton.className = 'delete-button';
          deleteButton.textContent = 'Supprimer ce lieu';
          deleteButton.addEventListener('click', () => {
            deleteVenue(venue.id || '');
          });
          editButtonsContainer.appendChild(deleteButton);
          popupContent.appendChild(editButtonsContainer);
        }
        marker.bindPopup(popupContent, { closeButton: false });
        marker.on('popupopen', () => {
          handlePopupOpen();
        });
        if (mapRef.current) {
          if (isIndication) {
            indicationMarkersRef.current.push(marker);
            // Ne pas ajouter à la carte si le zoom est < 17
            if (currentZoom >= 17) {
          marker.addTo(mapRef.current);
            }
          } else {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
    }
    });

    // HOTELS et RESTAURANTS - Gérés par un effet séparé pour éviter les conflits

    // PARTIES (seulement pour les admins)
      parties.forEach(party => {
        const partyVenueId = party.id;

        const shouldShow = 
          (eventFilter === 'all' || eventFilter === 'party') &&
          (venueFilter === 'Tous' || partyVenueId === venueFilter);

        if (!shouldShow) return;

        const marker = L.marker([party.latitude, party.longitude], {
          icon: L.divIcon({
            className: 'custom-marker party-marker',
            html: `<div style="background-color: #9C27B0; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                     <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${party.emoji || (party.sport === 'Pompom' ? '🎀' : party.sport === 'Defile' ? '🎺' : '🎉')}</span>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
          })
        });
        const popupContent = document.createElement('div');
        popupContent.className = 'venue-popup';
        popupContent.innerHTML = `
          <h3>${party.name}</h3>
          <p>${party.description}</p>
          ${party.sport !== 'Defile' && !party.description?.toLowerCase().includes('showcase') && party.result ? `<p style="color: rgba(76, 175, 80, 0.95); margin: 2px 0;">Résultat : ${party.result}</p>` : ''}
        `;
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'popup-buttons';
        
        const mapsButton = document.createElement('button');
        mapsButton.className = 'maps-button';
        mapsButton.textContent = 'Ouvrir dans Google Maps';
        mapsButton.addEventListener('click', async () => {
          await openInGoogleMaps(party);
        });
        buttonsContainer.appendChild(mapsButton);
        
        // Bouton pour voir la map des lieux de soirée
        if (party.id !== 'place-stanislas') {
          const partyMapButton = document.createElement('button');
          partyMapButton.className = 'party-map-button';
          partyMapButton.textContent = 'Voir la carte des lieux';
          partyMapButton.addEventListener('click', () => {
            setSelectedPartyForMap(party.name);
            setActiveTab('party-map');
          });
          buttonsContainer.appendChild(partyMapButton);
        }
        
        // Ajouter le bouton d'édition du résultat pour les admins (soirées Pompoms et DJ Contest)
        // Utiliser l'ID de la soirée pour ne pas dépendre du texte de description
        if (isAdmin && isEditing && (party.id === 'parc-expo-pompom' || party.id === 'zenith')) {
          const editResultButton = document.createElement('button');
          editResultButton.className = 'edit-result-button';
          editResultButton.textContent = 'Modifier le résultat';
          editResultButton.addEventListener('click', () => {
            // Ouvrir le formulaire modal pour éditer le résultat
            openEditResultModal(party.id, party.result || '');
          });
          buttonsContainer.appendChild(editResultButton);
        }
        
        // Ajouter le bouton d'édition de la description pour les admins (tous les événements party) seulement si le mode édition est activé
        if (isAdmin && isEditing) {
          const editDescriptionButton = document.createElement('button');
          editDescriptionButton.className = 'edit-description-button';
          editDescriptionButton.textContent = 'Modifier la description';
          editDescriptionButton.addEventListener('click', () => {
            // Utiliser directement la description de l'état React (synchronisé avec Firebase)
            const currentDescription = party.description || '';
            openEditDescriptionModal(party.id, currentDescription);
          });
          buttonsContainer.appendChild(editDescriptionButton);
        }
        
        popupContent.appendChild(buttonsContainer);
        marker.bindPopup(popupContent, { closeButton: false });
        marker.on('popupopen', () => {
          // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
          const currentParty = parties.find(p => p.id === party.id) || party;
          
          // Mettre à jour le contenu HTML
          popupContent.innerHTML = `
            <h3>${currentParty.name}</h3>
            <p>${currentParty.description}</p>
            ${currentParty.sport !== 'Defile' && !currentParty.description?.toLowerCase().includes('showcase') && currentParty.result ? `<p style="color: rgba(76, 175, 80, 0.95); margin: 2px 0;">Résultat : ${currentParty.result}</p>` : ''}
          `;
          
          // Réajouter les boutons
          const buttonsContainerNew = document.createElement('div');
          buttonsContainerNew.className = 'popup-buttons';
          
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', async () => {
            await openInGoogleMaps(currentParty);
          });
              buttonsContainerNew.appendChild(mapsButton);

              // Bouton pour voir la map des lieux de soirée
          if (currentParty.id !== 'place-stanislas') {
            const partyMapButton = document.createElement('button');
            partyMapButton.className = 'party-map-button';
            partyMapButton.textContent = 'Voir la carte des lieux';
            partyMapButton.addEventListener('click', () => {
              setSelectedPartyForMap(currentParty.name);
              setActiveTab('party-map');
            });
            buttonsContainerNew.appendChild(partyMapButton);
          }
          
          // Réajouter les boutons admin si nécessaire (soirées Pompoms et DJ Contest)
          if (isAdmin && isEditing && (currentParty.id === '2' || currentParty.id === '4')) {
            const editResultButton = document.createElement('button');
            editResultButton.className = 'edit-result-button';
            editResultButton.textContent = 'Modifier le résultat';
            editResultButton.addEventListener('click', () => {
              openEditResultModal(currentParty.id, currentParty.result || '');
            });
            buttonsContainerNew.appendChild(editResultButton);
          }
          
          if (isAdmin && isEditing) {
            const editDescriptionButton = document.createElement('button');
            editDescriptionButton.className = 'edit-description-button';
            editDescriptionButton.textContent = 'Modifier la description';
            editDescriptionButton.addEventListener('click', () => {
              const currentDescription = currentParty.description || '';
              openEditDescriptionModal(currentParty.id, currentDescription);
            });
            buttonsContainerNew.appendChild(editDescriptionButton);
          }
          
          popupContent.appendChild(buttonsContainerNew);
          handlePopupOpen();
        });
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });
    }, [venues, parties, isEditing, isAdmin, userRole, eventFilter, venueFilter, delegationFilter, showFemale, showMale, showMixed, location.pathname, activeTab, appAction]);

  // Fonction pour créer un marqueur d'hôtel
  const createHotelMarker = (hotel: any) => {
            const marker = L.marker([hotel.latitude, hotel.longitude], {
              icon: L.divIcon({
                className: 'custom-marker hotel-marker',
                html: `<div style="background-color: #1976D2; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                         <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🏢</span>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
              })
            });

            const savedDescription = hotel.description;         
            const popupContent = document.createElement('div');
            popupContent.className = 'venue-popup';
            popupContent.innerHTML = `
              <h3>${hotel.name}</h3>
              ${savedDescription ? `<p>${savedDescription}</p>` : ''}
            `;
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'popup-buttons';
            const mapsButton = document.createElement('button');
            mapsButton.className = 'maps-button';
            mapsButton.textContent = 'Ouvrir dans Google Maps';
            mapsButton.addEventListener('click', async () => {
              await openInGoogleMaps(hotel);
            });
            buttonsContainer.appendChild(mapsButton);

            // Ajouter le bouton "Appeler" si l'hôtel a un numéro de téléphone
            if (hotel.telephone) {
              const callButton = document.createElement('button');
              callButton.className = 'call-button';
              callButton.textContent = 'Appeler';
              callButton.addEventListener('click', () => {
                // Nettoyer le numéro de téléphone (enlever les espaces et caractères spéciaux pour le lien tel:)
                const cleanPhone = hotel.telephone.replace(/\s+/g, '');
                window.location.href = `tel:${cleanPhone}`;
              });
              buttonsContainer.appendChild(callButton);
            }
    
            popupContent.appendChild(buttonsContainer);
            marker.bindPopup(popupContent, { closeButton: false });
            marker.on('popupopen', () => {
              // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
              const currentHotel = hotels.find(h => h.id === hotel.id) || hotel;
              
              // Mettre à jour le contenu HTML
              popupContent.innerHTML = `
                <h3>${currentHotel.name}</h3>
                ${currentHotel.description ? `<p>${currentHotel.description}</p>` : ''}
              `;
              
              // Réajouter les boutons
              const buttonsContainerNew = document.createElement('div');
              buttonsContainerNew.className = 'popup-buttons';
              const mapsButton = document.createElement('button');
              mapsButton.className = 'maps-button';
              mapsButton.textContent = 'Ouvrir dans Google Maps';
              mapsButton.addEventListener('click', async () => {
                await openInGoogleMaps(currentHotel);
              });
              buttonsContainerNew.appendChild(mapsButton);

              // Réajouter le bouton "Appeler" si l'hôtel a un numéro de téléphone
              if (currentHotel.telephone) {
                const callButton = document.createElement('button');
                callButton.className = 'call-button';
                callButton.textContent = 'Appeler';
                callButton.addEventListener('click', () => {
                  const cleanPhone = currentHotel.telephone.replace(/\s+/g, '');
                  window.location.href = `tel:${cleanPhone}`;
                });
                buttonsContainerNew.appendChild(callButton);
              }
              
              // Réajouter le bouton d'édition si admin - Utiliser les refs pour avoir les valeurs actuelles
              const currentIsAdmin = isAdminRef.current;
              const currentIsEditing = isEditingRef.current;
              if (currentIsAdmin && currentIsEditing) {
                const editDescriptionButton = document.createElement('button');
                editDescriptionButton.className = 'edit-description-button';
                editDescriptionButton.textContent = 'Modifier la description';
                editDescriptionButton.addEventListener('click', () => {
                  const currentDescription = currentHotel.description || '';
                  openEditHotelDescriptionModal(currentHotel.id, currentDescription);
                });
                buttonsContainerNew.appendChild(editDescriptionButton);
              }
              
              popupContent.appendChild(buttonsContainerNew);
              handlePopupOpen();
            });

    return marker;
  };

  // Fonction pour créer un marqueur de restaurant
  const createRestaurantMarker = (restaurant: any) => {
            const marker = L.marker([restaurant.latitude, restaurant.longitude], {
              icon: L.divIcon({
                className: 'custom-marker restaurant-marker',
                html: `<div style="background-color:rgb(255, 31, 31); color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                         <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🍽️</span>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
              })
            });

            const popupContent = document.createElement('div');
            popupContent.className = 'venue-popup';
            const savedDescription = restaurant.description;           
            popupContent.innerHTML = `
              <h3>${restaurant.name}</h3>
              <p>${savedDescription}</p>
              <p class="venue-address">${restaurant.address}</p>
            `;
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'popup-buttons';
            const mapsButton = document.createElement('button');
            mapsButton.className = 'maps-button';
            mapsButton.textContent = 'Ouvrir dans Google Maps';
            mapsButton.addEventListener('click', async () => {
              await openInGoogleMaps(restaurant);
            });
            buttonsContainer.appendChild(mapsButton);

            popupContent.appendChild(buttonsContainer);
            marker.bindPopup(popupContent, { closeButton: false });
            marker.on('popupopen', () => {
              // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
              const currentRestaurant = restaurants.find(r => r.id === restaurant.id) || restaurant;
              
              // Mettre à jour le contenu HTML
              popupContent.innerHTML = `
                <h3>${currentRestaurant.name}</h3>
                <p>${currentRestaurant.description}</p>
              `;
              
              // Réajouter les boutons
              const buttonsContainerNew = document.createElement('div');
              buttonsContainerNew.className = 'popup-buttons';
              const mapsButton = document.createElement('button');
              mapsButton.className = 'maps-button';
              mapsButton.textContent = 'Ouvrir dans Google Maps';
              mapsButton.addEventListener('click', async () => {
                await openInGoogleMaps(currentRestaurant);
              });
              buttonsContainerNew.appendChild(mapsButton);

              // Réajouter le bouton d'édition si admin - Utiliser les refs pour avoir les valeurs actuelles
              const currentIsAdmin = isAdminRef.current;
              const currentIsEditing = isEditingRef.current;
              if (currentIsAdmin && currentIsEditing) {
                const editDescriptionButton = document.createElement('button');
                editDescriptionButton.className = 'edit-description-button';
                editDescriptionButton.textContent = 'Modifier la description';
                editDescriptionButton.addEventListener('click', () => {
                  const currentDescription = currentRestaurant.description || '';
                  openEditRestaurantDescriptionModal(currentRestaurant.id, currentDescription);
                });
                buttonsContainerNew.appendChild(editDescriptionButton);
              }
              
              popupContent.appendChild(buttonsContainerNew);
              handlePopupOpen();
            });

    return marker;
  };

  // Fonction pour créer les marqueurs d'hôtels et restaurants
  const createHotelAndRestaurantMarkers = () => {
    const map = mapRef.current;
    if (!map) return;

    // Supprimer uniquement les marqueurs d'hôtels et restaurants existants
    markersRef.current = markersRef.current.filter(marker => {
      const isHotelOrRestaurant = marker.getElement()?.classList.contains('hotel-marker') || 
                                marker.getElement()?.classList.contains('restaurant-marker');
      if (isHotelOrRestaurant) {
        marker.remove();
        return false;
      }
      return true;
    });

    // Recréer les marqueurs d'hôtels selon la préférence actuelle
    const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
    hotels.forEach(hotel => {
      if (preferredHotel === 'none' || hotel.id === preferredHotel) {
        const marker = createHotelMarker(hotel);
            marker.addTo(map);
            markersRef.current.push(marker);
          }
        });

    // Recréer les marqueurs de restaurants selon la préférence actuelle
    const showRestaurants = localStorage.getItem('showRestaurants') !== 'false'; // true par défaut
    if (showRestaurants) {
      restaurants.forEach(restaurant => {
        const marker = createRestaurantMarker(restaurant);
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    }
  };

  // Effet pour créer les marqueurs d'hôtels et restaurants au premier chargement
  useEffect(() => {
    if (mapRef.current && !locationError && hotels.length > 0 && restaurants.length > 0) {
      // Vérifier s'il y a déjà des marqueurs d'hôtels/restaurants
      const hasHotelOrRestaurantMarkers = markersRef.current.some(marker => 
        marker.getElement()?.classList.contains('hotel-marker') || 
        marker.getElement()?.classList.contains('restaurant-marker')
      );
      
      // Créer les marqueurs seulement s'il n'y en a pas déjà
      if (!hasHotelOrRestaurantMarkers) {
        const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
        hotels.forEach(hotel => {
          if (preferredHotel === 'none' || hotel.id === preferredHotel) {
            const marker = createHotelMarker(hotel);
            if (mapRef.current) {
              marker.addTo(mapRef.current);
              markersRef.current.push(marker);
            }
          }
        });

        const showRestaurants = localStorage.getItem('showRestaurants') !== 'false'; // true par défaut
        if (showRestaurants) {
          restaurants.forEach(restaurant => {
            const marker = createRestaurantMarker(restaurant);
            if (mapRef.current) {
              marker.addTo(mapRef.current);
              markersRef.current.push(marker);
            }
          });
        }
      }
    }
  }, [mapRef.current, locationError, hotels, restaurants, isAdmin, isEditing]);

  // Effet pour gérer les changements de préférences d'hôtels et restaurants
  useEffect(() => {
    const handlePreferenceChange = (e: StorageEvent) => {
      if (e.key === 'preferredHotel' || e.key === 'showRestaurants') {
        createHotelAndRestaurantMarkers();
      }
    };

    // Écouter aussi les événements personnalisés pour les changements dans le même onglet
    const handleCustomPreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'preferredHotel' || e.detail.key === 'showRestaurants') {
        createHotelAndRestaurantMarkers();
      }
    };

    window.addEventListener('storage', handlePreferenceChange);
    window.addEventListener('preferenceChange', handleCustomPreferenceChange as EventListener);
    return () => {
      window.removeEventListener('storage', handlePreferenceChange);
      window.removeEventListener('preferenceChange', handleCustomPreferenceChange as EventListener);
    };
  }, [hotels, restaurants, isAdmin, isEditing]);

  // Effet pour recréer les marqueurs d'hôtels et restaurants quand isEditing ou isAdmin change
  useEffect(() => {
    if (mapRef.current && !locationError && hotels.length > 0 && restaurants.length > 0) {
      createHotelAndRestaurantMarkers();
    }
  }, [isEditing, isAdmin]);

  // Effet pour recréer les marqueurs quand les descriptions des hôtels ou restaurants changent
  useEffect(() => {
    if (mapRef.current && !locationError && hotels.length > 0 && restaurants.length > 0) {
      // Délai pour éviter de recréer trop souvent si plusieurs mises à jour arrivent en même temps
      const timeoutId = setTimeout(() => {
        createHotelAndRestaurantMarkers();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hotels, restaurants]);

  // Fonction pour commencer l'édition d'un match
  const startEditingMatch = (venueId: string, match: Match | null) => {
    if (!canEditMatches()) {
      alert('Cette action nécessite des droits d\'édition de match.');
      return;
    }

    // Fermer le formulaire d'édition de lieu s'il est ouvert
    if (editingVenue.id || isAddingPlace) {
      setEditingVenue({ id: null, venue: null });
      setIsAddingPlace(false);
    }
    
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
    safeTriggerMarkerUpdate();
  };

  // Fonction pour terminer l'édition d'un match
  const finishEditingMatch = () => {
    setEditingMatch({ venueId: null, match: null });
    safeTriggerMarkerUpdate();
  };

  // Fonction pour sauvegarder le résultat de la soirée
  const savePartyResult = async (partyId: string, result: string) => {
    try {
      await editableDataService.savePartyResult(partyId, result);
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === partyId ? { ...party, result } : party
        )
      );
      safeTriggerMarkerUpdate();
    } catch (error) {
      logger.error('[App] Erreur sauvegarde partyResult:', error);
    }
    setEditingPartyResult({ partyId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description de la soirée
  const savePartyDescription = async (partyId: string, description: string) => {
    try {
      await editableDataService.savePartyDescription(partyId, description);
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === partyId ? { ...party, description } : party
        )
      );
      safeTriggerMarkerUpdate();
    } catch (error) {
      logger.error('[App] Erreur sauvegarde partyDescription:', error);
    }
    setEditingPartyDescription({ partyId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description de l'hôtel
  const saveHotelDescription = async (hotelId: string, description: string) => {
    try {
      await editableDataService.saveHotelDescription(hotelId, description);
      // Mettre à jour l'état local
      setHotels((prevHotels: Hotel[]) => 
        prevHotels.map((hotel: Hotel) => 
          hotel.id === hotelId ? { ...hotel, description } : hotel
        )
      );
      createHotelAndRestaurantMarkers();
      safeTriggerMarkerUpdate();
    } catch (error) {
      logger.error('[App] Erreur sauvegarde hotelDescription:', error);
    }
    setEditingHotelDescription({ hotelId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description du restaurant
  const saveRestaurantDescription = async (restaurantId: string, description: string) => {
    try {
      await editableDataService.saveRestaurantDescription(restaurantId, description);
      // Mettre à jour l'état local
      setRestaurants((prevRestaurants: Restaurant[]) => 
        prevRestaurants.map((restaurant: Restaurant) => 
          restaurant.id === restaurantId ? { ...restaurant, description } : restaurant
        )
      );
      createHotelAndRestaurantMarkers();
    } catch (error) {
      logger.error('[App] Erreur sauvegarde restaurantDescription:', error);
    }
    setEditingRestaurantDescription({ restaurantId: null, isEditing: false });
  };

  // Fonction pour ouvrir le modal d'édition du résultat
  const openEditResultModal = (partyId: string, currentResult: string) => {
    setEditingPartyResult({ partyId, isEditing: true });
    setEditingResult(currentResult);
    setShowEditResultModal(true);
  };

  // Fonction pour fermer le modal d'édition du résultat
  const closeEditResultModal = () => {
    setShowEditResultModal(false);
    setEditingResult('');
  };

  // Fonction pour sauvegarder le résultat depuis le modal
  const handleSaveResultFromModal = () => {
    // Déterminer quelle soirée éditer selon le contexte
    const currentPartyId = editingPartyResult.partyId;
    if (currentPartyId) {
      savePartyResult(currentPartyId, editingResult.trim());
      closeEditResultModal();
    }
  };

  // Fonction pour ouvrir le modal d'édition de la description
  const openEditDescriptionModal = (partyId: string, currentDescription: string) => {
    setEditingPartyDescription({ partyId, isEditing: true });
    setEditingDescription(currentDescription);
    setShowEditDescriptionModal(true);
  };

  // Fonction pour fermer le modal d'édition de la description
  const closeEditDescriptionModal = () => {
    setShowEditDescriptionModal(false);
    setEditingDescription('');
  };

  // Fonction pour sauvegarder la description depuis le modal
  const handleSaveDescriptionFromModal = () => {
    // Déterminer quelle soirée éditer selon le contexte
    const currentPartyId = editingPartyDescription.partyId;
    if (currentPartyId) {
      savePartyDescription(currentPartyId, editingDescription.trim());
      closeEditDescriptionModal();
    }
  };

  // Fonction pour ouvrir le modal d'édition de la description de l'hôtel
  const openEditHotelDescriptionModal = (hotelId: string, currentDescription: string) => {
    setEditingHotelDescription({ hotelId, isEditing: true });
    setEditingHotelDescriptionText(currentDescription);
    setShowEditHotelDescriptionModal(true);
  };

  // Fonction pour fermer le modal d'édition de la description de l'hôtel
  const closeEditHotelDescriptionModal = () => {
    setShowEditHotelDescriptionModal(false);
    setEditingHotelDescriptionText('');
  };

  // Fonction pour sauvegarder la description de l'hôtel depuis le modal
  const handleSaveHotelDescriptionFromModal = () => {
    const currentHotelId = editingHotelDescription.hotelId;
    if (currentHotelId) {
      saveHotelDescription(currentHotelId, editingHotelDescriptionText.trim());
      closeEditHotelDescriptionModal();
    }
  };

  // Fonction pour ouvrir le modal d'édition de la description du restaurant
  const openEditRestaurantDescriptionModal = (restaurantId: string, currentDescription: string) => {
    setEditingRestaurantDescription({ restaurantId, isEditing: true });
    setEditingRestaurantDescriptionText(currentDescription);
    setShowEditRestaurantDescriptionModal(true);
  };

  // Fonction pour fermer le modal d'édition de la description du restaurant
  const closeEditRestaurantDescriptionModal = () => {
    setShowEditRestaurantDescriptionModal(false);
    setEditingRestaurantDescriptionText('');
  };

  // Fonction pour sauvegarder la description du restaurant depuis le modal
  const handleSaveRestaurantDescriptionFromModal = () => {
    const currentRestaurantId = editingRestaurantDescription.restaurantId;
    if (currentRestaurantId) {
      saveRestaurantDescription(currentRestaurantId, editingRestaurantDescriptionText.trim());
      closeEditRestaurantDescriptionModal();
    }
  };


  // Ref pour stocker updateMapMarkers (défini plus tard dans le code)
  const updateMapMarkersRef = useRef<(() => void) | null>(null);
  
  // Fonction helper pour appeler triggerMarkerUpdate de manière sécurisée
  const safeTriggerMarkerUpdate = useCallback(() => {
    if (updateMapMarkersRef.current) {
      triggerMarkerUpdate(updateMapMarkersRef.current);
    } else {
      // Si updateMapMarkers n'est pas encore défini, juste incrémenter appAction
      setAppAction(prev => prev + 1);
    }
  }, [triggerMarkerUpdate]);
  
  // Fonction pour mettre à jour l'état local avec les données Firebase
  // Cette fonction est maintenant simplifiée car les états sont mis à jour directement par les listeners Firebase
  const updateLocalStateFromFirebase = () => {
    // Les états sont déjà mis à jour directement par les listeners Firebase
    // On déclenche juste la mise à jour des marqueurs pour refléter les changements
    safeTriggerMarkerUpdate();
  };


  // Enregistrer la visite de la page au chargement
  useEffect(() => {
    // Forcer l'envoi d'un pageview après un court délai pour assurer le chargement complet
    setTimeout(() => {
      ReactGA.send({ 
        hitType: "pageview", 
        page: window.location.pathname + window.location.search
      });
      
      // Forcer un événement pour tester la connexion
      ReactGA.event({
        category: 'page',
        action: 'view',
        label: window.location.pathname
      });
    }, 1000);
    
    // Fonction pour enregistrer les événements personnalisés
    const trackEvent = (category: string, action: string) => {
      ReactGA.event({
        category,
        action
      });
    };

    // Tracker l'événement "app_loaded"
    trackEvent('app', 'app_loaded');
    
    return () => {
      // Tracker l'événement quand l'utilisateur quitte
      trackEvent('app', 'app_closed');
    };
  }, []);

  // Fonction optimisée pour mettre à jour les marqueurs sur la carte
  const updateMapMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Récupérer tous les marqueurs existants
    const allMarkers = markersRef.current;

    // Créer des maps pour des recherches plus rapides O(1) au lieu de O(n)
    const venuesMap = new Map(venues.map(v => [`${v.latitude},${v.longitude}`, v]));
    const partiesMap = new Map(parties.map(p => [`${p.latitude},${p.longitude}`, p]));
    const hotelsMap = new Map(hotels.map(h => [`${h.latitude},${h.longitude}`, h]));
    const restaurantsMap = new Map(restaurants.map(r => [`${r.latitude},${r.longitude}`, r]));

    // Mettre à jour la visibilité de chaque marqueur
    allMarkers.forEach(marker => {
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerLatLng = marker.getLatLng();
        const key = `${markerLatLng.lat},${markerLatLng.lng}`;
        
        let shouldShow = false;

        // Vérifier dans l'ordre de priorité avec des recherches O(1)
        const venue = venuesMap.get(key);
        if (venue) {
          shouldShow = 
            (eventFilter === 'all' || eventFilter === 'match' || eventFilter === venue.sport) &&
            (venueFilter === 'Tous' || venue.id === venueFilter);
        } else {
          const party = partiesMap.get(key);
          if (party) {
            const partyId = party.id;

            shouldShow = 
              (eventFilter === 'all' || eventFilter === 'party') &&
              (venueFilter === 'Tous' || partyId === venueFilter);
          } else {
            const hotel = hotelsMap.get(key);
            if (hotel) {
              const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
              shouldShow = preferredHotel === 'none' || hotel.id === preferredHotel;
            } else {
              const restaurant = restaurantsMap.get(key);
              if (restaurant) {
                const showRestaurants = localStorage.getItem('showRestaurants') !== 'false'; // true par défaut
                shouldShow = showRestaurants;
              }
            }
          }
        }

        // Appliquer les changements seulement si nécessaire pour éviter les reflows
        const currentDisplay = markerElement.style.display;
        const currentOpacity = markerElement.style.opacity;
        const newDisplay = shouldShow ? 'block' : 'none';
        const newOpacity = shouldShow ? '1' : '0';

        if (currentDisplay !== newDisplay) {
          markerElement.style.display = newDisplay;
        }
        if (currentOpacity !== newOpacity) {
          markerElement.style.opacity = newOpacity;
        }
      }
    });
  }, [venues, parties, hotels, restaurants, eventFilter, venueFilter]);
  
  // Stocker la référence pour qu'elle soit accessible dans updateLocalStateFromFirebase
  useEffect(() => {
    updateMapMarkersRef.current = updateMapMarkers;
  }, [updateMapMarkers]);

  // Les marqueurs sont maintenant créés avec la logique correcte dans le premier useEffect
  // Pas besoin de les mettre à jour séparément

  const handleCalendarClose = () => {
    setActiveTab(previousTab);
  };

  const handleViewOnMap = (venue: Venue) => {
    // Fermer le calendrier et l'onglet événements
    setIsCalendarOpen(false);
    setActiveTab('map');
    
    // Centrer la carte sur le lieu
    if (mapRef.current) {
      mapRef.current.flyTo([venue.latitude, venue.longitude], 18, {
        duration: 2.5
      });
      
      // Trouver et ouvrir le marqueur correspondant
      const marker = markersRef.current.find(m => 
        m.getLatLng().lat === venue.latitude && m.getLatLng().lng === venue.longitude
      );
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 2500);
      }
    }
  };

  // Calcul du nombre de messages non lus
  const lastSeenChatTimestamp = Number(localStorage.getItem('lastSeenChatTimestamp') || 0);
  const unreadCount = messages.filter(m => m.timestamp > lastSeenChatTimestamp).length;

  const handleOpenChat = () => {
    
    // Si le chat est déjà ouvert, le fermer
    if (showChat) {
      setShowChat(false);
      // Ne pas changer activeTab - rester sur la page actuelle
    } else {
      // Sinon on mémorise l'onglet actuel comme origine et on ouvre le chat
      setChatOriginTab(activeTab);
      
      // Ouvrir le chat directement, même depuis CalendarPopup
      setShowChat(true);
      
      // TOUJOURS ajouter une entrée dans l'historique lors de l'ouverture du chat
      window.history.pushState({ 
        chat: true, 
        origin: activeTab 
      }, '', window.location.pathname);

      if (messages.length > 0) {
        // Maintenant que les messages sont triés par ordre décroissant, le premier est le plus récent
        const mostRecentMsg = messages[0];
        const newTimestamp = mostRecentMsg.timestamp;
        localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
      }
    }
  };

  // Ajouter les styles pour les favoris
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .favorite-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 5px;
        color: #ccc;
        transition: color 0.3s ease;
      }

      .favorite-button.active {
        color: #ffd700;
      }

      .favorite-button:hover {
        color: #ffd700;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fonction pour gérer l'affichage sur la carte depuis EventDetails
  const handleViewOnMapFromDetails = (venue: Venue) => {
    // Sauvegarder l'événement avant de le mettre à null
    const currentEvent = selectedEvent;
    setSelectedEvent(null); // Fermer EventDetails
    
    // Naviguer vers l'onglet map si nécessaire
    if (activeTab !== 'map') {
      setActiveTab('map');
    }
    
    safeTriggerMarkerUpdate();
    
    // Voler vers le lieu sur la carte
    if (venue.latitude && venue.longitude) {
      mapRef.current?.flyTo([venue.latitude, venue.longitude], 18, {
        duration: 2.5
      });
      const marker = markersRef.current.find(m => 
        m.getLatLng().lat === venue.latitude && m.getLatLng().lng === venue.longitude
      );
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 2500);
      }
    }
    
    // Si c'est une soirée, gérer aussi le cas des parties
    if (currentEvent && currentEvent.type === 'party' && isAdmin) {
      const partyId = currentEvent.id.split('-')[1];
      const party = parties.find(p => p.id === partyId || p.name === partyId);
      if (party) {
        mapRef.current?.flyTo([party.latitude, party.longitude], 18, {
          duration: 2.5
        });
        const marker = markersRef.current.find(m => 
          m.getLatLng().lat === party.latitude && m.getLatLng().lng === party.longitude
        );
        if (marker) {
          setTimeout(() => {
            marker.openPopup();
          }, 2500);
        }
      }
    }
  };

  const handleEventSelect = (event: IEventsTabRow) => {
    setSelectedEvent(mapEventsTabRowToEventDetails(event));
  };

  const handleAdminClick = async () => {
    if (user) {
      // Si l'utilisateur est connecté, on le déconnecte
      try {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isRespoSport');
        localStorage.removeItem('userRole');
        setUserRole(null);
        setUser(null);
        setIsAdmin(false);
        setIsRespoSport(false);
        setIsEditing(false); // Désactiver le mode édition lors de la déconnexion
      } catch (error) {
        logger.error('Erreur lors de la déconnexion:', error);
      }
    }
  };

  const handleBack = () => {
    switch (activeTab as TabType) {
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
      case 'chat':
        setActiveTab(chatOriginTab);
        break;
      case 'party-map':
        setActiveTab('map');
        break;
      case 'home':
      case 'info':
        // Pas de retour possible depuis les pages principales
        return;
      default:
        setActiveTab('map');
    }
  };

  const handleTabChange = (tab: TabType) => {
    // Ajouter une entrée dans l'historique pour toutes les pages secondaires
    if (tab !== 'map' && tab !== 'home' && tab !== 'info') {
      window.history.pushState({ tab }, '', window.location.pathname);
    }
    setPreviousTab(activeTab);
    
    // Si on ouvre le calendrier, stocker l'onglet d'origine dans localStorage
    if (tab === 'calendar') {
      localStorage.setItem('calendarOriginTab', activeTab);
      setFromEvents(activeTab === 'events');
    } else {
      setFromEvents(false);
    }
    
    setActiveTab(tab);
    if (tab === 'party-map') {
      // Ne rien faire de spécial pour party-map
    }
    if (tab === 'events') {
      setTimeout(() => {
        const eventsList = document.querySelector('.events-list');
        if (eventsList) {
          const firstNonPassedEvent = eventsList.querySelector('.event-item:not(.passed)');
          if (firstNonPassedEvent) {
            // Calculer la position avec un offset pour laisser de l'espace en haut
            const containerRect = eventsList.getBoundingClientRect();
            const elementRect = firstNonPassedEvent.getBoundingClientRect();
            const offset = 15; // 40px d'espace en haut
            
            const scrollTop = eventsList.scrollTop + (elementRect.top - containerRect.top) - offset;
            eventsList.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }
      }, 100);
    }
  };

  // Juste après la déclaration des hooks de contexte et des states principaux dans App()
  const previousTabRef = useRef<TabType | null>(null);

  useEffect(() => {
    // Détecte le retour de 'calendar' vers 'events' et déclenche le scroll
    if (previousTabRef.current === 'calendar' && activeTab === 'events') {
      setTimeout(() => {
        const eventsList = document.querySelector('.events-list');
        if (eventsList) {
          const firstNonPassedEvent = eventsList.querySelector('.event-item:not(.passed)');
          if (firstNonPassedEvent) {
            // Calculer la position avec un offset pour laisser de l'espace en haut
            const containerRect = eventsList.getBoundingClientRect();
            const elementRect = firstNonPassedEvent.getBoundingClientRect();
            const offset = 15; // 40px d'espace en haut
            
            const scrollTop = eventsList.scrollTop + (elementRect.top - containerRect.top) - offset;
            eventsList.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }
      }, 100);
    }
    previousTabRef.current = activeTab;
  }, [activeTab]);



  // Fonctions wrapper pour sauvegarder les filtres dans le localStorage
  // Fonction helper pour dispatcher un CustomEvent de synchronisation des filtres
  const dispatchFilterChangeEvent = (key: string, value: string | boolean) => {
    window.dispatchEvent(new CustomEvent('filterChange', {
      detail: { key, value }
    }));
  };

  const setEventFilterWithSave = (value: string) => {
    setEventFilter(value);
    localStorage.setItem('mapEventFilter', value);
    dispatchFilterChangeEvent('mapEventFilter', value);
  };

  const setDelegationFilterWithSave = (value: string) => {
    setDelegationFilter(value);
    localStorage.setItem('mapDelegationFilter', value);
    dispatchFilterChangeEvent('mapDelegationFilter', value);
  };

  const setVenueFilterWithSave = (value: string) => {
    setVenueFilter(value);
    localStorage.setItem('mapVenueFilter', value);
    dispatchFilterChangeEvent('mapVenueFilter', value);
  };

  const setShowFemaleWithSave = (value: boolean) => {
    setShowFemale(value);
    localStorage.setItem('mapShowFemale', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowFemale', value);
  };

  const setShowMaleWithSave = (value: boolean) => {
    setShowMale(value);
    localStorage.setItem('mapShowMale', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowMale', value);
  };

  const setShowMixedWithSave = (value: boolean) => {
    setShowMixed(value);
    localStorage.setItem('mapShowMixed', JSON.stringify(value));
    dispatchFilterChangeEvent('mapShowMixed', value);
  };

  const setShowFiltersWithSave = (value: boolean) => {
    setShowFilters(value);
    localStorage.setItem('eventsTabShowFilters', JSON.stringify(value));
    dispatchFilterChangeEvent('eventsTabShowFilters', value);
  };



  return (
    <div className="app">
      <main className="app-main">
        {locationError && showLocationPrompt && (
          <div className="location-error">
            <p>{locationError}</p>
            <div className="location-error-buttons">
              <button 
                className="retry-button" 
                onClick={() => {
                  setIsLoading(true);
                  retryLocation();
                }}
              >
                Réessayer
              </button>
              <button 
                className="retry-button" 
                onClick={() => {
                  setLocationError(null);
                  setShowLocationPrompt(false);
                  localStorage.setItem('location', 'false');
                  window.dispatchEvent(new StorageEvent('storage', {
                    key: 'location',
                    newValue: 'false',
                    oldValue: 'true',
                    storageArea: localStorage
                  }));
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        <div className="page-content no-scroll map-container map-container--flush">
        {(locationLoading || (showVenuesLoadingOverlay && (activeTab === 'map' || location.pathname === '/map'))) && (
          <div className="map-loading-indicator">
            <div className="location-loading-spinner"></div>
          </div>
        )}
        <MapContainer
          center={[48.687697, 6.174308]}
          zoom={12}
              className="leaflet-map-fill"
              ref={(map) => { mapRef.current = map || null; }}
              zoomControl={false}
        >
          <TileLayer
                url={mapStyles[mapStyle as keyof typeof mapStyles].url}
                attribution={mapStyles[mapStyle as keyof typeof mapStyles].attribution}
          />
          <LocationMarker />
          <MapEvents onMapClick={handleMapClick} />
          <ZoomListener onZoomChange={(zoom) => {
            setCurrentZoom(zoom);
            setCurrentZoom(zoom);
            // Mettre à jour la visibilité des marqueurs d'indication
            indicationMarkersRef.current.forEach(marker => {
              if (zoom >= 17) {
                if (mapRef.current && !mapRef.current.hasLayer(marker)) {
                  marker.addTo(mapRef.current);
                }
              } else {
                if (mapRef.current && mapRef.current.hasLayer(marker)) {
                  marker.remove();
                }
              }
            });
          }} />
                          <BusLines visibleLines={['T1', 'T5', 'T4', 'T2', 'T3']} />
              <div className="leaflet-control-container">
                <div className="leaflet-top leaflet-right">
                  <div className="leaflet-control-zoom leaflet-bar leaflet-control">
                    <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in" onClick={(e) => {
                      e.preventDefault();
                      mapRef.current?.zoomIn();
                    }}>+</a>
                    <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out" onClick={(e) => {
                      e.preventDefault();
                      mapRef.current?.zoomOut();
                    }}>−</a>
                  </div>
                  {isEditing && isAdmin && (
                    <button 
                      className="add-venue-button"
                      onClick={() => {
                        setShowPlaceTypeModal(true);
                      }}
                      title="Ajouter un lieu"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </MapContainer>
            

            
            {/* Bouton flottant pour afficher les événements */}
            <button 
              ref={eventsButtonRef}
              className={`events-toggle-button ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => {
                // Tracker le changement d'onglet
                ReactGA.event({
                  category: 'navigation',
                  action: 'change_tab',
                  label: activeTab === 'map' ? 'events' : 'map'
                });
                handleTabChange(activeTab === 'map' ? 'events' : 'map');
              }}
            >
              {activeTab === 'map' ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                  Événements
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Fermer
                </>
              )}
                  </button>

            {/* Bouton Calendrier en dessous du bouton Événements sur la map */}
            {activeTab === 'map' && (
              <button 
                ref={calendarButtonRef}
                className="calendar-toggle-button"
                onClick={() => {
                  ReactGA.event({
                    category: 'navigation',
                    action: 'change_tab',
                    label: 'calendar'
                  });
                  handleTabChange('calendar');
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                Calendrier
              </button>
            )}
            
            {activeTab === 'events' && (
              <EventsTab
                venues={venues}
                parties={parties}
                isAdmin={isAdmin}
                onEventSelect={handleEventSelect}
                triggerMarkerUpdate={() => {
                  triggerMarkerUpdate(updateMapMarkers);
                }}
                isVenuesLoading={isVenuesLoading}
              />
            )}
            {activeTab === 'chat' && (
              <ChatPanel 
                isAdmin={isAdmin}
                isEditing={isEditing}
              />
            )}
          </div>
      </main>
      
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
                <input id="match-date" type="datetime-local" value={editingMatch.match ? editingMatch.match.date : newMatch.date} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, date: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, date: e.target.value }); } }} enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-end-time">Heure de fin</label>
                <input id="match-end-time" type="datetime-local" value={editingMatch.match ? editingMatch.match.endTime : (newMatch.endTime || '')} min={editingMatch.match ? editingMatch.match.date : newMatch.date} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, endTime: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, endTime: e.target.value }); } }} enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-teams">Équipes</label>
                <input id="match-teams" type="text" value={editingMatch.match ? editingMatch.match.teams : newMatch.teams} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, teams: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, teams: e.target.value }); } }} placeholder="Ex: Nancy vs Alès" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-description">Description</label>
                <input id="match-description" type="text" value={editingMatch.match ? editingMatch.match.description : newMatch.description} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, description: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, description: e.target.value }); } }} placeholder="Ex: Poule A Masculin - Match 1" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-result">Résultat</label>
                <input id="match-result" type="text" value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, result: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, result: e.target.value }); } }} placeholder="Ex: 2 - 1 (à saisir si disponible)" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => { if (editingMatch.match) { handleUpdateMatch(editingMatch.venueId!, editingMatch.match.id, { date: editingMatch.match.date, endTime: editingMatch.match.endTime || '', teams: editingMatch.match.teams, description: editingMatch.match.description, result: editingMatch.match.result }); finishEditingMatch(); } else { handleAddMatch(editingMatch.venueId!); } }}>{editingMatch.match ? 'Mettre à jour' : 'Ajouter'}</button>
                <button className="modal-form-cancel" onClick={finishEditingMatch}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de sélection du type de lieu */}
      {showPlaceTypeModal && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Choisir le type de lieu</h2>
              <button className="close-button" onClick={() => setShowPlaceTypeModal(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="place-type-selection">
                <button 
                  className="place-type-button"
                  onClick={() => {
                    setSelectedPlaceType('sport');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                    setSelectedEmoji(sportEmojis['Football'] || '⚽');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">⚽</span>
                  <span className="place-type-label">Sport</span>
                </button>
                <button 
                  className="place-type-button"
                  onClick={() => {
                    setSelectedPlaceType('indication');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setSelectedEmoji(indicationTypeEmojis['Soins'] || '📍');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">📍</span>
                  <span className="place-type-label">Indication</span>
                </button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-cancel" onClick={() => setShowPlaceTypeModal(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification de lieu - Type Sport */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'sport' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier le lieu de sport</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Gymnase Raymond Poincaré" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Pour rentrer il faut..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Sport */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'sport' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter un lieu de sport</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Gymnase Raymond Poincaré" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Pour rentrer il faut..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
                </div>
              )}

      {/* Formulaire de modification de lieu - Type Hôtel */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'hotel' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier l'hôtel</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
                <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'hôtel</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Hôtel de Ville" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'hôtel..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Hôtel */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'hotel' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter un hôtel</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
                <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'hôtel</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Hôtel de Ville" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'hôtel..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification de lieu - Type Restaurant */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'resto' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier le restaurant</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du restaurant</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Le Bistrot" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le restaurant..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Restaurant */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'resto' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter un restaurant</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du restaurant</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Le Bistrot" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le restaurant..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification de lieu - Type Défilé */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'défilé' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier le défilé</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Place Stanislas" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le défilé..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Défilé */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'défilé' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter un défilé</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Place Stanislas" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur le défilé..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
                <button className="modal-form-cancel" onClick={() => { setIsPlacingMarker(true); setIsAddingPlace(false); }}>Placer sur la carte</button>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification de lieu - Type Soirée */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'soirée' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier la soirée</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Salle des fêtes" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur la soirée..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
                </div>
              )}

      {/* Formulaire d'ajout de lieu - Type Soirée */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'soirée' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter une soirée</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Salle des fêtes" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur la soirée..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
                </div>
              )}

      {/* Formulaire de modification de lieu - Type Indication */}
      {isAddingPlace && editingVenue.id && selectedPlaceType === 'indication' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Modifier l'indication</h2>
              <button className="close-button" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'indication</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Point de soins" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'indication..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                  <option value="Issue de secours">Issue de secours ➜</option>
                  <option value="Reception Alumni">Reception Alumni 👨‍🎓</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleUpdateVenue()}>Mettre à jour</button>
                <button className="modal-form-cancel" onClick={() => { setIsAddingPlace(false); cancelEditingVenue(); }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de lieu - Type Indication */}
      {isAddingPlace && !editingVenue.id && selectedPlaceType === 'indication' && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>Ajouter une indication</h2>
              <button className="close-button" onClick={() => setIsAddingPlace(false)}>×</button>
            </div>
            <div className="modal-form-content">
              <div className="modal-form-group">
                <label htmlFor="venue-name">Nom de l'indication</label>
                <input id="venue-name" type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Ex: Point de soins" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-description">Description</label>
                <input id="venue-description" type="text" value={newVenueDescription} onChange={(e) => setNewVenueDescription(e.target.value)} placeholder="Ex: Informations sur l'indication..." enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input id="venue-address" type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy" enterKeyHint="done" onKeyDown={onModalSingleLineInputEnterKey} className="modal-form-input" />
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
                  <option value="Issue de secours">Issue de secours ➜</option>
                  <option value="Reception Alumni">Reception Alumni 👨‍🎓</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleAddVenue()}>Ajouter</button>
                <button className="modal-form-cancel" onClick={() => setIsAddingPlace(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CalendarPopup 
        isOpen={activeTab === 'calendar'} 
        onClose={handleCalendarClose}
        venues={venues}
        parties={parties}
        eventFilter={eventFilter}
        onViewOnMap={handleViewOnMap}
        delegationFilter={delegationFilter}
        venueFilter={venueFilter}
        showFemale={showFemale}
        showMale={showMale}
        showMixed={showMixed}
        isAdmin={isAdmin}
        onEventFilterChange={setEventFilterWithSave}
        onDelegationFilterChange={setDelegationFilterWithSave}
        onVenueFilterChange={setVenueFilterWithSave}
        onGenderFilterChange={(gender) => {
          if (gender === 'female') setShowFemaleWithSave(!showFemale);
          if (gender === 'male') setShowMaleWithSave(!showMale);
          if (gender === 'mixed') setShowMixedWithSave(!showMixed);
        }}
        onSetGenderFilters={(female, male, mixed) => {
          setShowFemaleWithSave(female);
          setShowMaleWithSave(male);
          setShowMixedWithSave(mixed);
        }}
        showFilters={showFilters}
        onShowFiltersChange={setShowFiltersWithSave}
        // Props pour le Header
        onChat={handleOpenChat}
        onEmergency={() => setShowEmergency(true)}
        onAdmin={handleAdminClick}
        showChat={showChat}
        unreadCount={unreadCount}
        onEditModeToggle={() => {
          setIsEditing(!isEditing);
          if (isEditing) {
            // Si on désactive le mode édition, on réinitialise les états liés à l'édition
            setIsAddingPlace(false);
            setEditingVenue({ id: null, venue: null });
            setTempMarker(null);
            setIsPlacingMarker(false);
          }
        }}
        isEditing={isEditing}
        onBack={() => {
          // Si le chat est ouvert, le fermer d'abord
          if (showChat) {
            setShowChat(false);
            return;
          }
          // Sinon, utiliser la logique normale
          handleBack();
        }}
        isBackDisabled={activeTab === 'map' || activeTab === 'info'}
        isVenuesLoading={isVenuesLoading}
      />

              {/* Modal d'édition du résultat de la soirée pompom */}
        {showEditResultModal && (
          <div className="modal-form-overlay">
            <div className="modal-form-container">
              <div className="modal-form-header">
                <h2>
                  {editingPartyResult.partyId === '2' ? 'Résultat du show pompom' : 
                   editingPartyResult.partyId === '3' ? 'Résultat du Showcase' : 
                   editingPartyResult.partyId === '4' ? 'Résultat du DJ Contest' : 
                   'Résultat de la soirée'}
                </h2>
                <button className="close-button" onClick={closeEditResultModal}>×</button>
              </div>
              <div className="modal-form-content">
                <div className="modal-form-group">
                  <label htmlFor="party-result">
                    Résultat de la soirée pompom
                    <span className="modal-form-field-hint">
                      Terminer : Entrée · nouvelle ligne : Maj+Entrée
                    </span>
                  </label>
                  <textarea 
                    id="party-result" 
                    value={editingResult} 
                    onChange={(e) => setEditingResult(e.target.value)} 
                    placeholder="Entrez le résultat de la soirée pompom..." 
                    enterKeyHint="done"
                    onKeyDown={onModalTextareaEnterKeyDone}
                    className="modal-form-input"
                    rows={4}
                  />
                </div>
                <div className="modal-form-actions">
                  <button 
                    className="modal-form-submit" 
                    onClick={handleSaveResultFromModal} 
                  >
                    Sauvegarder le résultat
                  </button>
                  <button className="modal-form-cancel" onClick={closeEditResultModal}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition de la description de la soirée */}
        {showEditDescriptionModal && (
          <div className="modal-form-overlay">
            <div className="modal-form-container">
              <div className="modal-form-header">
                <h2>
                  {editingPartyDescription.partyId === '2' ? 'Show pompom' : 
                   editingPartyDescription.partyId === '3' ? 'Showcase' : 
                   editingPartyDescription.partyId === '4' ? 'DJ Contest' : 
                   'Description de la soirée'}
                </h2>
                <button className="close-button" onClick={closeEditDescriptionModal}>×</button>
              </div>
              <div className="modal-form-content">
                <div className="modal-form-group">
                  <label htmlFor="party-description">
                    Description de la soirée
                    <span className="modal-form-field-hint">
                      Terminer : Entrée · nouvelle ligne : Maj+Entrée
                    </span>
                  </label>
                  <textarea 
                    id="party-description" 
                    value={editingDescription} 
                    onChange={(e) => setEditingDescription(e.target.value)} 
                    placeholder="Entrez la description de la soirée..." 
                    enterKeyHint="done"
                    onKeyDown={onModalTextareaEnterKeyDone}
                    className="modal-form-input"
                    rows={4}
                  />
                </div>
                <div className="modal-form-actions">
                  <button 
                    className="modal-form-submit" 
                    onClick={handleSaveDescriptionFromModal} 
                  >
                    Sauvegarder la description
                  </button>
                  <button className="modal-form-cancel" onClick={closeEditDescriptionModal}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition de la description de l'hôtel */}
        {showEditHotelDescriptionModal && (
          <div className="modal-form-overlay">
            <div className="modal-form-container">
              <div className="modal-form-header">
                <h2>Description de l'hôtel</h2>
                <button className="close-button" onClick={closeEditHotelDescriptionModal}>×</button>
              </div>
              <div className="modal-form-content">
                <div className="modal-form-group">
                  <label htmlFor="hotel-description">
                    Description de l&apos;hôtel
                    <span className="modal-form-field-hint">
                      Terminer : Entrée · nouvelle ligne : Maj+Entrée
                    </span>
                  </label>
                  <textarea 
                    id="hotel-description" 
                    value={editingHotelDescriptionText} 
                    onChange={(e) => setEditingHotelDescriptionText(e.target.value)} 
                    placeholder="Entrez la description de l'hôtel..." 
                    enterKeyHint="done"
                    onKeyDown={onModalTextareaEnterKeyDone}
                    className="modal-form-input"
                    rows={4}
                  />
                </div>
                <div className="modal-form-actions">
                  <button 
                    className="modal-form-submit" 
                    onClick={handleSaveHotelDescriptionFromModal} 
                  >
                    Sauvegarder la description
                  </button>
                  <button className="modal-form-cancel" onClick={closeEditHotelDescriptionModal}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition de la description du restaurant */}
        {showEditRestaurantDescriptionModal && (
          <div className="modal-form-overlay">
            <div className="modal-form-container">
              <div className="modal-form-header">
                <h2>Description du restaurant</h2>
                <button className="close-button" onClick={closeEditRestaurantDescriptionModal}>×</button>
              </div>
              <div className="modal-form-content">
                <div className="modal-form-group">
                  <label htmlFor="restaurant-description">
                    Description du restaurant
                    <span className="modal-form-field-hint">
                      Terminer : Entrée · nouvelle ligne : Maj+Entrée
                    </span>
                  </label>
                  <textarea 
                    id="restaurant-description" 
                    value={editingRestaurantDescriptionText} 
                    onChange={(e) => setEditingRestaurantDescriptionText(e.target.value)} 
                    placeholder="Entrez la description du restaurant..." 
                    enterKeyHint="done"
                    onKeyDown={onModalTextareaEnterKeyDone}
                    className="modal-form-input"
                    rows={4}
                  />
                </div>
                <div className="modal-form-actions">
                  <button 
                    className="modal-form-submit" 
                    onClick={handleSaveRestaurantDescriptionFromModal} 
                  >
                    Sauvegarder la description
                  </button>
                  <button className="modal-form-cancel" onClick={closeEditRestaurantDescriptionModal}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {activeTab === 'party-map' && <PartyMap parties={parties} />}

      {/* EventDetails Modal */}
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewOnMap={handleViewOnMapFromDetails}
          venues={venues}
        />
      )}

      <Outlet />
    </div>
  );
}

export default App;
