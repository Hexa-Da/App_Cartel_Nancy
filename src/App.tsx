import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon, LatLng } from 'leaflet';
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import './App.css';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database } from './firebase';
import L from 'leaflet';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import CalendarPopup from './components/CalendarPopup';
import { Venue, Match } from './types';
import PlanningFiles from './components/PlanningFiles';
import { Outlet, useLocation} from 'react-router-dom';
import { useAppPanels, TabType } from './AppPanelsContext';
import Header from './components/Header';
import NotificationService from './services/NotificationService';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Browser } from '@capacitor/browser';
import EmergencyPopup from './components/EmergencyPopup';
import BusLines from './components/BusLines';
import './components/ModalForm.css';

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
          <Marker position={position} icon={UserIcon}>
            <Popup>Vous êtes ici</Popup>
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
  const { activeTab, setActiveTab, showAddMessage, setShowAddMessage, showEmergency, setShowEmergency, closeAllPanels, isEditing, setIsEditing } = useAppPanels();
  const location = useLocation();

  // Ajoute la classe 'ios' au body si la plateforme est iOS
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      document.body.classList.add('ios');
    }
  }, []);

  // Forcer l'orientation portrait au démarrage
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.lock({ orientation: 'portrait-primary' });
    }
  }, []);

  // Effet pour gérer le changement de route
  useEffect(() => {
    if (location.pathname === '/map' && activeTab === 'map') {
      setActiveTab('map');
      // Forcer la mise à jour des marqueurs
      setAppAction(prev => prev + 1);
      // Forcer la mise à jour de la carte
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageValue, setEditingMessageValue] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<'map' | 'events' | 'chat' | 'planning' | 'calendar' | 'home' | 'info'>('map');
  const [chatOriginTab, setChatOriginTab] = useState<'map' | 'events' | 'chat' | 'planning' | 'calendar' | 'home' | 'info'>('map');
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
      // Mettre à jour l'état admin
      setIsAdmin(true);
      setUser({ isAdmin: true });
    };

    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    return () => window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
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

    // Envoyer une notification locale à l'expéditeur
    const notificationService = NotificationService.getInstance();
    const hasPermission = await notificationService.checkPermission();
    
    if (hasPermission) {
      await notificationService.sendLocalNotification(
        'Message envoyé',
        'Votre message a été envoyé avec succès'
      );
    }

    // Ici vous devriez implémenter l'envoi de notifications push à tous les utilisateurs
    // via Firebase Cloud Messaging (FCM) ou votre serveur
    await sendPushNotificationToAllUsers(msg, sender);
  };

  // Fonction pour envoyer des notifications push à tous les utilisateurs
  const sendPushNotificationToAllUsers = async (message: string, sender: string) => {
    try {
      // Pour l'instant, on utilise des notifications locales
      // TODO: Implémenter FCM plus tard
      console.log('Envoi de notification à tous les utilisateurs:', message);
      
      // Notification locale pour l'expéditeur
      const notificationService = NotificationService.getInstance();
      await notificationService.sendLocalNotification(
        'Message envoyé',
        'Votre message a été envoyé avec succès'
      );
      
      // TODO: Remplacer par l'envoi FCM quand ce sera configuré
      // Exemple avec Firebase Functions :
      // const response = await fetch('/api/send-notification', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message, sender })
      // });
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications:', error);
    }
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
      
      if (data && data[0] && data[0][0]) {
        const translatedText = data[0][0][0];
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
    // Charger les descriptions modifiées depuis le localStorage
    const savedDescription1 = localStorage.getItem('hotel-description-1') || "+33 892 68 31 25";
    const savedDescription2 = localStorage.getItem('hotel-description-2') || "+33 3 83 44 66 00";
    
    return [
      {
        id: '1',
        name: "ibis budget Nancy Porte Sud",
        position: [48.638751, 6.183532],
        description: savedDescription1,
        address: "Za Frocourt, 6 All. de la Genelière, 54180 Houdemont",
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
        name: "KYRIAD DIRECT NANCY SUD - Vandoeuvre",
        position: [48.650667, 6.146258],
        description: savedDescription2,
        address: "1 Av. de la Forêt de Haye, 54500 Vandœuvre-lès-Nancy",
        type: 'hotel',
        date: '',
        latitude: 48.650667,
        longitude: 6.146258,
        emoji: '🏢',
        sport: 'Hotel',
        matches: []
      },
    ];
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    // Charger les descriptions modifiées depuis le localStorage
    const savedDescription1 = localStorage.getItem('restaurant-description-1') || "Repas du soir";
    const savedDescription2 = localStorage.getItem('restaurant-description-2') || "Repas du midi";
    
    return [
      {
        id: '1',
        name: "Crous ARTEM",
        position: [48.673570, 6.169268],
        description: savedDescription1,
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
        description: savedDescription2,
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
    const savedResult = localStorage.getItem('centre-prouve-result') || 'à venir';
    const savedDJResult = localStorage.getItem('zenith-dj-contest-result') || 'à venir';
    
    // Charger les descriptions modifiées depuis le localStorage
    const savedDescription1 = localStorage.getItem('party-description-1') || "Rendez vous 12h puis départ du Défilé à 13h";
    const savedDescription2 = localStorage.getItem('party-description-2') || "Soirée Pompoms du 16 avril, 21h-3h";
    const savedDescription3 = localStorage.getItem('party-description-3') || "Soirée DJ contest 17 avril, 20h-4h";
    const savedDescription4 = localStorage.getItem('party-description-4') || "Soirée du 17 avril, 20h-4h";
    
    return [
      {
        id: '1',
        name: "Place Stanislas",
        position: [48.693524, 6.183270],
        description: savedDescription1,
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
        name: "Centre Prouvé",
        position: [48.687858, 6.176977],
        description: savedDescription2,
        address: "1 Pl. de la République, 54000 Nancy",
        type: 'party',
        date: '2026-04-16T21:00:00',
        latitude: 48.687858,
        longitude: 6.176977,
        emoji: '🎀',
        sport: 'Pompom',
        result: savedResult
      },
      {
        id: '3',
        name: "Zénith",
        position: [48.710498, 6.137549],
        description: savedDescription3,
        address: "Rue du Zénith, 54320 Maxéville",
        type: 'party',
        date: '2026-04-18T20:00:00',
        latitude: 48.710498,
        longitude: 6.137549,
        emoji: '🎧',
        sport: 'Party',
        result: savedDJResult
      },
      {
        id: '4',
        name: "Zénith",
        position: [48.711077, 6.139991],
        description: savedDescription4,
        address: "Rue du Zénith, 54320 Maxéville",
        type: 'party',
        date: '2026-04-18T20:00:00',
        latitude: 48.711077,
        longitude: 6.139991,
        emoji: '🏆',
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

  // Charger les lieux depuis Firebase au démarrage
  useEffect(() => {
    setIsVenuesLoading(true);
    const venuesRef = ref(database, 'venues');
    const unsubscribe = onValue(venuesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
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
      } else {
        setVenues([]); // Si pas de données, initialiser avec un tableau vide
      }
      setIsVenuesLoading(false);
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDescription, setNewVenueDescription] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [selectedSport, setSelectedSport] = useState('Football');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [editingMatch, setEditingMatch] = useState<{venueId: string | null, match: Match | null}>({ venueId: null, match: null });
  const [editingPartyResult, setEditingPartyResult] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [showEditResultModal, setShowEditResultModal] = useState(false);
  const [editingResult, setEditingResult] = useState('');
  const [editingPartyDescription, setEditingPartyDescription] = useState<{partyId: string | null, isEditing: boolean}>({ partyId: null, isEditing: false });
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingHotelDescription, setEditingHotelDescription] = useState<{hotelId: string | null, isEditing: boolean}>({ hotelId: null, isEditing: false });
  const [showEditHotelDescriptionModal, setShowEditHotelDescriptionModal] = useState(false);
  const [editingHotelDescriptionText, setEditingHotelDescriptionText] = useState('');
  const [editingRestaurantDescription, setEditingRestaurantDescription] = useState<{restaurantId: string | null, isEditing: boolean}>({ restaurantId: null, isEditing: false });
  const [showEditRestaurantDescriptionModal, setShowEditRestaurantDescriptionModal] = useState(false);
  const [editingRestaurantDescriptionText, setEditingRestaurantDescriptionText] = useState('');
  const [newMatch, setNewMatch] = useState<{date: string, teams: string, description: string, endTime?: string, result?: string}>({
    date: '',
    teams: '',
    description: '',
    result: ''
  });
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState('osm');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [editingVenue, setEditingVenue] = useState<{ id: string | null, venue: Venue | null }>({ id: null, venue: null });
  const [selectedEmoji, setSelectedEmoji] = useState('⚽');
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
      if (e.key === 'preferredHotel' || e.key === 'preferredRestaurant') {
        triggerMarkerUpdate();
      }
    };

    const handlePreferenceChange = (e: CustomEvent) => {
      if (e.detail.key === 'preferredSport') {
        // Ne plus modifier directement le filtre
        // setEventFilter(e.detail.value);
        // triggerMarkerUpdate();
      }
      if (e.detail.key === 'preferredHotel' || e.detail.key === 'preferredRestaurant') {
        triggerMarkerUpdate();
      }
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
    Hockey: '🏑',
    'Base-ball': '⚾',
    Golf: '⛳',
    'Ping-pong': '🏓',
    Ultimate: '🥏',
    Natation: '🏊',
    Cross: '🏃',
    Boxe: '🥊',
    Athlétisme: '🏃‍♂️',
    Pétanque: '🍹',
    Escalade: '🧗‍♂️',
    'Jeux de société': '🎲',
    Other: '🎯',
    Pompom: '🎀',
    Defile: '🎺',
    Party: '🎉',
    Hotel: '🏢',
    Restaurant: '🍽️'
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
      'Cross': '🏃',
      'Volleyball': '🏐',
      'Ping-pong': '🏓',
      'Boxe': '🥊',
      'Athlétisme': '🏃‍♂️',
      'Pétanque': '🍹',
      'Escalade': '🧗‍♂️',
      'Jeux de société': '🎲'
    };
    return sportIcons[sport] || '🏆';
  };

  // Charger les descriptions et résultats depuis Firebase au démarrage
  useEffect(() => {
    let unsubscribeFunctions: (() => void)[] = [];
    let dataLoaded = false;
    
    // Fonction pour vérifier si toutes les données sont chargées et mettre à jour l'état
    const checkAllDataLoaded = () => {
      if (dataLoaded) {
        // Mettre à jour l'état local avec les données Firebase
        updateLocalStateFromFirebase();
      }
    };
    
    // Charger les résultats des soirées
    const unsubscribePartyResults = loadFromFirebase('editableData/partyResults', (data) => {
      if (data) {
        // Mettre à jour les résultats des soirées
        if (data['centre-prouve'] && data['centre-prouve'].result) {
          localStorage.setItem('centre-prouve-result', data['centre-prouve'].result);
        }
        if (data['zenith-dj-contest'] && data['zenith-dj-contest'].result) {
          localStorage.setItem('zenith-dj-contest-result', data['zenith-dj-contest'].result);
        }
        dataLoaded = true;
        checkAllDataLoaded();
      }
    });

    // Charger les descriptions des hôtels
    const unsubscribeHotelDescriptions = loadFromFirebase('editableData/hotelDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([hotelId, hotelData]: [string, any]) => {
          if (hotelData.description) {
            localStorage.setItem(`hotel-description-${hotelId}`, hotelData.description);
          }
        });
        dataLoaded = true;
        checkAllDataLoaded();
      }
    });

    // Charger les descriptions des restaurants
    const unsubscribeRestaurantDescriptions = loadFromFirebase('editableData/restaurantDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([restaurantId, restaurantData]: [string, any]) => {
          if (restaurantData.description) {
            localStorage.setItem(`restaurant-description-${restaurantId}`, restaurantData.description);
          }
        });
        dataLoaded = true;
        checkAllDataLoaded();
      }
    });

    // Charger les descriptions des soirées
    const unsubscribePartyDescriptions = loadFromFirebase('editableData/partyDescriptions', (data) => {
      if (data) {
        Object.entries(data).forEach(([partyId, partyData]: [string, any]) => {
          if (partyData.description) {
            localStorage.setItem(`party-description-${partyId}`, partyData.description);
          }
        });
        dataLoaded = true;
        checkAllDataLoaded();
      }
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

  // Ajouter ces états au début du composant App
  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);

  // Modifier la fonction qui gère l'ajout d'un lieu
  const handleAddVenue = async () => {
    if (!checkAdminRights()) return;

    if (!newVenueName || !newVenueDescription || (!newVenueAddress && !tempMarker)) {
      alert('Veuillez remplir tous les champs requis ou placer un marqueur sur la carte.');
      return;
    }

    let coordinates: [number, number] | null = null;
    
    if (tempMarker) {
      coordinates = tempMarker;
    } else if (newVenueAddress) {
      coordinates = await geocodeAddress(newVenueAddress);
      if (!coordinates) {
        alert('Adresse non trouvée. Veuillez vérifier l\'adresse saisie ou placer un marqueur sur la carte.');
        return;
      }
    }

    if (!coordinates) {
      alert('Une erreur est survenue lors de la récupération des coordonnées.');
      return;
    }

    const venuesRef = ref(database, 'venues');
    const newVenueRef = push(venuesRef);
    const newVenue: Omit<Venue, 'id'> = {
      name: newVenueName,
      position: coordinates,
      description: newVenueDescription,
      address: newVenueAddress || `${coordinates[0]}, ${coordinates[1]}`,
      matches: [],
      sport: selectedSport,
      date: '',
      latitude: coordinates[0],
      longitude: coordinates[1],
      emoji: selectedEmoji,
      type: 'venue'
    };

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

    if (!newMatch.date || !newMatch.teams || !newMatch.description) {
      alert('Veuillez remplir tous les champs requis (date de début, équipes et description)');
      return;
    }

    const matchId = uuidv4();
    const match: Match = {
      id: matchId,
      name: `${venue.name} - Match`,
      description: newMatch.description,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      position: [venue.latitude, venue.longitude],
      date: newMatch.date,
      type: 'match',
      teams: newMatch.teams,
      sport: venue.sport,
      time: new Date(newMatch.date).toTimeString().split(' ')[0],
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

    if (editingVenue.id && newVenueName && newVenueDescription) {
      // Trouver le lieu dans la liste
      const venue = venues.find(v => v.id === editingVenue.id);
      
      if (venue) {
        // Sauvegarder l'état avant modification pour pouvoir annuler
        const venueBefore = { ...venue };
        const venueRef = ref(database, `venues/${editingVenue.id}`);
        
        // Utiliser les coordonnées du marqueur temporaire si disponible
        const coordinates: [number, number] = tempMarker || [venue.latitude, venue.longitude];
        
        // Créer l'objet de mise à jour
        const updatedVenue = {
          ...venue,
          name: newVenueName,
          description: newVenueDescription,
          address: newVenueAddress || `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
          sport: selectedSport,
          latitude: coordinates[0],
          longitude: coordinates[1],
          position: coordinates
        };
        
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
    setNewVenueName(venue.name);
    setNewVenueDescription(venue.description);
    setNewVenueAddress(venue.address);
    setSelectedSport(venue.sport);
    setSelectedEmoji(venue.emoji);
    setTempMarker([venue.latitude, venue.longitude]);
    setIsPlacingMarker(false);
  };

  // Fonction pour annuler l'édition
  const cancelEditingVenue = () => {
    setEditingVenue({ id: null, venue: null });
    setNewVenueName('');
    setNewVenueDescription('');
    setNewVenueAddress('');
    setSelectedSport('Football');
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

  // Fonction pour récupérer tous les événements (matchs et soirées)
  const getAllEvents = () => {
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

    // Ajouter les soirées
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

    // Trier par date (du plus récent au plus ancien)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Fonction pour filtrer les événements
  const getFilteredEvents = () => {
    const allEvents = getAllEvents();
    
    return allEvents.filter(event => {
      // Filtre par type d'événement
      const typeMatch = eventFilter === 'all' || 
        (eventFilter === 'none' ? false :
          (eventFilter === 'party' && event.type === 'party') ||
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
          let partyId = '';
          switch (event.name) {
            case 'Place Stanislas':
              partyId = 'place-stanislas';
              break;
            case 'Centre Prouvé':
              partyId = 'centre-prouve';
              break;
            case 'Zénith':
              partyId = 'zenith';
              break;
            default:
              partyId = event.name.toLowerCase().replace(/\s+/g, '-');
          }
          venueMatch = partyId === venueFilter;
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
  };

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
    if (!locationError && mapRef.current) {
      // Nettoyer les marqueurs existants
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

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

        const markerColor = getMarkerColor(venue.date);
        const marker = L.marker([venue.latitude, venue.longitude], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-content" style="background-color: ${markerColor.color}; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                     <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${getSportIcon(venue.sport)}</span>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
          })
        });

        // Créer le contenu du popup
        const popupContent = document.createElement('div');
        popupContent.className = 'venue-popup';
        popupContent.innerHTML = `
          <h3>${venue.name}</h3>
          <p>${venue.description}</p>
          <p><strong>Sport:</strong> ${venue.sport}</p>
          <p class="venue-address">${venue.address || `${venue.latitude}, ${venue.longitude}`}</p>
        `;

        // Boutons d'actions
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

        // Ajouter les matchs au popup
        const matchesListDiv = document.createElement('div');
        matchesListDiv.className = 'matches-list';
        if (venue.matches && venue.matches.length > 0) {
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
        } else {
          matchesListDiv.innerHTML = '<p>Aucun match prévu</p>';
          popupContent.appendChild(matchesListDiv);
        }
        if (isEditing && isAdmin) {
          const editButtonsContainer = document.createElement('div');
          editButtonsContainer.className = 'popup-buttons';
          const addMatchButton = document.createElement('button');
          addMatchButton.className = 'add-match-button';
          addMatchButton.textContent = 'Ajouter un match';
          addMatchButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditingMatch(venue.id || '', null);
          });
          editButtonsContainer.appendChild(addMatchButton);
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
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });

      // HOTELS
      hotels.forEach(hotel => {
        const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
        const shouldShow = preferredHotel === 'none' || hotel.id === preferredHotel;
        if (!shouldShow) return;
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
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          popupContent.innerHTML = `
            <h3>${hotel.name}</h3>
            <p>${hotel.description}</p>
            <p class="venue-address">${hotel.address || `${hotel.latitude}, ${hotel.longitude}`}</p>
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
          
          // Ajouter le bouton d'édition de la description pour les admins seulement si le mode édition est activé
          if (isAdmin && isEditing) {
            const editDescriptionButton = document.createElement('button');
            editDescriptionButton.className = 'edit-description-button';
            editDescriptionButton.textContent = 'Modifier la description';
            editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
            editDescriptionButton.addEventListener('click', () => {
              // Ouvrir le formulaire modal pour éditer la description
              openEditHotelDescriptionModal(hotel.id, hotel.description || '');
            });
            popupContent.appendChild(editDescriptionButton);
          }
          
          popupContent.appendChild(buttonsContainer);
          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            handlePopupOpen();
          });
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
        }
      });

      // RESTAURANTS
      restaurants.forEach(restaurant => {
        const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
        const shouldShow = preferredRestaurant === 'none' || restaurant.id === preferredRestaurant;
        if (!shouldShow) return;
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
          popupContent.innerHTML = `
            <h3>${restaurant.name}</h3>
            <p>${restaurant.description}</p>
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
          
          // Ajouter le bouton d'édition de la description pour les admins seulement si le mode édition est activé
          if (isAdmin && isEditing) {
            const editDescriptionButton = document.createElement('button');
            editDescriptionButton.className = 'edit-description-button';
            editDescriptionButton.textContent = 'Modifier la description';
            editDescriptionButton.style.cssText = 'background-color: #9C27B0; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%; font-weight: 600;';
            editDescriptionButton.addEventListener('click', () => {
              // Ouvrir le formulaire modal pour éditer la description
              openEditRestaurantDescriptionModal(restaurant.id, restaurant.description || '');
            });
            popupContent.appendChild(editDescriptionButton);
          }
          
          popupContent.appendChild(buttonsContainer);
          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            handlePopupOpen();
          });
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
        }
      });

      // PARTIES
      parties.forEach(party => {
        // Calculer l'ID du lieu pour la correspondance avec le filtre
        let partyVenueId = '';
        switch (party.name) {
          case 'Place Stanislas':
            partyVenueId = 'place-stanislas';
            break;
          case 'Centre Prouvé':
            partyVenueId = 'centre-prouve';
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
          ${party.name !== 'Place Stanislas' ? '<div class="party-bus"><h4>Bus : <a href="/plannings/planning-bus.pdf" target="_blank" rel="noopener noreferrer">Voir le planning des bus 🚌 </a></h4></div>' : ''}
          ${party.name === 'Centre Prouvé' ? `<div class="party-result"><h4 style="color: var(--success-color); margin-top: 10px;">Résultat : ${party.result || 'à venir'}</h4></div>` : ''}
          ${party.name === 'Zénith' && party.description.includes('DJ contest') ? `<div class="party-result"><h4 style="color: var(--success-color); margin-top: 10px;">Résultat : ${party.result || 'à venir'}</h4></div>` : ''}
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
        
        // Ajouter le bouton d'édition du résultat pour les admins (soirées pompom et DJ contest) seulement si le mode édition est activé
        if (isAdmin && isEditing && (party.name === 'Centre Prouvé' || (party.name === 'Zénith' && party.description.includes('DJ contest')))) {
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
            // Ouvrir le formulaire modal pour éditer la description
            openEditDescriptionModal(party.id, party.description || '');
          });
          popupContent.appendChild(editDescriptionButton);
        }
        
        popupContent.appendChild(buttonsContainer);
        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          handlePopupOpen();
        });
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });
    }
  }, [venues, hotels, restaurants, parties, isEditing, isAdmin, eventFilter, venueFilter, delegationFilter, showFemale, showMale, showMixed]);

  // Effet pour gérer les changements de préférences d'hôtels et restaurants
  useEffect(() => {
    const handlePreferenceChange = (e: StorageEvent) => {
      if (e.key === 'preferredHotel' || e.key === 'preferredRestaurant') {
        const map = mapRef.current;
        if (!map) return;

        // Supprimer uniquement les marqueurs d'hôtels et restaurants
        markersRef.current = markersRef.current.filter(marker => {
          const isHotelOrRestaurant = marker.getElement()?.classList.contains('hotel-marker') || 
                                    marker.getElement()?.classList.contains('restaurant-marker');
          if (isHotelOrRestaurant) {
            marker.remove();
            return false;
          }
          return true;
        });

        // Recréer les marqueurs d'hôtels
        hotels.forEach(hotel => {
          const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
          if (preferredHotel === 'none' || hotel.id === preferredHotel) {
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

            const popupContent = document.createElement('div');
            popupContent.className = 'venue-popup';
            popupContent.innerHTML = `
              <h3>${hotel.name}</h3>
              <p>${hotel.description}</p>
              <p class="venue-address">${hotel.address}</p>
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
            popupContent.appendChild(buttonsContainer);
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              handlePopupOpen();
            });

            marker.addTo(map);
            markersRef.current.push(marker);
          }
        });

        // Recréer les marqueurs de restaurants
        restaurants.forEach(restaurant => {
          const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
          if (preferredRestaurant === 'none' || restaurant.id === preferredRestaurant) {
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
            popupContent.innerHTML = `
              <h3>${restaurant.name}</h3>
              <p>${restaurant.description}</p>
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
              handlePopupOpen();
            });

            marker.addTo(map);
            markersRef.current.push(marker);
          }
        });
      }
    };

    window.addEventListener('storage', handlePreferenceChange);
    return () => window.removeEventListener('storage', handlePreferenceChange);
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

  // Fonction pour sauvegarder le résultat de la soirée pompom
  const savePartyResult = (partyId: string, result: string) => {
    if (partyId === '2') { // Centre Prouvé
      localStorage.setItem('centre-prouve-result', result);
      // Sauvegarder dans Firebase
      saveToFirebase('editableData/partyResults/centre-prouve', { result, updatedAt: new Date().toISOString() });
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === '2' ? { ...party, result } : party
        )
      );
      triggerMarkerUpdate();
    } else if (partyId === '3') { // Zénith DJ Contest
      localStorage.setItem('zenith-dj-contest-result', result);
      // Sauvegarder dans Firebase
      saveToFirebase('editableData/partyResults/zenith-dj-contest', { result, updatedAt: new Date().toISOString() });
      // Mettre à jour l'état local
      setParties((prevParties: Party[]) => 
        prevParties.map((party: Party) => 
          party.id === '3' ? { ...party, result } : party
        )
      );
      triggerMarkerUpdate();
    }
    setEditingPartyResult({ partyId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description de la soirée
  const savePartyDescription = (partyId: string, description: string) => {
    // Sauvegarder dans localStorage avec une clé unique
    localStorage.setItem(`party-description-${partyId}`, description);
    
    // Sauvegarder dans Firebase
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
    // Sauvegarder dans localStorage avec une clé unique
    localStorage.setItem(`hotel-description-${hotelId}`, description);
    
    // Sauvegarder dans Firebase
    saveToFirebase(`editableData/hotelDescriptions/${hotelId}`, { description, updatedAt: new Date().toISOString() });
    
    // Mettre à jour l'état local
    setHotels((prevHotels: Hotel[]) => 
      prevHotels.map((hotel: Hotel) => 
        hotel.id === hotelId ? { ...hotel, description } : hotel
      )
    );
    
    triggerMarkerUpdate();
    setEditingHotelDescription({ hotelId: null, isEditing: false });
  };

  // Fonction pour sauvegarder la description du restaurant
  const saveRestaurantDescription = (restaurantId: string, description: string) => {
    // Sauvegarder dans localStorage avec une clé unique
    localStorage.setItem(`restaurant-description-${restaurantId}`, description);
    
    // Sauvegarder dans Firebase
    saveToFirebase(`editableData/restaurantDescriptions/${restaurantId}`, { description, updatedAt: new Date().toISOString() });
    
    // Mettre à jour l'état local
    setRestaurants((prevRestaurants: Restaurant[]) => 
      prevRestaurants.map((restaurant: Restaurant) => 
        restaurant.id === restaurantId ? { ...restaurant, description } : restaurant
      )
    );
    
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
    if (editingResult.trim() !== '') {
      // Déterminer quelle soirée éditer selon le contexte
      const currentPartyId = editingPartyResult.partyId;
      if (currentPartyId) {
        savePartyResult(currentPartyId, editingResult.trim());
        closeEditResultModal();
      }
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
    if (editingDescription.trim() !== '') {
      // Déterminer quelle soirée éditer selon le contexte
      const currentPartyId = editingPartyDescription.partyId;
      if (currentPartyId) {
        savePartyDescription(currentPartyId, editingDescription.trim());
        closeEditDescriptionModal();
      }
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
    if (editingHotelDescriptionText.trim() !== '') {
      const currentHotelId = editingHotelDescription.hotelId;
      if (currentHotelId) {
        saveHotelDescription(currentHotelId, editingHotelDescriptionText.trim());
        closeEditHotelDescriptionModal();
      }
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
    if (editingRestaurantDescriptionText.trim() !== '') {
      const currentRestaurantId = editingRestaurantDescription.restaurantId;
      if (currentRestaurantId) {
        saveRestaurantDescription(currentRestaurantId, editingRestaurantDescriptionText.trim());
        closeEditRestaurantDescriptionModal();
      }
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
  const updateLocalStateFromFirebase = () => {
    // Mettre à jour les résultats des soirées
    const centreProuveResult = localStorage.getItem('centre-prouve-result') || 'à venir';
    const zenithDJResult = localStorage.getItem('zenith-dj-contest-result') || 'à venir';
    
    setParties((prevParties: Party[]) => 
      prevParties.map((party: Party) => {
        if (party.id === '2') {
          return { ...party, result: centreProuveResult };
        } else if (party.id === '3') {
          return { ...party, result: zenithDJResult };
        }
        return party;
      })
    );

    // Mettre à jour les descriptions des hôtels dynamiquement
    setHotels((prevHotels: Hotel[]) => 
      prevHotels.map((hotel: Hotel) => {
        const savedDescription = localStorage.getItem(`hotel-description-${hotel.id}`);
        if (savedDescription) {
          return { ...hotel, description: savedDescription };
        }
        return hotel;
      })
    );

    // Mettre à jour les descriptions des restaurants dynamiquement
    setRestaurants((prevRestaurants: Restaurant[]) => 
      prevRestaurants.map((restaurant: Restaurant) => {
        const savedDescription = localStorage.getItem(`restaurant-description-${restaurant.id}`);
        if (savedDescription) {
          return { ...restaurant, description: savedDescription };
        }
        return restaurant;
      })
    );

    // Déclencher la mise à jour des marqueurs pour refléter les changements
    triggerMarkerUpdate();
  };

  // Fonction pour initialiser la branche editableData sur Firebase
  const initializeEditableDataBranch = async () => {
    try {
      const editableDataRef = ref(database, 'editableData');
      
      // Générer dynamiquement la structure pour inclure tous les hôtels et restaurants
      const generateHotelDescriptions = () => {
        const hotelDescriptions: any = {};
        hotels.forEach((hotel) => {
          hotelDescriptions[hotel.id] = {
            description: localStorage.getItem(`hotel-description-${hotel.id}`) || hotel.description,
            updatedAt: new Date().toISOString()
          };
        });
        return hotelDescriptions;
      };

      const generateRestaurantDescriptions = () => {
        const restaurantDescriptions: any = {};
        restaurants.forEach((restaurant) => {
          restaurantDescriptions[restaurant.id] = {
            description: localStorage.getItem(`restaurant-description-${restaurant.id}`) || restaurant.description,
            updatedAt: new Date().toISOString()
          };
        });
        return restaurantDescriptions;
      };

      // Structure complète avec toutes les données existantes
      const initialStructure = {
        partyResults: {
          'centre-prouve': {
            result: localStorage.getItem('centre-prouve-result') || 'à venir',
            updatedAt: new Date().toISOString()
          },
          'zenith-dj-contest': {
            result: localStorage.getItem('zenith-dj-contest-result') || 'à venir',
            updatedAt: new Date().toISOString()
          }
        },
        hotelDescriptions: generateHotelDescriptions(),
        restaurantDescriptions: generateRestaurantDescriptions(),
        partyDescriptions: {
          '1': {
            description: localStorage.getItem('party-description-1') || 'Rendez vous 12h puis départ du Défilé à 13h',
            updatedAt: new Date().toISOString()
          },
          '2': {
            description: localStorage.getItem('party-description-2') || 'Soirée Pompoms du 16 avril, 21h-3h',
            updatedAt: new Date().toISOString()
          },
          '3': {
            description: localStorage.getItem('party-description-3') || 'Soirée DJ contest 17 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          },
          '4': {
            description: localStorage.getItem('party-description-4') || 'Soirée du 17 avril, 20h-4h',
            updatedAt: new Date().toISOString()
          }
        }
      };

      // Écrire directement dans la branche editableData
      await set(editableDataRef, initialStructure);
      
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

  // Fonction pour mettre à jour les marqueurs sur la carte
  const updateMapMarkers = () => {
    if (!mapRef.current) return;

    // Récupérer tous les marqueurs existants
    const allMarkers = markersRef.current;

    // Mettre à jour la visibilité de chaque marqueur
    allMarkers.forEach(marker => {
      const markerElement = marker.getElement();
      if (markerElement) {
        // Trouver le lieu correspondant au marqueur
        const venue = venues.find(v => {
          const markerLatLng = marker.getLatLng();
          return v.latitude === markerLatLng.lat && v.longitude === markerLatLng.lng;
        });

        // Trouver la soirée correspondante au marqueur
        const party = parties.find(p => {
          const markerLatLng = marker.getLatLng();
          return p.latitude === markerLatLng.lat && p.longitude === markerLatLng.lng;
        });

        // Trouver l'hôtel correspondant au marqueur
        const hotel = hotels.find(h => {
          const markerLatLng = marker.getLatLng();
          return h.latitude === markerLatLng.lat && h.longitude === markerLatLng.lng;
        });

        // Trouver le restaurant correspondant au marqueur
        const restaurant = restaurants.find(r => {
          const markerLatLng = marker.getLatLng();
          return r.latitude === markerLatLng.lat && r.longitude === markerLatLng.lng;
        });

        if (venue) {
          // Afficher le marqueur si :
          // 1. Le filtre est sur "all", "match" (tous les sports) ou correspond au sport
          // 2. Le filtre de lieu est sur "Tous" ou correspond au lieu
          const shouldShow = 
            (eventFilter === 'all' || eventFilter === 'match' || eventFilter === venue.sport) &&
            (venueFilter === 'Tous' || venue.id === venueFilter);

          markerElement.style.display = shouldShow ? 'block' : 'none';
          markerElement.style.opacity = shouldShow ? '1' : '0';
        } else if (party) {
          // Afficher le marqueur de soirée si :
          // 1. Le filtre est sur "all" ou "party"
          // 2. Le filtre de lieu correspond
          let partyId = '';
          switch (party.name) {
            case 'Place Stanislas':
              partyId = 'place-stanislas';
              break;
            case 'Centre Prouvé':
              partyId = 'centre-prouve';
              break;
            case 'Zénith':
              partyId = 'zenith';
              break;
            default:
              partyId = party.name.toLowerCase().replace(/\s+/g, '-');
          }

          const shouldShow = 
            (eventFilter === 'all' || eventFilter === 'party') &&
            (venueFilter === 'Tous' || partyId === venueFilter);

          markerElement.style.display = shouldShow ? 'block' : 'none';
          markerElement.style.opacity = shouldShow ? '1' : '0';
        } else if (hotel) {
          // Gérer les hôtels indépendamment des filtres
          const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
          const shouldShow = preferredHotel === 'none' || hotel.id === preferredHotel;
          markerElement.style.display = shouldShow ? 'block' : 'none';
          markerElement.style.opacity = shouldShow ? '1' : '0';
        } else if (restaurant) {
          // Gérer les restaurants indépendamment des filtres
          const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
          const shouldShow = preferredRestaurant === 'none' || restaurant.id === preferredRestaurant;
          markerElement.style.display = shouldShow ? 'block' : 'none';
          markerElement.style.opacity = shouldShow ? '1' : '0';
        }
      }
    });
  };

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
  const getAllDelegations = () => {
    const delegations = new Set<string>();
    venues.forEach(venue => {
      if (venue.matches) {
        venue.matches.forEach(match => {
          const teams = match.teams.split(/vs|VS|contre|CONTRE|,/).map(team => team.trim());
          teams.forEach(team => {
            // Exclure les "..." et les chaînes vides
            if (team && team !== "..." && team !== "…") delegations.add(team);
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
        { value: 'centre-prouve', label: 'Centre Prouvé' },
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
    // Si on est déjà sur le chat, on retourne à l'onglet d'origine
    if (activeTab === 'chat') {
      setActiveTab(chatOriginTab);
      // Déclencher l'auto-scroll si on revient à l'onglet événements
      if (chatOriginTab === 'events') {
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
      // Ne pas ajouter d'entrée dans l'historique pour permettre la navigation continue
    } else {
      // Sinon on mémorise l'onglet actuel comme origine et on ouvre le chat
      setChatOriginTab(activeTab);
      setActiveTab('chat');
      // Ajouter une entrée dans l'historique seulement si on ne vient pas d'une page principale
      if (activeTab !== 'map' && activeTab !== 'home' && activeTab !== 'info') {
        window.history.pushState({ tab: 'chat', origin: activeTab }, '', window.location.pathname);
      }
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
    
    if (event.type === 'party') {
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
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }
  };

  const handleBack = () => {
    switch (activeTab as TabType) {
      case 'planning':
        setActiveTab('events');
        break;
      case 'events':
        setActiveTab('map');
        break;
      case 'calendar':
        setActiveTab('events');
        break;
      case 'chat':
        setActiveTab(chatOriginTab);
        break;
      case 'home':
      case 'info':
        // Pas de retour possible depuis les pages principales
        return;
      default:
        setActiveTab('map');
    }
  };

  const handleTabChange = (tab: 'map' | 'events' | 'chat' | 'planning' | 'calendar' | 'home' | 'info') => {
    // Ajouter une entrée dans l'historique pour toutes les pages secondaires
    if (tab !== 'map' && tab !== 'home' && tab !== 'info') {
      window.history.pushState({ tab }, '', window.location.pathname);
    }
    setPreviousTab(activeTab);
    setActiveTab(tab);
    if (tab === 'planning' || tab === 'calendar') {
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

  // Gestion du bouton physique retour des téléphones
  useEffect(() => {
    let isHandlingPopState = false;

    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingPopState) return;
      isHandlingPopState = true;

      // Pages principales : empêcher complètement la navigation
      if (activeTab === 'map' || activeTab === 'home' || activeTab === 'info') {
        // Empêcher la navigation en ajoutant une nouvelle entrée
        window.history.pushState({ tab: activeTab }, '', window.location.pathname);
        isHandlingPopState = false;
        return;
      }
      
      // Si on est sur le chat, retourner à la page d'origine
      if (activeTab === 'chat') {
        setActiveTab(chatOriginTab);
        // Ne pas ajouter d'entrée dans l'historique ici pour permettre la navigation continue
        isHandlingPopState = false;
        return;
      }
      
      // Pour les autres pages secondaires, gérer selon la logique existante
      switch (activeTab as TabType) {
        case 'planning':
          setActiveTab('events');
          break;
        case 'events':
          setActiveTab('map');
          break;
        case 'calendar':
          setActiveTab('events');
          break;
        default:
          setActiveTab('map');
      }
      
      isHandlingPopState = false;
    };

    // Écouter les événements de navigation (bouton retour physique)
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, chatOriginTab]);

  // Ajouter une entrée dans l'historique pour les pages principales et empêcher le retour
  useEffect(() => {
    if (activeTab === 'map' || activeTab === 'home' || activeTab === 'info') {
      // Remplacer l'entrée actuelle et ajouter une nouvelle pour empêcher le retour
      window.history.replaceState({ tab: activeTab }, '', window.location.pathname);
      window.history.pushState({ tab: activeTab }, '', window.location.pathname);
    }
  }, [activeTab]);

  // Gestion agressive pour empêcher le retour sur les pages principales
  useEffect(() => {
    if (activeTab === 'map' || activeTab === 'home' || activeTab === 'info') {
      const preventBack = (e: PopStateEvent) => {
        if (activeTab === 'map' || activeTab === 'home' || activeTab === 'info') {
          window.history.pushState({ tab: activeTab }, '', window.location.pathname);
        }
      };
      
      window.addEventListener('popstate', preventBack);
      return () => window.removeEventListener('popstate', preventBack);
    }
  }, [activeTab]);

  useEffect(() => {
    // Détecte le retour de 'planning' ou 'calendar' vers 'events' et déclenche le scroll
    if ((previousTabRef.current === 'planning' || previousTabRef.current === 'calendar') && activeTab === 'events') {
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

  const [showVSSForm, setShowVSSForm] = useState(false);


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
      <Header
        onChat={handleOpenChat}
        onEmergency={() => setShowEmergency(true)}
        onAdmin={handleAdminClick}
        showChat={activeTab === 'chat'}
        unreadCount={unreadCount}
        onBack={handleBack}
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

        isBackDisabled={activeTab === 'map' || activeTab === 'home' || activeTab === 'info'}
      />
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
                          <BusLines visibleLines={['T1', 'T5', 'T4']} />
          {/* Pinne temporaire supprimée pour éviter l'affichage de la pinne orange
          {tempMarker && (
            <Marker
              position={tempMarker}
              icon={DefaultIcon}
            >
              <Popup>Nouveau lieu</Popup>
            </Marker>
          )}
          */}
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
                        setIsAddingPlace(true);
                        setEditingVenue({ id: null, venue: null });
                        setNewVenueName('');
                        setNewVenueDescription('');
                        setNewVenueAddress('');
                        setSelectedSport('Football');
                        setTempMarker(null);
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
                    className="planning-button"
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 12px',
                      margin: '0px',
                      marginLeft: '35px',
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
                    onClick={() => handleTabChange('planning')}
                    title="Voir les plannings (bus, tournois, etc.)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    Planning
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
                        style={{ right: '80px', top: '50px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleStarFilterClick}
                        title="Appliquer vos préférences"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1.5L14.5 8.5L22 9L16 14.5L17.5 22L12 18L6.5 22L8 14.5L2 9L9.5 8.5L12 1.5Z"/>
                        </svg>
                      </button>
                      <button
                        className="filter-reset-button"
                        style={{ right: '45px', top: '50px', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                        <option value="party">Soirées et Défilé 🎉</option>
                        <option value="Football">Football ⚽</option>
                        <option value="Basketball">Basketball 🏀</option>
                        <option value="Handball">Handball 🤾</option>
                        <option value="Rugby">Rugby 🏉</option>
                        <option value="Ultimate">Ultimate 🥏</option>
                        <option value="Natation">Natation 🏊</option>
                        <option value="Badminton">Badminton 🏸</option>
                        <option value="Tennis">Tennis 🎾</option>
                        <option value="Cross">Cross 🏃</option>
                        <option value="Volleyball">Volleyball 🏐</option>
                        <option value="Ping-pong">Ping-pong 🏓</option>
                        <option value="Boxe">Boxe 🥊</option>
                        <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
                        <option value="Pétanque">Pétanque 🍹</option>
                        <option value="Escalade">Escalade 🧗‍♂️</option>
                        <option value="Jeux de société">Jeux de société 🎲</option>
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
                  {getFilteredEvents().map(event => (
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
                          ) : event.name === 'Zénith' && event.description.includes('DJ contest') ? (
                            <>
                              <span>🎧</span>
                              <span>DJ CONTEST</span>
                            </>
                          ) : event.name === 'Zénith' && event.description.includes('Soirée du 17 avril') ? (
                            <>
                              <span>🏆</span>
                              <span>RÉSULTATS</span>
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
                          {event.name !== 'Place Stanislas' && (
                            <div className="party-bus">
                              <h4>Bus : <a href="/plannings/planning-bus.pdf" target="_blank" rel="noopener noreferrer">Voir le planning des bus 🚌 </a></h4>
                            </div>
                          )}
                          {event.name === 'Centre Prouvé' && (
                            <div className="party-results">
                              <h4 style={{ color: 'var(--success-color)', marginTop: '10px' }}>
                                Résultat : {localStorage.getItem('centre-prouve-result') || 'à venir'}
                              </h4>
                            </div>
                          )}
                          {event.name === 'Zénith' && event.description.includes('DJ contest') && (
                            <div className="party-results">
                              <h4 style={{ color: 'var(--success-color)', marginTop: '10px' }}>
                                Résultat : {localStorage.getItem('zenith-dj-contest-result') || 'à venir'}
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
            {/* AJOUTER panneau Planning */}
            {activeTab === 'planning' && (
              <div className="planning-panel">
                <div className="planning-panel-header">
                  <h3>Plannings</h3>
                </div>
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  maxWidth: 800, 
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <PlanningFiles isAdmin={isAdmin} />
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="chat-panel">
                <div className="chat-panel-header">
                  <h3>Messages de l'orga</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isAdmin && isEditing && (
                      <button
                        className="add-message-button"
                        onClick={() => setShowAddMessage((v) => !v)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 20, width: 70, marginTop: '3.8rem' }}
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
                        // Ajuster automatiquement la hauteur
                        e.target.style.height = '25px'; // Reset d'abord à la hauteur minimale
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; // Limiter à 200px max
                      }}
                      placeholder="Votre message..."
                      style={{
                        flex: 1,
                        height: '25px', // Hauteur initiale
                        minHeight: '25px',
                        maxHeight: '200px', 
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-color)',
                        resize: 'none',
                        overflowY: 'auto', // Permettre le scroll vertical si nécessaire
                        marginTop: '2rem',
                        transition: 'height 0.1s ease' // Animation fluide du changement de hauteur
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
                      <div className="chat-message-content" style={{ paddingBottom: isAdmin ? 28 : 0, textAlign: 'left' }}>
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
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--text-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            zIndex: 1
                          }}
                        >
                          {translatedMessages[message.id || `msg-${index}`] ? "Original" : "🌐 Translate"}
                        </button>
                      </div>
                                             {/* Boutons admin en bas à droite */}
                       {isAdmin && isEditing && editingMessageIndex !== index && (
                         <div style={{ position: 'absolute', right: '100px', bottom: '0px', display: 'flex'}}>
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
                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3498db', fontSize: 16 }}
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
                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16, marginLeft: '-20px' }}
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
                <input id="match-description" type="text" value={editingMatch.match ? editingMatch.match.description : newMatch.description} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, description: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, description: e.target.value }); } }} placeholder="Ex: Phase de poules M" className="modal-form-input" />
              </div>
              <div className="modal-form-group">
                <label htmlFor="match-result">Résultat</label>
                <input id="match-result" type="text" value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')} onChange={(e) => { if (editingMatch.match) { const updatedMatch = { ...editingMatch.match, result: e.target.value }; setEditingMatch({ ...editingMatch, match: updatedMatch }); } else { setNewMatch({ ...newMatch, result: e.target.value }); } }} placeholder="Ex: 2-1" className="modal-form-input" />
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => { if (editingMatch.match) { handleUpdateMatch(editingMatch.venueId!, editingMatch.match.id, { date: editingMatch.match.date, endTime: editingMatch.match.endTime || '', teams: editingMatch.match.teams, description: editingMatch.match.description, result: editingMatch.match.result }); finishEditingMatch(); } else { handleAddMatch(editingMatch.venueId!); } }} disabled={editingMatch.match ? !editingMatch.match.date || !editingMatch.match.teams || !editingMatch.match.description : !newMatch.date || !newMatch.teams || !newMatch.description}>{editingMatch.match ? 'Mettre à jour' : 'Ajouter'}</button>
                <button className="modal-form-cancel" onClick={finishEditingMatch}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulaire d'édition de lieu */}
      {isAddingPlace && (
        <div className="modal-form-overlay">
          <div className="modal-form-container">
            <div className="modal-form-header">
              <h2>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un lieu'}</h2>
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
                  <option value="Cross">Cross 🏃</option>
                  <option value="Volleyball">Volleyball 🏐</option>
                  <option value="Ping-pong">Ping-pong 🏓</option>
                  <option value="Boxe">Boxe 🥊</option>
                  <option value="Athlétisme">Athlétisme 🏃‍♂️</option>
                  <option value="Pétanque">Pétanque 🍹</option>
                  <option value="Escalade">Escalade 🧗‍♂️</option>
                  <option value="Jeux de société">Jeux de société 🎲</option>
                </select>
              </div>
              <div className="modal-form-actions">
                <button className="modal-form-submit" onClick={() => handleAddVenue()} disabled={!newVenueName || !newVenueAddress}>Ajouter</button>
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
        showChat={activeTab === 'chat'}
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
        onBack={handleBack}
        isBackDisabled={activeTab === 'map' || activeTab === 'home' || activeTab === 'info'}
      />
      <EmergencyPopup
        isOpen={showEmergency}
        onClose={() => setShowEmergency(false)}
        onShowVSS={() => setShowVSSForm(true)}
      />
      {/* Formulaire VSS */}
      {showVSSForm && (
        <VSSForm onClose={() => setShowVSSForm(false)} />
      )}

              {/* Modal d'édition du résultat de la soirée pompom */}
        {showEditResultModal && (
          <div className="modal-form-overlay">
            <div className="modal-form-container">
              <div className="modal-form-header">
                <h2>
                  {editingPartyResult.partyId === '2' ? 'Résultat du show pompom' : 
                   editingPartyResult.partyId === '3' ? 'Résultat du DJ Contest' : 
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
                    disabled={!editingResult.trim()}
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
                  {editingPartyDescription.partyId === '2' ? 'Description du show pompom' : 
                   editingPartyDescription.partyId === '3' ? 'Description du DJ Contest' : 
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
                    disabled={!editingDescription.trim()}
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
                    disabled={!editingHotelDescriptionText.trim()}
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
                    disabled={!editingRestaurantDescriptionText.trim()}
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

      <Outlet />
    </div>
  );
}

export default App;
