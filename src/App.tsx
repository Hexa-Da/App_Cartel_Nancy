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

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon, LatLng } from 'leaflet';
import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react';
import './App.css';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { database } from './firebase';
import L from 'leaflet';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import CalendarPopup from './components/CalendarPopup';
import { Venue, Match } from './types';
import { Outlet, useLocation} from 'react-router-dom';
import { useAppPanels, TabType } from './AppPanelsContext';
import NotificationService from './services/NotificationService';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Browser } from '@capacitor/browser';
import BusLines from './components/BusLines';
import './components/ModalForm.css';
import PartyMap from './pages/PartyMap';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'default-marker-icon'
});

let UserIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'user-location-icon' // Cette classe nous permettra de styliser l'icône
});

interface BaseItem {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  position: [number, number];
  date: string;
  emoji: string;
  sport: string;
}

interface Hotel extends BaseItem {
  type: 'hotel';
  telephone?: string;
  matches: Match[];
}

interface Restaurant extends BaseItem {
  type: 'restaurant';
  mealType: string; // 'midi' ou 'soir'
  matches: Match[];
}

interface Party extends BaseItem {
  type: 'party';
  result?: string;
}

type Place = Venue | Hotel | Party | Restaurant;

// Interface pour les actions d'historique
interface HistoryAction {
  type: 'ADD_VENUE' | 'UPDATE_VENUE' | 'DELETE_VENUE' | 'ADD_MATCH' | 'UPDATE_MATCH' | 'DELETE_MATCH';
  data: any;
  undo: () => Promise<void>;
}

// Initialiser Google Analytics correctement avec debugging
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXX';

// Configuration avec mode test activé pour la validation
ReactGA.initialize(GA_MEASUREMENT_ID, {
  testMode: process.env.NODE_ENV !== 'production',
  gaOptions: {
    sendPageView: false // Nous enverrons manuellement le pageview
  }
});

// Envoyer un événement test pour vérifier la connexion
ReactGA.event({
  category: 'testing',
  action: 'ga_test',
  label: 'Validation de connexion GA4'
});

// Créer un contexte pour la position
const LocationContext = createContext<{
  position: LatLng | null;
  isLocationEnabled: boolean;
}>({
  position: null,
  isLocationEnabled: true
});

// Composant pour la géolocalisation
function LocationMarker() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const map = useMap();
  const lastErrorTime = useRef<number>(0);
  const watchIdRef = useRef<string | number | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(() => {
    const stored = localStorage.getItem('location');
    return stored === null ? true : stored === 'true';
  });

  // Écouter les changements de l'état de localisation
  useEffect(() => {
    // Initialiser le service de notifications au démarrage
    const initNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des notifications:', error);
      }
    };
    
    initNotifications();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'location') {
        const newValue = e.newValue === 'true';
        setIsLocationEnabled(newValue);
        if (!newValue) {
          setPosition(null);
          setError(null);
        } else {
          requestLocation();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const requestLocation = async () => {
    if (!isLocationEnabled) return;

    try {
      setIsLoading(true);
      
      if (Capacitor.isNativePlatform()) {
        // Utiliser l'API Capacitor pour mobile
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        
        const newPosition = new LatLng(coordinates.coords.latitude, coordinates.coords.longitude);
        setPosition(newPosition);
        // Supprimer le flyTo automatique vers la position de l'utilisateur
        setError(null);
        setIsLoading(false);
      } else {
        // Utiliser l'API Web standard pour le navigateur
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
            setPosition(newPosition);
            // Supprimer le flyTo automatique vers la position de l'utilisateur
            setError(null);
            setIsLoading(false);
          },
          (error) => {
            handleLocationError(error);
            setIsLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    } catch (err: any) {
      handleLocationError(err);
      setIsLoading(false);
    }
  };

  const handleLocationError = (err: any) => {
    console.error('Erreur de géolocalisation:', err);
    const now = Date.now();
    if (now - lastErrorTime.current < 3000) return;
    lastErrorTime.current = now;

    let errorMessage = "Erreur de géolocalisation";
    if (err.message?.includes('permission') || err.code === 1) {
      errorMessage = "L'accès à la géolocalisation a été refusé. Veuillez autoriser l'accès dans les paramètres.";
    } else if (err.message?.includes('unavailable') || err.code === 2) {
      errorMessage = "La position n'est pas disponible. Vérifiez que la géolocalisation est activée.";
    } else if (err.message?.includes('timeout') || err.code === 3) {
      errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
    }
    setError(errorMessage);
  };

  useEffect(() => {
    if (!isLocationEnabled) {
      setPosition(null);
      setError(null);
      return;
    }

    requestLocation();

    // Surveiller la position
    if (Capacitor.isNativePlatform()) {
      // Utiliser l'API Capacitor pour mobile
      Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000
      }, (position: Position | null) => {
        if (position) {
          const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
          setPosition(newPosition);
          setError(null);
        }
      }).then((watchId) => {
        watchIdRef.current = watchId;
      });
    } else {
      // Utiliser l'API Web standard pour le navigateur
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
          setPosition(newPosition);
          setError(null);
        },
        (error) => {
          handleLocationError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      watchIdRef.current = watchId;
    }

    return () => {
      if (watchIdRef.current) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current as string });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
      }
    };
  }, [isLocationEnabled]);

  if (isLoading) {
    return (
      <div className="location-loading">
        <div className="location-loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="location-error">
        <p>{error}</p>
        <div className="location-error-buttons">
          <button 
            className="retry-button" 
            onClick={() => {
              setError(null);
              setIsLoading(true);
              requestLocation();
            }}
          >
            Réessayer
          </button>
          <button 
            className="retry-button" 
            onClick={() => {
              setError(null);
              setIsLocationEnabled(false);
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
    );
  }

  const handleRecenter = () => {
    if (position) {
      map.flyTo(position, 16, {
        duration: 1.5
      });
    } else {
      requestLocation();
    }
  };

  return (
    <>
      {position === null ? null : (
        <>
          <Marker position={position} icon={UserIcon} interactive={false}>
          </Marker>
          <button className="recenter-button" onClick={handleRecenter} title="Me localiser">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </button>
        </>
      )}
    </>
  );
}

// Composant pour gérer les clics sur la carte
function MapEvents({ onMapClick }: { onMapClick: (e: { latlng: { lat: number; lng: number } }) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

// Composant pour écouter les changements de zoom
function ZoomListener({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
    };
    
    // Écouter les événements de zoom
    map.on('zoomend', handleZoom);
    // Initialiser avec le zoom actuel
    handleZoom();
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  
  return null;
}

interface Message {
  id?: string; // id Firebase
  content: string;
  sender: string;
  timestamp: number;
  isAdmin: boolean;
}

// Interface pour le contexte Outlet
interface OutletContext {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isAddingPlace: boolean;
  setIsAddingPlace: (isAddingPlace: boolean) => void;
  newVenueName: string;
  setNewVenueName: (name: string) => void;
  newVenueDescription: string;
  setNewVenueDescription: (description: string) => void;
  newVenueAddress: string;
  setNewVenueAddress: (address: string) => void;
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  selectedEmoji: string;
  setSelectedEmoji: (emoji: string) => void;
  tempMarker: [number, number] | null;
  setTempMarker: (marker: [number, number] | null) => void;
  isPlacingMarker: boolean;
  setIsPlacingMarker: (isPlacing: boolean) => void;
  editingVenue: { id: string | null, venue: Venue | null };
  setEditingVenue: (editing: { id: string | null, venue: Venue | null }) => void;
  handleAddVenue: () => Promise<void>;
  handleUpdateVenue: () => Promise<void>;
  deleteVenue: (id: string) => Promise<void>;
  editingMatch: { venueId: string | null, match: Match | null };
  setEditingMatch: (editing: { venueId: string | null, match: Match | null }) => void;
  newMatch: { date: string, teams: string, description: string, endTime?: string, result?: string };
  setNewMatch: (match: { date: string, teams: string, description: string, endTime?: string, result?: string }) => void;
  handleAddMatch: (venueId: string) => Promise<void>;
  handleUpdateMatch: (venueId: string, matchId: string, updatedData: Partial<Match>) => Promise<void>;
  deleteMatch: (venueId: string, matchId: string) => Promise<void>;
  startEditingMatch: (venueId: string, match: Match | null) => void;
  finishEditingMatch: () => void;
}



import VSSForm from './components/VSSForm';

function App() {
  const { 
    activeTab, 
    setActiveTab, 
    showAddMessage, 
    setShowAddMessage, 
    showEmergency, 
    setShowEmergency, 
    closeAllPanels, 
    isEditing, 
    setIsEditing, 
    showChat, 
    setShowChat, 
    chatOriginTab, 
    setChatOriginTab,
    // États des formulaires
    showVSSForm,
    setShowVSSForm,
    showEditMatchModal,
    setShowEditMatchModal,
    showEditVenueModal,
    setShowEditVenueModal,
    showEditResultModal,
    setShowEditResultModal,
    showEditDescriptionModal,
    setShowEditDescriptionModal,
    showEditHotelDescriptionModal,
    setShowEditHotelDescriptionModal,
    showEditRestaurantDescriptionModal,
    setShowEditRestaurantDescriptionModal,
    showPlaceTypeModal,
    setShowPlaceTypeModal,
    selectedPlaceType,
    setSelectedPlaceType,
    isAddingPlace,
    setIsAddingPlace,
    isPlacingMarker,
    setIsPlacingMarker,
    // États du formulaire de lieu
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
    // États du formulaire de match
    editingMatch,
    setEditingMatch,
    newMatch,
    setNewMatch,
    selectedPartyForMap,
    setSelectedPartyForMap
  } = useAppPanels();
  const location = useLocation();

  // Ajoute la classe 'ios' au body si la plateforme est iOS
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    document.body.classList.add(platform);
    
    if (platform === 'ios') {
      // Détecter si on est dans un simulateur
      const isSimulator = window.navigator.userAgent.includes('Simulator') || 
                         window.navigator.userAgent.includes('iPhone Simulator') ||
                         window.navigator.userAgent.includes('iPad Simulator');
      
      if (isSimulator) {
        document.body.classList.add('ios-simulator');
      }
      // Désactiver le zoom sur iOS pour éviter les problèmes de double-tap
      document.addEventListener('touchstart', function(event) {
        // Ne pas bloquer les clics sur la barre de navigation
        if (event.target && (event.target as Element).closest('.bottom-nav')) {
          return;
        }
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      }, { passive: false });
      
      // Prévenir le zoom sur double-tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function(event) {
        // Ne pas bloquer les clics sur la barre de navigation
        if (event.target && (event.target as Element).closest('.bottom-nav')) {
          return;
        }
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
  }, []);

  // Pas de gestion JavaScript du clavier - utilisation CSS pure uniquement

  // Forcer l'orientation portrait au démarrage
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.lock({ orientation: 'portrait-primary' });
    }
  }, []);

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

  const [newMessage, setNewMessage] = useState('');
  const [newMessageSender, setNewMessageSender] = useState(''); 
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const indicationMarkersRef = useRef<L.Marker[]>([]);
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  // Refs pour accéder aux valeurs actuelles dans les handlers de popup
  const isAdminRef = useRef(isAdmin);
  const isEditingRef = useRef(isEditing);
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);
  
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<TabType>('map');
  const [appAction, setAppAction] = useState(0);
  
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
        console.error('Erreur lors du parsing du lieu sélectionné:', error);
        localStorage.removeItem('selectedVenue');
      }
    }
  }, [location.pathname, venues]); // Ajouter venues comme dépendance pour s'assurer que les marqueurs sont chargés

  useEffect(() => {
    if (location.pathname === '/map') {
      setActiveTab('map');
    }
  }, [location.pathname]);
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Vérification des droits admin depuis localStorage
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
    if (adminStatus) {
      setUser({ isAdmin: true });
    }
  }, []);

  // Écouter la connexion admin réussie pour rafraîchir l'application
  useEffect(() => {
    const handleAdminLoginSuccess = () => {
      // Forcer la mise à jour des marqueurs et de l'interface
      triggerMarkerUpdate();
      updateMapMarkers();
      // Recharger les marqueurs d'hôtels et restaurants
      createHotelAndRestaurantMarkers();
      // Mettre à jour l'état admin
      setIsAdmin(true);
      setUser({ isAdmin: true });
    };

    const handleAdminLogout = () => {
      // Forcer la mise à jour des marqueurs et de l'interface
      triggerMarkerUpdate();
      updateMapMarkers();
      // Recharger les marqueurs d'hôtels et restaurants
      createHotelAndRestaurantMarkers();
      // Mettre à jour l'état admin
      setIsAdmin(false);
      setUser(null);
    };

    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminLogout', handleAdminLogout);
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
      window.removeEventListener('adminLogout', handleAdminLogout);
    };
  }, []);

  // Lecture en temps réel des messages depuis Firebase
  useEffect(() => {
    const messagesRef = ref(database, 'chatMessages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Transforme l'objet en tableau [{id, ...}]
      const messagesArray = Object.entries(data).map(([id, value]) => ({ id, ...(value as any) }));
      
      // Trier les messages par timestamp décroissant (plus récents en premier)
      const sortedMessages = messagesArray.sort((a, b) => b.timestamp - a.timestamp);
      
      // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
      if (!localStorage.getItem('lastSeenChatTimestamp')) {
        const now = Date.now();
        localStorage.setItem('lastSeenChatTimestamp', String(now));
      }
      
      setMessages(sortedMessages);
    });
    return () => unsubscribe();
  }, []);

  // Ajout d'un message dans Firebase (avec nom personnalisé)
  const handleAddMessage = async (msg: string, sender: string) => {
    const newMsgRef = push(ref(database, 'chatMessages'));
    await set(newMsgRef, {
      content: msg,
      sender: sender || 'Organisation',
      timestamp: Date.now(),
      isAdmin: true
    });

    const notificationService = NotificationService.getInstance();
    await notificationService.notifyChatMessage(msg, sender);
  };

  // Modification d'un message dans Firebase (texte et nom)
  const handleEditMessage = (id: string, newContent: string, newSender: string) => {
    update(ref(database, `chatMessages/${id}`), { content: newContent, sender: newSender});
  };

  // Suppression d'un message dans Firebase
  const handleDeleteMessage = (id: string) => {
    remove(ref(database, `chatMessages/${id}`));
  };

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

  // Fonction pour vérifier les droits d'administration avant d'exécuter une action
  const checkAdminRights = () => {
    if (!isAdmin) {
      alert('Cette action nécessite des droits d\'administrateur.');
      return false;
    }
    return true;
  };

  const [hotels, setHotels] = useState<Hotel[]>(() => {
    // Les descriptions seront chargées depuis Firebase via les listeners
    return [
      {
        id: '1',
        name: "Ibis Styles Nancy Sud",
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
      }
    ];
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    // Les descriptions seront chargées depuis Firebase via les listeners
    return [
      {
        id: '1',
        name: "Crous ARTEM",
        position: [48.673570, 6.169268],
        description: "Repas du soir",
        address: "Rue Michel Dinet, 54000 Nancy",
        type: 'restaurant',
        date: '',
        latitude: 48.673570,
        longitude: 6.169268,
        emoji: '🍽️',
        sport: 'Restaurant',
        mealType: 'soir',
        matches: []
      },
      {
        id: '2',
        name: "Parc Saint-Marie",
        position: [48.680449, 6.170722],
        description: "Repas du midi",
        address: "1 Av. Boffrand, 54000 Nancy",
        type: 'restaurant',
        date: '',
        latitude: 48.680449,
        longitude: 6.170722,
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
        id: '1',
        name: "Place Stanislas",
        position: [48.693524, 6.183270],
        description: "Rendez vous 12h puis départ du Défilé à 13h",
        address: "Pl. Stanislas, 54000 Nancy",
        type: 'party',
        date: '2026-04-16T12:00:00',
        latitude: 48.693524,
        longitude: 6.183270,
        emoji: '🎺',
        sport: 'Defile'
      },
      {
        id: '2',
        name: "Parc Expo",
        position: [48.663030, 6.191597],
        description: "Soirée Pompoms du 16 avril, 21h-3h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        type: 'party',
        date: '2026-04-16T21:00:00',
        latitude: 48.663030,
        longitude: 6.191597,
        emoji: '🎀',
        sport: 'Pompom',
        result: 'à venir'
      },
      {
        id: '3',
        name: "Parc Expo",
        position: [48.663481, 6.189737],
        description: "Soirée Showcase 17 avril, 20h-4h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        type: 'party',
        date: '2026-04-17T20:00:00',
        latitude: 48.663481,
        longitude: 6.189737,
        emoji: '🎤',
        sport: 'Party',
        result: 'à venir'
      },
      {
        id: '4',
        name: "Zénith",
        position: [48.710136, 6.139169],
        description: "Soirée DJ Contest 18 avril, 20h-4h",
        address: "Rue du Zénith, 54320 Maxéville",
        type: 'party',
        date: '2026-04-18T20:00:00',
        latitude: 48.710136,
        longitude: 6.139169,
        emoji: '🎧',
        sport: 'Party'
      }
    ];
  });

  const [isVenuesLoading, setIsVenuesLoading] = useState(true);

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

  // Charger les lieux depuis Firebase au démarrage avec optimisation
  useEffect(() => {
    setIsVenuesLoading(true);
    const venuesRef = ref(database, 'venues');
    const unsubscribe = onValue(venuesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Utiliser requestIdleCallback pour différer le traitement lourd
        const processData = () => {
          const venuesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
            ...value,
            id: key,
            matches: value.matches || [],  // Assurer que matches est toujours un tableau
            sport: value.sport || '',
            date: value.date || '',
            latitude: value.position ? value.position[0] : 0,
            longitude: value.position ? value.position[1] : 0,
            emoji: value.emoji || ''
          }));
          setVenues(venuesArray);
          setIsVenuesLoading(false);
        };

        // Utiliser requestIdleCallback si disponible, sinon setTimeout
        if (window.requestIdleCallback) {
          window.requestIdleCallback(processData, { timeout: 100 });
        } else {
          setTimeout(processData, 0);
        }
      } else {
        setVenues([]); // Si pas de données, initialiser avec un tableau vide
        setIsVenuesLoading(false);
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [editingPartyResult, setEditingPartyResult] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [editingResult, setEditingResult] = useState('');
  const [editingPartyDescription, setEditingPartyDescription] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [editingDescription, setEditingDescription] = useState('');
  const [editingHotelDescription, setEditingHotelDescription] = useState<{hotelId: string | null, isEditing: boolean}>({ hotelId: null, isEditing: false });
  const [editingHotelDescriptionText, setEditingHotelDescriptionText] = useState('');
  const [editingRestaurantDescription, setEditingRestaurantDescription] = useState<{restaurantId: string | null, isEditing: boolean}>({ restaurantId: null, isEditing: false });
  const [editingRestaurantDescriptionText, setEditingRestaurantDescriptionText] = useState('');
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState('osm');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventFilter, setEventFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapEventFilter');
    return saved || 'all';
  });
  const [delegationFilter, setDelegationFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapDelegationFilter');
    return saved || 'all';
  });
  const [venueFilter, setVenueFilter] = useState<string>(() => {
    const saved = localStorage.getItem('mapVenueFilter');
    return saved || 'Tous';
  });
  const [showFemale, setShowFemale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowFemale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showMale, setShowMale] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMale');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showMixed, setShowMixed] = useState<boolean>(() => {
    const saved = localStorage.getItem('mapShowMixed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [fromEvents, setFromEvents] = useState(false);
  const [isStarFilterActive, setIsStarFilterActive] = useState(() => {
    const saved = localStorage.getItem('starFilterActive');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // État pour l'historique des actions et l'index actuel
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('favorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });

  // Déplacer la définition de triggerMarkerUpdate ici, avant son utilisation
  const triggerMarkerUpdate = () => {
    setAppAction(prev => prev + 1);
    if (mapRef.current) {
      updateMapMarkers();
    }
  };

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

  // Écouter les changements de l'état de l'étoile dans le localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'starFilterActive') {
        const newValue = e.newValue === 'true';
        setIsStarFilterActive(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Effet pour détecter les changements de filtres et mettre à jour l'état de l'étoile
  useEffect(() => {
    // Vérifier si les filtres actuels correspondent aux préférences
    const preferredSportRaw = localStorage.getItem('preferredSport') || 'all';
    let preferredSport;
    try {
      const parsed = JSON.parse(preferredSportRaw);
      preferredSport = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredSport = preferredSportRaw;
    }
    const preferredDelegation = localStorage.getItem('preferredDelegation') || 'all';
    const preferredChampionshipRaw = localStorage.getItem('preferredChampionship') || 'none';
    let preferredChampionship;
    try {
      const parsed = JSON.parse(preferredChampionshipRaw);
      preferredChampionship = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredChampionship = preferredChampionshipRaw;
    }

    // Vérifier si les filtres correspondent aux préférences
    const sportMatches = eventFilter === (preferredSport === 'none' ? 'match' : preferredSport);
    const delegationMatches = delegationFilter === preferredDelegation;
    const genderMatches = preferredChampionship === 'none' ? 
      (showFemale && showMale && showMixed) :
      (preferredChampionship === 'female' ? showFemale && !showMale && !showMixed :
       preferredChampionship === 'male' ? !showFemale && showMale && !showMixed :
       preferredChampionship === 'mixed' ? !showFemale && !showMale && showMixed : false);

    const shouldBeActive = sportMatches && delegationMatches && genderMatches;
    
    if (shouldBeActive !== isStarFilterActive) {
      setIsStarFilterActive(shouldBeActive);
      localStorage.setItem('starFilterActive', JSON.stringify(shouldBeActive));
    }
  }, [eventFilter, delegationFilter, showFemale, showMale, showMixed, isStarFilterActive]);

  const mapStyles = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    cyclosm: {
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    humanitarian: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    osmfr: {
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  };

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
  };

  // Fonction pour géocoder une adresse avec Nominatim
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      return null;
    }
  };

  const getMarkerColor = (date: string) => {
    const matchDate = new Date(date);
    const now = new Date();
    const diffTime = matchDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 0) return { color: '#808080', rotation: '0deg' }; // Gris pour les matchs passés
    if (diffHours <= 1) return { color: '#FF0000', rotation: '0deg' }; // Rouge pour les matchs dans moins d'1h
    if (diffHours <= 3) return { color: '#FF4500', rotation: '45deg' }; // Orange foncé pour les matchs dans 1-3h
    if (diffHours <= 6) return { color: '#FFA500', rotation: '90deg' }; // Orange pour les matchs dans 3-6h
    if (diffHours <= 12) return { color: '#FFD700', rotation: '135deg' }; // Jaune pour les matchs dans 6-12h
    return { color: '#4CAF50', rotation: '180deg' }; // Vert pour les matchs plus éloignés
  };

  // Modifier la fonction getSportIcon pour utiliser des emojis
  const getSportIcon = (sport: string) => {
    const sportIcons: { [key: string]: string } = {
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
    };
    return sportIcons[sport] || '🏆';
  };

  // Charger les descriptions et résultats depuis Firebase au démarrage
  useEffect(() => {
    let unsubscribeFunctions: (() => void)[] = [];
    let loadedCount = 0;
    const totalSources = 4; // partyResults, hotelDescriptions, restaurantDescriptions, partyDescriptions
    
    // Fonction pour vérifier si toutes les données sont chargées et mettre à jour l'état
    const checkAllDataLoaded = () => {
      loadedCount++;
      if (loadedCount === totalSources) {
        updateLocalStateFromFirebase();
      }
    };
    
    // Charger les résultats des soirées
    const unsubscribePartyResults = loadFromFirebase('editableData/partyResults', (data) => {
      if (data) {
        // Mettre à jour directement l'état React depuis Firebase
        if (data['parc-expo-pompoms'] && data['parc-expo-pompoms'].result) {
          setParties((prevParties: Party[]) => 
            prevParties.map((party: Party) => 
              party.id === '2' ? { ...party, result: data['parc-expo-pompoms'].result } : party
            )
          );
        }
        if (data['parc-expo-showcase'] && data['parc-expo-showcase'].result) {
          setParties((prevParties: Party[]) => 
            prevParties.map((party: Party) => 
              party.id === '3' ? { ...party, result: data['parc-expo-showcase'].result } : party
            )
          );
        }
        if (data['zenith-dj-contest'] && data['zenith-dj-contest'].result) {
          setParties((prevParties: Party[]) => 
            prevParties.map((party: Party) => 
              party.id === '4' ? { ...party, result: data['zenith-dj-contest'].result } : party
            )
          );
        }
      }
      checkAllDataLoaded();
    });

    // Charger les descriptions des hôtels
    const unsubscribeHotelDescriptions = loadFromFirebase('editableData/hotelDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([hotelId, hotelData]: [string, any]) => {
          if (hotelData.description) {
            // Mettre à jour directement l'état React depuis Firebase
            setHotels((prevHotels: Hotel[]) => 
              prevHotels.map((hotel: Hotel) => 
                hotel.id === hotelId ? { ...hotel, description: hotelData.description } : hotel
              )
            );
            // Mettre à jour les marqueurs après la modification
            createHotelAndRestaurantMarkers();
          }
        });
        checkAllDataLoaded();
      } else {
        // Appeler même si data est null pour compter comme chargé
        checkAllDataLoaded();
      }
    });

    // Charger les descriptions des restaurants
    const unsubscribeRestaurantDescriptions = loadFromFirebase('editableData/restaurantDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([restaurantId, restaurantData]: [string, any]) => {
          if (restaurantData.description) {
            // Mettre à jour directement l'état React depuis Firebase
            // Les marqueurs seront recréés automatiquement par le useEffect qui surveille les changements de descriptions
            setRestaurants((prevRestaurants: Restaurant[]) => 
              prevRestaurants.map((restaurant: Restaurant) => 
                restaurant.id === restaurantId ? { ...restaurant, description: restaurantData.description } : restaurant
              )
            );
          }
        });
        checkAllDataLoaded();
      } else {
        // Appeler même si data est null pour compter comme chargé
        checkAllDataLoaded();
      }
    });

    // Charger les descriptions des soirées
    const unsubscribePartyDescriptions = loadFromFirebase('editableData/partyDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([partyId, partyData]: [string, any]) => {
          if (partyData.description) {
            // Mettre à jour directement l'état React depuis Firebase
            setParties((prevParties: Party[]) => 
              prevParties.map((party: Party) => 
                party.id === partyId ? { ...party, description: partyData.description } : party
              )
            );
          }
        });
      }
      checkAllDataLoaded();
    });

    // Ajouter seulement les fonctions unsubscribe valides
    if (unsubscribePartyResults) unsubscribeFunctions.push(unsubscribePartyResults);
    if (unsubscribeHotelDescriptions) unsubscribeFunctions.push(unsubscribeHotelDescriptions);
    if (unsubscribeRestaurantDescriptions) unsubscribeFunctions.push(unsubscribeRestaurantDescriptions);
    if (unsubscribePartyDescriptions) unsubscribeFunctions.push(unsubscribePartyDescriptions);

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
      initializeEditableDataBranch();
    }
  }, [isAdmin]);

  // Mettre à jour l'état local au démarrage avec les données du localStorage
  useEffect(() => {
    // Mettre à jour l'état local avec les données existantes
    updateLocalStateFromFirebase();
  }, []);

  // Fonction pour ajouter une action à l'historique
  const addToHistory = (action: HistoryAction) => {
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

  // Fonction utilitaire pour mettre à jour le timestamp de dernière lecture
  const updateLastSeenTimestamp = () => {
    if (messages.length > 0) {
      const mostRecentMsg = messages[0];
      const newTimestamp = mostRecentMsg.timestamp;
      localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
    }
  };

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
      updateMapMarkers();
      triggerMarkerUpdate(); 
      
      const venueId = newVenueRef.key || '';
      addToHistory({
        type: 'ADD_VENUE',
        data: { ...newVenue, id: venueId },
        undo: async () => {
          const undoRef = ref(database, `venues/${venueId}`);
          await set(undoRef, null);
        }
      });
      
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
      triggerMarkerUpdate();
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
      const venueRef = ref(database, `venues/${id}`);
      await set(venueRef, null);
      updateMapMarkers();
      triggerMarkerUpdate(); 
      
      // Ajouter l'action à l'historique avec une fonction d'annulation
      addToHistory({
        type: 'DELETE_VENUE',
        data: venue,
        undo: async () => {
          const undoRef = ref(database, `venues/${id}`);
          await set(undoRef, {
            name: venue.name,
            position: [venue.latitude, venue.longitude],
            description: venue.description,
            address: venue.address,
            matches: venue.matches || [],
            sport: venue.sport,
            date: venue.date,
            latitude: venue.latitude,
            longitude: venue.longitude,
            emoji: venue.emoji
          });
        }
      });
      
    setSelectedVenue(null);
    }
  };

  // Fonction pour ajouter un nouveau match
  const handleAddMatch = async (venueId: string) => {
    if (!checkAdminRights()) return;

    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;

    const matchId = uuidv4();
    const match: Match = {
      id: matchId,
      name: `${venue.name} - Match`,
      description: newMatch.description || '',
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      position: [venue.latitude, venue.longitude],
      date: newMatch.date || '',
      type: 'match',
      teams: newMatch.teams || '',
      sport: venue.sport,
      time: newMatch.date ? new Date(newMatch.date).toTimeString().split(' ')[0] : '',
      endTime: newMatch.endTime || '',
      result: newMatch.result || '',
      venueId: venue.id,
      emoji: venue.emoji
    };

    try {
      const venueRef = ref(database, `venues/${venueId}`);
      const updatedMatches = [...(venue.matches || []), match];
      
      await set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
      triggerMarkerUpdate(); 
      updateMapMarkers();
      
      // Ajouter l'action à l'historique
      addToHistory({
        type: 'ADD_MATCH',
        data: { venueId, match },
        undo: async () => {
          const undoRef = ref(database, `venues/${venueId}`);
          await set(undoRef, {
            ...venue,
            matches: venue.matches || []
          });
        }
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
      console.error('Erreur lors de l\'ajout du match:', error);
      alert('Une erreur est survenue lors de l\'ajout du match.');
    }
  };

  // Fonction pour mettre à jour un match
  const handleUpdateMatch = async (venueId: string, matchId: string, updatedData: Partial<Match>) => {
    if (!checkAdminRights()) return;
    
    const venueRef = ref(database, `venues/${venueId}`);
    const venue = venues.find(v => v.id === venueId);
    
    if (venue) {
      const venueBefore = { ...venue };
      const matchBefore = venue.matches.find(m => m.id === matchId);
      
      const updatedMatches = venue.matches.map(match =>
        match.id === matchId ? { 
          ...match, 
          ...updatedData,
          endTime: updatedData.endTime || '' // Permettre une chaîne vide pour endTime
        } : match
      );
      
      try {
        await set(venueRef, {
          ...venue,
          matches: updatedMatches
        });
        triggerMarkerUpdate(); 
        updateMapMarkers();
        
        if (matchBefore) {
          addToHistory({
            type: 'UPDATE_MATCH',
            data: { venueId, matchId, before: matchBefore, after: { ...matchBefore, ...updatedData } },
            undo: async () => {
              const undoRef = ref(database, `venues/${venueId}`);
              await set(undoRef, venueBefore);
            }
          });
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
        console.error('Erreur lors de la mise à jour du match:', error);
        alert('Une erreur est survenue lors de la mise à jour du match.');
      }
    }
  };

  // Fonction pour supprimer un match
  const deleteMatch = async (venueId: string, matchId: string) => {
    if (!checkAdminRights()) return;

    // Demander confirmation avant la suppression
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible.')) {
      return;
    }
    
    const venueRef = ref(database, `venues/${venueId}`);
    const venue = venues.find(v => v.id === venueId);
    
    if (venue) {
      // Sauvegarder l'état avant suppression pour pouvoir annuler
      const venueBefore = { ...venue };
      const matchToDelete = venue.matches.find(m => m.id === matchId);
      
      const updatedMatches = venue.matches.filter(match => match.id !== matchId);
      await set(venueRef, {
        ...venue,
        matches: updatedMatches
      });
      triggerMarkerUpdate(); 
      updateMapMarkers();
      
      // Ajouter l'action à l'historique avec une fonction d'annulation
      if (matchToDelete) {
        addToHistory({
          type: 'DELETE_MATCH',
          data: { venueId, match: matchToDelete },
          undo: async () => {
            const undoRef = ref(database, `venues/${venueId}`);
            await set(undoRef, venueBefore);
          }
        });
      }
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
        const venueRef = ref(database, `venues/${editingVenue.id}`);
        
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
          await set(venueRef, updatedVenue);
          triggerMarkerUpdate(); 
          updateMapMarkers();
          
          // Ajouter l'action à l'historique avec une fonction d'annulation
          addToHistory({
            type: 'UPDATE_VENUE',
            data: { before: venueBefore, after: updatedVenue },
            undo: async () => {
              const undoRef = ref(database, `venues/${editingVenue.id}`);
              await set(undoRef, venueBefore);
            }
          });
          
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
          console.error('Erreur lors de la mise à jour du lieu:', error);
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
    } else if (venue.type === 'venue' || !venue.type) {
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
    triggerMarkerUpdate();
  };

  // Fonction pour vérifier si un match est passé
  const isMatchPassed = (startDate: string, endTime?: string, type: 'match' | 'party' = 'match') => {
    // Simulation de la date du 25/04 à 16h
    const now = new Date();
    const start = new Date(startDate);
    
    // Si l'événement est dans le futur, il n'est pas passé
    if (start > now) {
      return false;
    }
    
    // Si une heure de fin est spécifiée, l'utiliser
    if (endTime) {
      const end = new Date(endTime);
      return end < now;
    }
    
    // Pour les soirées sans heure de fin, on considère qu'elles se terminent à 23h
    if (type === 'party') {
      const end = new Date(startDate);
      end.setHours(23, 0, 0, 0);
      return end < now;
    }
    
    // Pour les matchs sans heure de fin, on considère qu'ils durent 1h
    const end = new Date(startDate);
    end.setHours(end.getHours() + 1);
    return end < now;
  };

  // Fonction optimisée pour récupérer tous les événements (matchs et soirées)
  const getAllEvents = useMemo(() => {
    const events: Array<{
      id: string;
      name: string;
      date: string;
      endTime?: string;
      description: string;
      address: string;
      location: [number, number];
      type: 'match' | 'party';
      teams?: string;
      venue?: string;
      venueId?: string;
      isPassed: boolean;
      sport?: string;
      result?: string;
    }> = [];

    // Ajouter les matchs
    venues.forEach(venue => {
      if (venue.matches && venue.matches.length > 0) {
        venue.matches.forEach(match => {
          events.push({
            id: `match-${venue.id}-${match.id}`,
            name: match.teams,
            date: match.date,
            endTime: match.endTime,
            description: match.description,
            address: venue.address || `${venue.latitude}, ${venue.longitude}`,
            location: [venue.latitude, venue.longitude],
            type: 'match',
            teams: match.teams,
            venue: venue.name,
            venueId: venue.id,
            isPassed: isMatchPassed(match.date, match.endTime, 'match'),
            sport: venue.sport,
            result: match.result
          });
        });
      }
    });

    // Ajouter les soirées (seulement pour les admins)
    if (isAdmin) {
      parties.forEach(party => {
        // Calculer l'heure de fin par défaut (6h après le début)
        const startDate = new Date(party.date);
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 6);
        
        events.push({
          id: `party-${party.id || party.name}`,
          name: party.name,
          date: party.date,
          endTime: endDate.toISOString(), // Ajouter l'heure de fin calculée
          description: party.description,
          address: party.address || `${party.latitude}, ${party.longitude}`,
          location: [party.latitude, party.longitude],
          type: 'party',
          isPassed: isMatchPassed(party.date, endDate.toISOString(), 'party'),
          sport: party.sport
        });
      });
    }

    // Trier par date (du plus récent au plus ancien)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [venues, parties]);

  // Fonction optimisée pour filtrer les événements
  const getFilteredEvents = useMemo(() => {
    const allEvents = getAllEvents;
    
    return allEvents.filter(event => {
      // Filtre par type d'événement
      const typeMatch = eventFilter === 'all' || 
        (eventFilter === 'none' ? false :
          (eventFilter === 'party' && event.type === 'party' && isAdmin) ||
          (eventFilter === 'match' && event.type === 'match') ||
          (event.type === 'match' && event.sport === eventFilter && eventFilter !== 'match'));

      // Filtre par délégation
      const delegationMatch = event.type === 'party' 
  ? true 
  : (delegationFilter === 'all' || (event.teams && event.teams.toLowerCase().includes(delegationFilter.toLowerCase())));

      // Filtre par lieu
      let venueMatch = true;
      if (venueFilter !== 'Tous') {
        if (event.type === 'party') {
          // Les parties ne sont visibles que pour les admins
          if (!isAdmin) {
            venueMatch = false;
          } else {
            let partyId = '';
            switch (event.name) {
              case 'Place Stanislas':
                partyId = 'place-stanislas';
                break;
              case 'Parc Expo':
                partyId = 'parc-expo';
                break;
              case 'Zénith':
                partyId = 'zenith';
                break;
              default:
                partyId = event.name.toLowerCase().replace(/\s+/g, '-');
            }
            venueMatch = partyId === venueFilter;
          }
        } else {
          venueMatch = event.venueId === venueFilter;
        }
      }

      // Filtre par genre
      const isFemale = event.description?.toLowerCase().includes('féminin');
      const isMale = event.description?.toLowerCase().includes('masculin');
      const isMixed = event.description?.toLowerCase().includes('mixte');
      const genderMatch = (!isFemale && !isMale && !isMixed) || 
        (isFemale && showFemale) || 
        (isMale && showMale) ||
        (isMixed && showMixed);

      return typeMatch && delegationMatch && venueMatch && genderMatch;
    });
  }, [getAllEvents, eventFilter, delegationFilter, venueFilter, showFemale, showMale, showMixed]);

  // Fonction pour formater la date et l'heure
  const formatDateTime = (dateString: string, endTimeString?: string) => {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const day = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (endTimeString) {
      const endTime = new Date(endTimeString);
      const endHours = endTime.getHours().toString().padStart(2, '0');
      const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
      return `${day} ${hours}:${minutes} - ${endHours}:${endMinutes}`;
    }
    
    return `${day} ${hours}:${minutes}`;
  };

  // Fonction pour ouvrir dans Google Maps
  const openInGoogleMaps = async (place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    
    if (Capacitor.isNativePlatform()) {
      // Sur mobile natif, utiliser le plugin Capacitor Browser
      try {
        await Browser.open({ url });
      } catch (error) {
        console.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
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

  const handleDontAskAgain = () => {
    setShowLocationPrompt(false);
    setLocationError(null);
  };

  const retryLocation = () => {
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      { enableHighAccuracy: true }
    );
  };

  // Fonction pour copier au presse-papier
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Adresse copiée dans le presse-papier !');
    }).catch(err => {
      console.error('Erreur lors de la copie :', err);
      alert('Erreur lors de la copie de l\'adresse');
    });
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
            match.teams.toLowerCase().includes(delegationFilter.toLowerCase())
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
          const indicationEmoji = venueAny.indicationType ? indicationTypeEmojis[venueAny.indicationType as keyof typeof indicationTypeEmojis] || venue.emoji : venue.emoji;
          markerHtml = `<div class="marker-content indication-marker" style="background-color: white; color: #333; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #333; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                         <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${indicationEmoji}</span>
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
            <p><strong>Type:</strong> ${venueAny.indicationType || 'Indication'}</p>
          `;
        } else {
        popupContent.innerHTML = `
          <h3>${venue.name}</h3>
          <p>${venue.description}</p>
          <p><strong>Sport:</strong> ${venue.sport}</p>
          <p class="venue-address">${venue.address || `${venue.latitude}, ${venue.longitude}`}</p>
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
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copier l\'adresse';
        copyButton.addEventListener('click', () => {
          copyToClipboard(venue.address || `${venue.latitude},${venue.longitude}`);
        });
        buttonsContainer.appendChild(copyButton);
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
          matchesScrollContainer.style.maxHeight = '200px';
          matchesScrollContainer.style.overflowY = 'auto';
          const style = document.createElement('style');
          style.textContent = `
            .match-passed { 
              background-color: rgba(255, 255, 255, 0.05); 
              opacity: 0.7;
            }
            .match-passed p { 
              opacity: 0.7; 
              color: var(--text-color); 
            }
            .match-passed .match-result { 
              opacity: 0.7; 
              font-weight: bold; 
              color: var(--text-color); 
            }
            .match-passed .match-date { 
              opacity: 0.7; 
              color: var(--danger-color) !important; 
            }
            .match-passed .match-teams { 
              opacity: 0.7; 
              color: var(--text-color) !important; 
            }
            .match-passed .match-description { 
              opacity: 0.7; 
              color: var(--warning-color) !important; 
            }
            .match-passed .match-result { 
              opacity: 0.7; 
              color: var(--success-color) !important; 
            }
           
            
            /* Styles pour les couleurs des matchs dans les popups Leaflet */
            .leaflet-popup .match-date { color: var(--danger-color) !important; }
            .leaflet-popup .match-teams { color: var(--text-color) !important; }
            .leaflet-popup .match-description { color: var(--warning-color) !important; }
            .leaflet-popup .match-result { color: var(--success-color) !important; }
            .leaflet-popup .match-item { border-left: none !important; }
          `;
          document.head.appendChild(style);
          sortedMatches.forEach(match => {
            const matchItemDiv = document.createElement('div');
            matchItemDiv.className = `match-item ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`;
            matchItemDiv.innerHTML = `
              <p class="match-date">${formatDateTime(match.date, match.endTime)}</p>
              <p class="match-teams">${match.teams}</p>
              <p class="match-description">${match.description}</p>
              ${match.result ? `<p class="match-result"><strong>Résultat :</strong> ${match.result}</p>` : ''}
            `;
            if (isEditing && isAdmin) {
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
        if (isEditing && isAdmin) {
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
        marker.bindPopup(popupContent);
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
    if (isAdmin) {
      parties.forEach(party => {
        // Calculer l'ID du lieu pour la correspondance avec le filtre
        let partyVenueId = '';
        switch (party.name) {
          case 'Place Stanislas':
            partyVenueId = 'place-stanislas';
            break;
          case 'Parc Expo':
            partyVenueId = 'parc-expo';
            break;
          case 'Zénith':
            partyVenueId = 'zenith';
            break;
          default:
            partyVenueId = party.name.toLowerCase().replace(/\s+/g, '-');
        }

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
          <p class="venue-address">${party.address}</p>
          ${party.sport !== 'Defile' ? `<div class="party-result"><h4 style="color: var(--success-color); margin-top: 10px;">Résultat : ${party.result || 'à venir'}</h4></div>` : ''}
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
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copier l\'adresse';
        copyButton.addEventListener('click', () => {
          copyToClipboard(party.address || `${party.latitude},${party.longitude}`);
        });
        buttonsContainer.appendChild(copyButton);
        
        // Bouton pour voir la map des lieux de soirée (après "Copier l'adresse")
        if (party.name !== 'Place Stanislas') {
          const partyMapButton = document.createElement('button');
          partyMapButton.className = 'party-map-button';
          partyMapButton.textContent = 'Voir la carte des lieux';
          partyMapButton.style.cssText = 'background-color: #5dabae; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600; font-size: clamp(0.8rem, 3vw, 0.9rem); transition: all 0.3s ease;';
          partyMapButton.addEventListener('click', () => {
            setSelectedPartyForMap(party.name);
            setActiveTab('party-map');
          });
          buttonsContainer.appendChild(partyMapButton);
        }
        
        // Ajouter le bouton d'édition du résultat pour les admins (soirées pompom, Showcase et DJ Contest) seulement si le mode édition est activé
        if (isAdmin && isEditing && ((party.name === 'Parc Expo' || party.name === 'Zénith') && (party.description.includes('DJ Contest') || party.description.toLowerCase().includes('pompom') || party.description.toLowerCase().includes('showcase')))) {
          const editResultButton = document.createElement('button');
          editResultButton.className = 'edit-result-button';
          editResultButton.textContent = 'Modifier le résultat';
          editResultButton.style.cssText = 'background-color: #FF8C00; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
          editResultButton.addEventListener('click', () => {
            // Ouvrir le formulaire modal pour éditer le résultat
            openEditResultModal(party.id, party.result || 'à venir');
          });
          popupContent.appendChild(editResultButton);
        }
        
        // Ajouter le bouton d'édition de la description pour les admins (tous les événements party) seulement si le mode édition est activé
        if (isAdmin && isEditing) {
          const editDescriptionButton = document.createElement('button');
          editDescriptionButton.className = 'edit-description-button';
          editDescriptionButton.textContent = 'Modifier la description';
          editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
          editDescriptionButton.addEventListener('click', () => {
            // Utiliser directement la description de l'état React (synchronisé avec Firebase)
            const currentDescription = party.description || '';
            openEditDescriptionModal(party.id, currentDescription);
          });
          popupContent.appendChild(editDescriptionButton);
        }
        
        popupContent.appendChild(buttonsContainer);
        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
          const currentParty = parties.find(p => p.id === party.id) || party;
          
          // Mettre à jour le contenu HTML
          popupContent.innerHTML = `
            <h3>${currentParty.name}</h3>
            <p>${currentParty.description}</p>
            <p class="venue-address">${currentParty.address}</p>
            ${currentParty.sport !== 'Defile' ? `<div class="party-result"><h4 style="color: var(--success-color); margin-top: 10px;">Résultat : ${currentParty.result || 'à venir'}</h4></div>` : ''}
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
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(currentParty.address || `${currentParty.latitude},${currentParty.longitude}`);
          });
          buttonsContainerNew.appendChild(copyButton);
          
          // Bouton pour voir la map des lieux de soirée (après "Copier l'adresse")
          if (currentParty.name !== 'Place Stanislas') {
            const partyMapButton = document.createElement('button');
            partyMapButton.className = 'party-map-button';
            partyMapButton.textContent = 'Voir la carte des lieux';
            partyMapButton.style.cssText = 'background-color: #5dabae; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600; font-size: clamp(0.8rem, 3vw, 0.9rem); transition: all 0.3s ease;';
            partyMapButton.addEventListener('click', () => {
              setSelectedPartyForMap(currentParty.name);
              setActiveTab('party-map');
            });
            buttonsContainerNew.appendChild(partyMapButton);
          }
          
          // Réajouter les boutons admin si nécessaire
          if (isAdmin && isEditing && ((currentParty.name === 'Parc Expo' || currentParty.name === 'Zénith') && (currentParty.description.includes('DJ Contest') || currentParty.description.toLowerCase().includes('pompom') || currentParty.description.toLowerCase().includes('showcase')))) {
            const editResultButton = document.createElement('button');
            editResultButton.className = 'edit-result-button';
            editResultButton.textContent = 'Modifier le résultat';
            editResultButton.style.cssText = 'background-color: #FF8C00; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
            editResultButton.addEventListener('click', () => {
              openEditResultModal(currentParty.id, currentParty.result || 'à venir');
            });
            popupContent.appendChild(editResultButton);
          }
          
          if (isAdmin && isEditing) {
            const editDescriptionButton = document.createElement('button');
            editDescriptionButton.className = 'edit-description-button';
            editDescriptionButton.textContent = 'Modifier la description';
            editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
            editDescriptionButton.addEventListener('click', () => {
              const currentDescription = currentParty.description || '';
              openEditDescriptionModal(currentParty.id, currentDescription);
            });
            popupContent.appendChild(editDescriptionButton);
          }
          
          popupContent.appendChild(buttonsContainerNew);
          handlePopupOpen();
        });
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });
    }
  }, [venues, parties, isEditing, isAdmin, eventFilter, venueFilter, delegationFilter, showFemale, showMale, showMixed, location.pathname, activeTab, appAction]);

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
              <p class="venue-address">${hotel.address || `${hotel.latitude}, ${hotel.longitude}`}</p>
              ${hotel.telephone ? `<p class="venue-phone">Téléphone : ${hotel.telephone}</p>` : ''}
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
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'Copier l\'adresse';
            copyButton.addEventListener('click', () => {
              copyToClipboard(hotel.address || `${hotel.latitude},${hotel.longitude}`);
            }); 
            buttonsContainer.appendChild(copyButton);

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
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
              const currentHotel = hotels.find(h => h.id === hotel.id) || hotel;
              
              // Mettre à jour le contenu HTML
              popupContent.innerHTML = `
                <h3>${currentHotel.name}</h3>
                ${currentHotel.description ? `<p>${currentHotel.description}</p>` : ''}
                <p class="venue-address">${currentHotel.address || `${currentHotel.latitude}, ${currentHotel.longitude}`}</p>
                ${currentHotel.telephone ? `<p class="venue-phone">Téléphone : ${currentHotel.telephone}</p>` : ''}
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
              const copyButton = document.createElement('button');
              copyButton.className = 'copy-button';
              copyButton.textContent = 'Copier l\'adresse';
              copyButton.addEventListener('click', () => {
                copyToClipboard(currentHotel.address || `${currentHotel.latitude},${currentHotel.longitude}`);
              });
              buttonsContainerNew.appendChild(copyButton);
              
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
                editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
                editDescriptionButton.addEventListener('click', () => {
                  const currentDescription = currentHotel.description || '';
                  openEditHotelDescriptionModal(currentHotel.id, currentDescription);
                });
                popupContent.appendChild(editDescriptionButton);
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
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = 'Copier l\'adresse';
            copyButton.addEventListener('click', () => {
              copyToClipboard(restaurant.address || `${restaurant.latitude},${restaurant.longitude}`);
            });
            buttonsContainer.appendChild(copyButton);
    
            popupContent.appendChild(buttonsContainer);
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              // Mettre à jour le contenu du popup avec les données actuelles depuis l'état React
              const currentRestaurant = restaurants.find(r => r.id === restaurant.id) || restaurant;
              
              // Mettre à jour le contenu HTML
              popupContent.innerHTML = `
                <h3>${currentRestaurant.name}</h3>
                <p>${currentRestaurant.description}</p>
                <p class="venue-address">${currentRestaurant.address}</p>
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
              const copyButton = document.createElement('button');
              copyButton.className = 'copy-button';
              copyButton.textContent = 'Copier l\'adresse';
              copyButton.addEventListener('click', () => {
                copyToClipboard(currentRestaurant.address || `${currentRestaurant.latitude},${currentRestaurant.longitude}`);
              });
              buttonsContainerNew.appendChild(copyButton);
              
              // Réajouter le bouton d'édition si admin - Utiliser les refs pour avoir les valeurs actuelles
              const currentIsAdmin = isAdminRef.current;
              const currentIsEditing = isEditingRef.current;
              if (currentIsAdmin && currentIsEditing) {
                const editDescriptionButton = document.createElement('button');
                editDescriptionButton.className = 'edit-description-button';
                editDescriptionButton.textContent = 'Modifier la description';
                editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
                editDescriptionButton.addEventListener('click', () => {
                  const currentDescription = currentRestaurant.description || '';
                  openEditRestaurantDescriptionModal(currentRestaurant.id, currentDescription);
                });
                popupContent.appendChild(editDescriptionButton);
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
    const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
    restaurants.forEach(restaurant => {
      if (preferredRestaurant === 'none' || restaurant.id === preferredRestaurant) {
        const marker = createRestaurantMarker(restaurant);
        marker.addTo(map);
        markersRef.current.push(marker);
      }
    });
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

        const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
        restaurants.forEach(restaurant => {
          if (preferredRestaurant === 'none' || restaurant.id === preferredRestaurant) {
            const marker = createRestaurantMarker(restaurant);
            if (mapRef.current) {
              marker.addTo(mapRef.current);
              markersRef.current.push(marker);
            }
          }
        });
      }
    }
  }, [mapRef.current, locationError, hotels, restaurants, isAdmin, isEditing]);

  // Effet pour gérer les changements de préférences d'hôtels et restaurants
  useEffect(() => {
    const handlePreferenceChange = (e: StorageEvent) => {
      if (e.key === 'preferredHotel' || e.key === 'preferredRestaurant') {
        createHotelAndRestaurantMarkers();
      }
    };

    // Écouter aussi les événements personnalisés pour les changements dans le même onglet
    const handleCustomPreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'preferredHotel' || e.detail.key === 'preferredRestaurant') {
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
    if (!checkAdminRights()) return;

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
    triggerMarkerUpdate();
  };

  // Fonction pour terminer l'édition d'un match
  const finishEditingMatch = () => {
    setEditingMatch({ venueId: null, match: null });
    triggerMarkerUpdate();
  };

  // Fonction pour sauvegarder le résultat de la soirée
  const savePartyResult = (partyId: string, result: string) => {
    if (partyId === '2') { // Parc Expo Pompoms
      // Sauvegarder dans Firebase uniquement
      saveToFirebase('editableData/partyResults/parc-expo-pompoms', { result, updatedAt: new Date().toISOString() });
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === '2' ? { ...party, result } : party
        )
      );
      triggerMarkerUpdate();
    } else if (partyId === '3') { // Parc Expo Showcase
      // Sauvegarder dans Firebase
      saveToFirebase('editableData/partyResults/parc-expo-showcase', { result, updatedAt: new Date().toISOString() });
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === '3' ? { ...party, result } : party
        )
      );
      triggerMarkerUpdate();
    } else if (partyId === '4') { // Zénith DJ Contest
      // Sauvegarder dans Firebase uniquement
      saveToFirebase('editableData/partyResults/zenith-dj-contest', { result, updatedAt: new Date().toISOString() });
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === '4' ? { ...party, result } : party
        )
      );
      triggerMarkerUpdate();
    }
    setEditingPartyResult({ partyId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description de la soirée
  const savePartyDescription = (partyId: string, description: string) => {
    // Sauvegarder dans Firebase uniquement
    saveToFirebase(`editableData/partyDescriptions/${partyId}`, { description, updatedAt: new Date().toISOString() });
    
    // Mettre à jour l'état local
    setParties((prevParties: Party[]) => 
      prevParties.map((party: Party) => 
        party.id === partyId ? { ...party, description } : party
      )
    );
    
    triggerMarkerUpdate();
    setEditingPartyDescription({ partyId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description de l'hôtel
  const saveHotelDescription = (hotelId: string, description: string) => {
    // Sauvegarder dans Firebase uniquement
    saveToFirebase(`editableData/hotelDescriptions/${hotelId}`, { description, updatedAt: new Date().toISOString() });
    
    // Mettre à jour l'état local
    setHotels((prevHotels: Hotel[]) => 
      prevHotels.map((hotel: Hotel) => 
        hotel.id === hotelId ? { ...hotel, description } : hotel
      )
    );
    createHotelAndRestaurantMarkers();
    triggerMarkerUpdate();
    setEditingHotelDescription({ hotelId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description du restaurant
  const saveRestaurantDescription = (restaurantId: string, description: string) => {
    // Sauvegarder dans Firebase uniquement
    saveToFirebase(`editableData/restaurantDescriptions/${restaurantId}`, { description, updatedAt: new Date().toISOString() });
    
    // Mettre à jour l'état local
    setRestaurants((prevRestaurants: Restaurant[]) => 
      prevRestaurants.map((restaurant: Restaurant) => 
        restaurant.id === restaurantId ? { ...restaurant, description } : restaurant
      )
    );
    createHotelAndRestaurantMarkers();
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

  // Fonction pour sauvegarder les descriptions et résultats dans Firebase
  const saveToFirebase = async (path: string, data: any) => {
    try {
      const dbRef = ref(database, path);
      await set(dbRef, data);
    } catch (error) {
      // Les données sont déjà sauvegardées localement
    }
  };

  // Fonction pour charger les descriptions et résultats depuis Firebase
  const loadFromFirebase = (path: string, callback: (data: any) => void) => {
    try {
      const dbRef = ref(database, path);
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
      });
      return unsubscribe;
    } catch (error) {
      callback(null);
    }
  };

  // Fonction pour mettre à jour l'état local avec les données Firebase
  // Cette fonction est maintenant simplifiée car les états sont mis à jour directement par les listeners Firebase
  const updateLocalStateFromFirebase = () => {
    // Les états sont déjà mis à jour directement par les listeners Firebase
    // On déclenche juste la mise à jour des marqueurs pour refléter les changements
    triggerMarkerUpdate();
  };

  // Fonction pour initialiser la branche editableData sur Firebase
  const initializeEditableDataBranch = async () => {
    try {
      const editableDataRef = ref(database, 'editableData');
      
      // Générer dynamiquement la structure pour inclure tous les hôtels et restaurants depuis les états React
      const generateHotelDescriptions = () => {
        const hotelDescriptions: any = {};
        hotels.forEach((hotel) => {
          hotelDescriptions[hotel.id] = {
            description: hotel.description || '',
            updatedAt: new Date().toISOString()
          };
        });
        return hotelDescriptions;
      };

      const generateRestaurantDescriptions = () => {
        const restaurantDescriptions: any = {};
        restaurants.forEach((restaurant) => {
          restaurantDescriptions[restaurant.id] = {
            description: restaurant.description || '',
            updatedAt: new Date().toISOString()
          };  
        });
        return restaurantDescriptions;
      };

      // Trouver les résultats des soirées depuis l'état parties
      const party2 = parties.find(p => p.id === '2');
      const party3 = parties.find(p => p.id === '3');
      const party1 = parties.find(p => p.id === '1');
      const party4 = parties.find(p => p.id === '4');

      // Structure complète avec toutes les données depuis les états React
      const initialStructure = {
        partyResults: {
          'parc-expo-pompoms': {
            result: party2?.result || 'à venir',
            updatedAt: new Date().toISOString()
          },
          'zenith-dj-contest': {
            result: party4?.result || 'à venir',
            updatedAt: new Date().toISOString()
          }
        },
        hotelDescriptions: generateHotelDescriptions(),
        restaurantDescriptions: generateRestaurantDescriptions(),
        partyDescriptions: {
          '1': {
            description: party1?.description || 'Rendez vous 12h puis départ du Défilé à 13h',
            updatedAt: new Date().toISOString()
          },
          '2': {
            description: party2?.description || 'Soirée Pompoms du 16 avril, 21h-3h',
            updatedAt: new Date().toISOString()
          },
          '3': {
            description: party3?.description || 'Soirée Showcase 17 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          },
          '4': {
            description: party4?.description || 'Soirée DJ Contest 18 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          }
        }
      };

      // Vérifier si editableData existe déjà dans Firebase
      const snapshot = await get(editableDataRef);
      if (!snapshot.exists()) {
        // Si la structure n'existe pas, l'initialiser avec les valeurs par défaut
        await set(editableDataRef, initialStructure);
      } else {
        // Si la structure existe, ne mettre à jour que les champs manquants sans écraser les données existantes
        const existingData = snapshot.val();
        const updates: any = {};
        
        // Vérifier et mettre à jour seulement les parties manquantes
        if (!existingData.partyResults) {
          updates.partyResults = initialStructure.partyResults;
        } else {
          // Mettre à jour seulement les résultats manquants
          if (!existingData.partyResults['parc-expo-pompoms']) {
            updates['partyResults/parc-expo-pompoms'] = initialStructure.partyResults['parc-expo-pompoms'];
          }
          if (!existingData.partyResults['zenith-dj-contest']) {
            updates['partyResults/zenith-dj-contest'] = initialStructure.partyResults['zenith-dj-contest'];
          }
        }
        
        if (!existingData.hotelDescriptions) {
          updates.hotelDescriptions = initialStructure.hotelDescriptions;
        } else {
          // Mettre à jour seulement les descriptions d'hôtels manquantes
          hotels.forEach((hotel) => {
            if (!existingData.hotelDescriptions[hotel.id]) {
              updates[`hotelDescriptions/${hotel.id}`] = initialStructure.hotelDescriptions[hotel.id];
            }
          });
        }
        
        if (!existingData.restaurantDescriptions) {
          updates.restaurantDescriptions = initialStructure.restaurantDescriptions;
        } else {
          // Mettre à jour seulement les descriptions de restaurants manquantes
          restaurants.forEach((restaurant) => {
            if (!existingData.restaurantDescriptions[restaurant.id]) {
              updates[`restaurantDescriptions/${restaurant.id}`] = initialStructure.restaurantDescriptions[restaurant.id];
            }
          });
        }
        
        if (!existingData.partyDescriptions) {
          updates.partyDescriptions = initialStructure.partyDescriptions;
        } else {
          // Mettre à jour seulement les descriptions de soirées manquantes
          ['1', '2', '3', '4'].forEach((partyId) => {
            if (!existingData.partyDescriptions[partyId]) {
              updates[`partyDescriptions/${partyId}`] = initialStructure.partyDescriptions[partyId as '1' | '2' | '3' | '4'];
            }
          });
        }
        
        // Appliquer seulement les mises à jour nécessaires
        if (Object.keys(updates).length > 0) {
          await update(editableDataRef, updates);
        }
      }
      
      // Mettre à jour l'état local avec les données Firebase
      updateLocalStateFromFirebase();
      
    } catch (error) {
      // Les données restent sauvegardées localement
    }
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
            let partyId = '';
            switch (party.name) {
              case 'Place Stanislas':
                partyId = 'place-stanislas';
                break;
              case 'Parc Expo':
                partyId = 'parc-expo';
                break;
              case 'Zénith':
                partyId = 'zenith';
                break;
              default:
                partyId = party.name.toLowerCase().replace(/\s+/g, '-');
            }

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
                const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
                shouldShow = preferredRestaurant === 'none' || restaurant.id === preferredRestaurant;
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

  // Fonction pour obtenir toutes les délégations uniques
  // Filtre les entrées contenant des mots-clés de phases finales (Poule, Perdant, Vainqueur)
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    const excludedKeywords = ['poule', 'perdant', 'vainqueur'];
    
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach(match => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map(team => team.trim());
          teams.forEach(team => {
            const teamLower = team.toLowerCase();
            const isExcluded = excludedKeywords.some(keyword => teamLower.includes(keyword));
            // Exclure les "...", les chaînes vides et les mots-clés de phases finales
            if (team && team !== "..." && team !== "…" && !isExcluded) {
              delegations.add(team);
            }
          });
        });
      }
    });
    return Array.from(delegations).sort();
  };

  const scrollToFirstNonPassedEvent = () => {
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
  };

  // Update the filter change handlers to include the scroll
  const handleEventFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_event_filter',
      label: e.target.value
    });
    setEventFilterWithSave(e.target.value);
    // Réinitialiser le filtre de lieu quand le type d'événement change
    setVenueFilterWithSave('Tous');
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleDelegationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_delegation_filter',
      label: e.target.value
    });
    setDelegationFilterWithSave(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  // Ajouter la fonction pour gérer le clic sur le bouton ⭐
  const handleStarFilterClick = () => {
    const preferredSportRaw = localStorage.getItem('preferredSport') || 'all';
    let preferredSport;
    try {
      const parsed = JSON.parse(preferredSportRaw);
      preferredSport = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredSport = preferredSportRaw;
    }
    const preferredDelegation = localStorage.getItem('preferredDelegation') || 'all';
    const preferredChampionshipRaw = localStorage.getItem('preferredChampionship') || 'none';
    let preferredChampionship;
    try {
      const parsed = JSON.parse(preferredChampionshipRaw);
      preferredChampionship = Array.isArray(parsed) ? parsed[0] || 'none' : parsed;
    } catch {
      preferredChampionship = preferredChampionshipRaw;
    }
    
    const newStarFilterActive = !isStarFilterActive;
    setIsStarFilterActive(newStarFilterActive);
    localStorage.setItem('starFilterActive', JSON.stringify(newStarFilterActive));
    
    if (!isStarFilterActive) {
      // Si le sport préféré est 'none', on utilise 'match' pour afficher tous les sports
      setEventFilterWithSave(preferredSport === 'none' ? 'match' : preferredSport);
      setDelegationFilterWithSave(preferredDelegation);
      
      // Appliquer les filtres de genre en fonction du championnat sélectionné
      if (preferredChampionship !== 'none') {
        setShowFemaleWithSave(preferredChampionship === 'female');
        setShowMaleWithSave(preferredChampionship === 'male');
        setShowMixedWithSave(preferredChampionship === 'mixed');
      } else {
        setShowFemaleWithSave(true);
        setShowMaleWithSave(true);
        setShowMixedWithSave(true);
      }
    } else {
      setEventFilterWithSave('all');
      setDelegationFilterWithSave('all');
      setShowFemaleWithSave(true);
      setShowMaleWithSave(true);
      setShowMixedWithSave(true);
    }
    
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const getVenueOptions = () => {
    if (eventFilter === 'all' || eventFilter === 'match') {
      // Proposer tous les lieux qui ont au moins un match correspondant à la délégation ET au(x) genre(s) sélectionné(s)
      const filteredVenues = venues.filter(venue => {
        // Filtrage par délégation
        const delegationMatch =
          delegationFilter === 'all' ||
          (venue.matches && venue.matches.some(match =>
            match.teams.toLowerCase().includes(delegationFilter.toLowerCase())
          ));
        // Filtrage par genre
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
              (!isFemale && !isMale && !isMixed)
            );
          });
        }
        return delegationMatch && genderMatch;
      });
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        ...filteredVenues.map(venue => ({ value: venue.id, label: venue.name }))
      ];
    }

    // Pour les soirées et défilés, retourner les lieux fixes
    if (eventFilter === 'party') {
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        { value: 'place-stanislas', label: 'Place Stanislas' },
        { value: 'parc-expo', label: 'Parc Expo' },
        { value: 'zenith', label: 'Zénith' }
      ];
    }

    // Pour les sports spécifiques, filtrer les lieux par sport, délégation et genre
    const filteredVenues = venues.filter(venue => {
      if (venue.sport !== eventFilter) return false;
      // Filtrage par délégation
      const delegationMatch =
        delegationFilter === 'all' ||
        (venue.matches && venue.matches.some(match =>
          match.teams.toLowerCase().includes(delegationFilter.toLowerCase())
        ));
      // Filtrage par genre
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
            (!isFemale && !isMale && !isMixed)
          );
        });
      }
      return delegationMatch && genderMatch;
    });
    return [
      { value: 'Tous', label: 'Tous les lieux' },
      ...filteredVenues.map(venue => ({ value: venue.id, label: venue.name }))
    ];
  };

  const hasGenderMatches = (sport: string): { hasFemale: boolean, hasMale: boolean, hasMixed: boolean } => {
    let hasFemale = false;
    let hasMale = false;
    let hasMixed = false;

    venues.forEach(venue => {
      if (venue.sport === sport && venue.matches) {
        venue.matches.forEach(match => {
          if (match.description?.toLowerCase().includes('féminin')) hasFemale = true;
          if (match.description?.toLowerCase().includes('masculin')) hasMale = true;
          if (match.description?.toLowerCase().includes('mixte')) hasMixed = true;
        });
      }
    });

    return { hasFemale, hasMale, hasMixed };
  };

  const handleVenueFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_venue_filter',
      label: e.target.value
    });
    setVenueFilterWithSave(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleGenderFilterChange = (gender: 'female' | 'male' | 'mixed') => {
    if (gender === 'female') setShowFemaleWithSave(!showFemale);
    if (gender === 'male') setShowMaleWithSave(!showMale);
    if (gender === 'mixed') setShowMixedWithSave(!showMixed);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
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

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setActiveTab('map'); // Fermer le panneau en revenant à l'onglet map
    triggerMarkerUpdate();
    
    if (event.type === 'party' && isAdmin) {
      const partyId = event.id.split('-')[1];
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
    } else {
      // Pour les matchs, y compris la natation
      const venue = venues.find(v => v.id === event.venueId);
      if (venue) {
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
    }
  };

  const handleAdminClick = async () => {
    if (user) {
      // Si l'utilisateur est connecté, on le déconnecte
      try {
        localStorage.removeItem('isAdmin');
        setUser(null);
        setIsAdmin(false);
        setIsEditing(false); // Désactiver le mode édition lors de la déconnexion
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }
  };

  const handleBack = () => {
    switch (activeTab as TabType) {
      case 'events':
        setActiveTab('map');
        break;
      case 'calendar':
        setActiveTab('events');
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
    setActiveTab(tab);
    if (tab === 'party-map') {
      // Ne rien faire de spécial pour party-map
    }
    if (tab === 'calendar') {
      setFromEvents(activeTab === 'events');
    } else {
      setFromEvents(false);
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

  // Juste après la déclaration de useAppPanels et des states principaux dans App()
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
  const setEventFilterWithSave = (value: string) => {
    setEventFilter(value);
    localStorage.setItem('mapEventFilter', value);
  };

  const setDelegationFilterWithSave = (value: string) => {
    setDelegationFilter(value);
    localStorage.setItem('mapDelegationFilter', value);
  };

  const setVenueFilterWithSave = (value: string) => {
    setVenueFilter(value);
    localStorage.setItem('mapVenueFilter', value);
  };

  const setShowFemaleWithSave = (value: boolean) => {
    setShowFemale(value);
    localStorage.setItem('mapShowFemale', JSON.stringify(value));
  };

  const setShowMaleWithSave = (value: boolean) => {
    setShowMale(value);
    localStorage.setItem('mapShowMale', JSON.stringify(value));
  };

  const setShowMixedWithSave = (value: boolean) => {
    setShowMixed(value);
    localStorage.setItem('mapShowMixed', JSON.stringify(value));
  };



  return (
    <div className="app">
      {/* Overlay de chargement global */}
      {showVenuesLoadingOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--bg-primary)',
          opacity: 0.8,
          zIndex: 5000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div className="location-loading-spinner" style={{ width: 60, height: 60, borderWidth: 6, marginBottom: 24 }}></div>
          <div style={{ color: '#1976D2', fontWeight: 'bold', fontSize: '1.3rem', marginBottom: 8 }}>Chargement des données…</div>
        </div>
      )}
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
        {locationLoading ? (
          <div className="loading">Chargement de la carte...</div>
        ) : (
          <div className="map-container" style={{ marginTop: 0, paddingTop: 0 }}>
        <MapContainer
          center={[48.686881, 6.1880492]}
          zoom={12}
              style={{ height: '100%', width: '100%' }}
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
            
            {activeTab === 'events' && (
              <div className="events-panel">
                <div className="events-panel-header">
                  <button 
                    className="calendar-button"
                    onClick={() => handleTabChange('calendar')}
                    title="Voir le calendrier"
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 12px',
                      margin: '0px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-color)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      minWidth: 'auto',
                      width: 'auto'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    Calendrier
                  </button>
                    <button 
                      className="filter-toggle-button"
                      onClick={() => setShowFilters(!showFilters)}
                      style={{ 
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0px',
                        margin: '0px',
                        border: 'none',
                        minWidth: 'auto',
                        width: 'auto'
                      }}
                    >
                      <svg 
                        width="28" 
                        height="28" 
                        viewBox="0 0 24 24" 
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ 
                          transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        <path d="M18 4H6l5 6.5v4.5l2 2v-6.5L18 4Z"/>
                      </svg>
                    </button>
                </div>
                <div className={`event-filters ${showFilters ? 'show' : ''}`}>
                    {showFilters && (
                    <>
                      <button
                        className={`filter-reset-button star${isStarFilterActive ? ' active' : ''}`}
                        style={{ right: '80px', top: '50px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                        onClick={handleStarFilterClick}
                        title="Appliquer vos préférences"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1.5L14.5 8.5L22 9L16 14.5L17.5 22L12 18L6.5 22L8 14.5L2 9L9.5 8.5L12 1.5Z"/>
                        </svg>
                      </button>
                      <button
                        className="filter-reset-button"
                        style={{ right: '45px', top: '50px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                        onClick={() => {
                          setEventFilterWithSave('all');
                          setDelegationFilterWithSave('all');
                          setVenueFilterWithSave('Tous');
                          setShowFemaleWithSave(true);
                          setShowMaleWithSave(true);
                          setShowMixedWithSave(true);
                          setIsStarFilterActive(false);
                          localStorage.setItem('starFilterActive', 'false');
                          triggerMarkerUpdate();
                          setTimeout(scrollToFirstNonPassedEvent, 100);
                        }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                      </button>
                      <div className="filter-buttons-row"></div>
                      <select 
                        className="filter-select"
                        value={eventFilter}
                        onChange={handleEventFilterChange}
                      >
                        <option value="none">Aucun</option>
                        <option value="all">Tous les événements</option>
                        <option value="match">Tous les sports</option>
                        {isAdmin && <option value="party">Soirées et Défilé 🎉</option>}
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

                      <select
                        className="filter-select"
                        value={delegationFilter}
                        onChange={handleDelegationFilterChange}
                      >
                        <option value="all">Toutes les délégations</option>
                        {getAllDelegations().map(delegation => (
                          <option key={delegation} value={delegation}>
                            {delegation}
                          </option>
                        ))}
                      </select>

                      {eventFilter !== 'none' && eventFilter !== 'all' && eventFilter !== 'match' && (
                        <select 
                          className="filter-select"
                          value={venueFilter}
                          onChange={handleVenueFilterChange}
                        >
                          {getVenueOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {eventFilter !== 'all' && eventFilter !== 'party' && (() => {
                        const { hasFemale, hasMale, hasMixed } = hasGenderMatches(eventFilter);
                        if (!hasFemale && !hasMale && !hasMixed) return null;
                        return (
                          <div className="gender-filter-row">
                            {hasFemale && (
                              <button 
                                className={`gender-filter-button ${showFemale ? 'active' : ''}`}
                                onClick={() => handleGenderFilterChange('female')}
                              >
                                Féminin
                              </button>
                            )}
                            {hasMale && (
                              <button 
                                className={`gender-filter-button ${showMale ? 'active' : ''}`}
                                onClick={() => handleGenderFilterChange('male')}
                              >
                                Masculin
                              </button>
                            )}
                            {hasMixed && (
                              <button 
                                className={`gender-filter-button ${showMixed ? 'active' : ''}`}
                                onClick={() => handleGenderFilterChange('mixed')}
                              >
                                Mixte
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
                <div className="events-list">
                  {getFilteredEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`event-item ${event.isPassed ? 'passed' : ''} ${event.type === 'match' ? 'match-event' : 'party-event'} ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                      onClick={() => handleEventSelect(event)}
                    >
                      <div className="event-header">
                        <span className="event-type-badge">
                          {event.type === 'match' ? (
                            <>
                              <span>{getSportIcon(event.sport || '')}</span>
                              <span>{event.sport}</span>
                            </>
                          ) : event.sport === 'Defile' ? (
                            <>
                              <span>🎺</span>
                              <span>Défilé</span>
                            </>
                          ) : event.sport === 'Pompom' ? (
                            <>
                              <span>🎀</span>
                              <span>Pompom</span>
                            </>
                          ) : event.name === 'Parc Expo' && event.description.includes('Showcase') ? (
                            <>
                              <span>🎤</span>
                              <span>SHOWCASE</span>
                            </>
                          ) : (event.name === 'Parc Expo' || event.name === 'Zénith') && event.description.includes('DJ Contest') ? (
                            <>
                              <span>🎧</span>
                              <span>DJ CONTEST</span>
                            </>
                          ) : (
                            <>
                              <span>🎉</span>
                              <span>Soirée</span>
                            </>
                          )}
                        </span>
                        <span className="event-date">{formatDateTime(event.date, event.endTime)}</span>
                      </div>
                      <div className="event-title-container">
                        <h3 className="event-name">{event.name}</h3>
                      </div>
                      {event.type === 'match' && (
                        <>
                          <p className="event-description">{event.description}</p>
                          <p className="event-venue">{event.venue}</p>
                          {event.result && <p className="event-result">Résultat : {event.result}</p>}
                        </>
                      )}
                      {event.type === 'party' && (
                        <>
                          <p className="event-description">{event.description}</p>
                          <p className="event-address">{event.address}</p>
                          {event.sport !== 'Defile' && (
                            <div className="party-results">
                              <h4 style={{ color: 'var(--success-color)', marginTop: '10px' }}>
                                Résultat : {event.result || 'à venir'}
                              </h4>
                            </div>
                          )}
                        </>
                      )}
                      <div className="event-actions">
                        <button 
                          className="maps-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank');
                          }}
                        >
                          Ouvrir dans Google Maps
                        </button>
                        <button 
                          className="copy-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(event.address);
                          }}
                        >
                          Copier l'adresse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="chat-panel">
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
                    {/* Champ pour le nom de l'expéditeur (admin uniquement) */}
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
                      {/* Header du message : affiche le nom de l'expéditeur */}
                      <div className="chat-message-header" style={{ justifyContent: 'space-between' }}>
                        <span>{message.sender}</span>
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                      </div>
                      {/* Contenu du message */}
                      <div className="chat-message-content" style={{ textAlign: 'left' }}>
                        {/* Si ce message est en cours d'édition, affiche un input */}
                        {isAdmin && editingMessageIndex === index ? (
                          <form
                            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                            onSubmit={e => {
                              e.preventDefault();
                              if (message.id) {
                                handleEditMessage(message.id, editingMessageValue, newMessageSender);
                              }
                              setEditingMessageIndex(null);
                              setEditingMessageValue('');
                            }}
                          >
                            <input
                              type="text"
                              value={editingMessageValue}
                              onChange={e => setEditingMessageValue(e.target.value)}
                              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                              autoFocus
                            />
                            <button type="submit" className="add-message-button">Valider</button>
                            <button type="button" className="close-chat-button" onClick={() => { setEditingMessageIndex(null); setEditingMessageValue(''); }}>Annuler</button>
                          </form>
                        ) : (
                          <>
                            {translatedMessages[message.id || `msg-${index}`] || message.content}
                          </>
                        )}
                        {/* Bouton de traduction en bas à droite */}
                        <button
                          className="translate-button"
                          onClick={() => translateMessage(message.id || `msg-${index}`, message.content)}
                          title={translatedMessages[message.id || `msg-${index}`] ? "Revenir au français" : "Traduire en anglais"}
                        >
                          {translatedMessages[message.id || `msg-${index}`] ? "Original" : "🌐 Translate"}
                        </button>
                      </div>
                                             {/* Boutons admin en bas à droite */}
                       {isAdmin && isEditing && editingMessageIndex !== index && (
                         <div className="chat-admin-buttons">
                           <button
                             className="edit-message-button"
                             title="Modifier"
                             onClick={() => {
                               // Ouvre le formulaire d'ajout en haut, pré-rempli
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
          </div>
        )}
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
                <input id="match-description" type="text" value={editingMatch.match ? editingMatch.match.description : newMatch.description} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, description: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, description: e.target.value }); } }} placeholder="Ex: Poule A Masculin - Match 1" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-result">Résultat</label>
                <input id="match-result" type="text" value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, result: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, result: e.target.value }); } }} placeholder="Ex: 2 - 1 (à saisir si disponible)" className="modal-form-input" />
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
                    setSelectedPlaceType('hotel');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                      setSelectedSport('Football');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">🏢</span>
                  <span className="place-type-label">Hôtel</span>
                </button>
                <button 
                  className="place-type-button"
                  onClick={() => {
                    setSelectedPlaceType('soirée');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setSelectedEmoji(eventTypeEmojis['DJ contest'] || '🎉');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">🎉</span>
                  <span className="place-type-label">Soirée</span>
                </button>
                <button 
                  className="place-type-button"
                  onClick={() => {
                    setSelectedPlaceType('défilé');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">🎺</span>
                  <span className="place-type-label">Défilé</span>
                </button>
                <button 
                  className="place-type-button"
                  onClick={() => {
                    setSelectedPlaceType('resto');
                    setShowPlaceTypeModal(false);
                    setIsAddingPlace(true);
                    setEditingVenue({ id: null, venue: null });
                    setNewVenueName('');
                    setNewVenueDescription('');
                    setNewVenueAddress('');
                    setSelectedSport('Football');
                    setSelectedEventType('DJ contest');
                    setSelectedIndicationType('Soins');
                    setTempMarker(null);
                  }}
                >
                  <span className="place-type-icon">🍽️</span>
                  <span className="place-type-label">Restaurant</span>
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
        onShowFiltersChange={setShowFilters}
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
                  <label htmlFor="party-result">Résultat de la soirée pompom</label>
                  <textarea 
                    id="party-result" 
                    value={editingResult} 
                    onChange={(e) => setEditingResult(e.target.value)} 
                    placeholder="Entrez le résultat de la soirée pompom..." 
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
                  <label htmlFor="party-description">Description de la soirée</label>
                  <textarea 
                    id="party-description" 
                    value={editingDescription} 
                    onChange={(e) => setEditingDescription(e.target.value)} 
                    placeholder="Entrez la description de la soirée..." 
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
                  <label htmlFor="hotel-description">Description de l'hôtel</label>
                  <textarea 
                    id="hotel-description" 
                    value={editingHotelDescriptionText} 
                    onChange={(e) => setEditingHotelDescriptionText(e.target.value)} 
                    placeholder="Entrez la description de l'hôtel..." 
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
                  <label htmlFor="restaurant-description">Description du restaurant</label>
                  <textarea 
                    id="restaurant-description" 
                    value={editingRestaurantDescriptionText} 
                    onChange={(e) => setEditingRestaurantDescriptionText(e.target.value)} 
                    placeholder="Entrez la description du restaurant..." 
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

      {activeTab === 'party-map' && <PartyMap />}

      <Outlet />
    </div>
  );
}

export default App;
