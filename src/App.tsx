import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon, LatLng } from 'leaflet';
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { auth, database, loginWithGoogle, handleGoogleRedirect } from './firebase';
import L from 'leaflet';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import CalendarPopup from './components/CalendarPopup';
import { Venue, Match } from './types';
import PlanningFiles from './components/PlanningFiles';
import { Outlet, useLocation} from 'react-router-dom';
import { useAppPanels, TabType } from './AppPanelsContext';
import Header from './components/Header';

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
console.log('[GA] ID de mesure utilisé:', GA_MEASUREMENT_ID);

// Configuration avec mode test activé pour la validation
ReactGA.initialize(GA_MEASUREMENT_ID, {
  testMode: process.env.NODE_ENV !== 'production',
  gaOptions: {
    sendPageView: false // Nous enverrons manuellement le pageview
  }
});

// Afficher explicitement l'objet ReactGA pour le déboggage
console.log('[GA] Objet ReactGA:', ReactGA);

// Envoyer un événement test pour vérifier la connexion
ReactGA.event({
  category: 'testing',
  action: 'ga_test',
  label: 'Validation de connexion GA4'
});

console.log('[GA] Google Analytics initialisé en mode test');

// Composant pour la géolocalisation
function LocationMarker() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const map = useMap();
  const lastErrorTime = useRef<number>(0);
  const [isLocationEnabled, setIsLocationEnabled] = useState(() => {
    const stored = localStorage.getItem('location');
    return stored === null ? true : stored === 'true';
  });

  // Écouter les changements de l'état de localisation
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'location') {
        const newValue = e.newValue === 'true';
        setIsLocationEnabled(newValue);
        if (!newValue) {
          setPosition(null);
          setError(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!isLocationEnabled) {
      setPosition(null);
      setError(null);
      return;
    }

    if (map) {
      if (!navigator.geolocation) {
        setError("La géolocalisation n'est pas supportée par votre navigateur");
        return;
      }
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newPosition = new LatLng(latitude, longitude);
          setPosition(newPosition);
          map.flyTo(newPosition, 16);
          setError(null);
          setIsLoading(false);
        },
        (err) => {
          setIsLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            // Ne pas afficher d'erreur si refus explicite
            return;
          }
          const now = Date.now();
          if (now - lastErrorTime.current < 3000) {
            // Moins de 3s depuis la dernière erreur, ne pas réafficher
            return;
          }
          lastErrorTime.current = now;
          let errorMessage = "Erreur de géolocalisation";
          switch (err.code) {
            case err.POSITION_UNAVAILABLE:
              errorMessage = "La position n'est pas disponible. Vérifiez que la géolocalisation est activée sur votre appareil.";
              break;
            case err.TIMEOUT:
              errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
              break;
          }
          setError(errorMessage);
        },
        options
      );
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newPosition = new LatLng(latitude, longitude);
          setPosition(newPosition);
          setError(null);
        },
        () => {
          // Ne pas afficher d'erreur pour le watchPosition
        },
        options
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [map, isLocationEnabled]);

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
          <button className="retry-button" onClick={() => {
            setError(null);
            setIsLoading(true);
            if (map) {
              const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              };
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  const newPosition = new LatLng(latitude, longitude);
                  setPosition(newPosition);
                  map.flyTo(newPosition, 16);
                  setIsLoading(false);
                },
                (err) => {
                  setIsLoading(false);
                  console.error('Erreur de géolocalisation:', err);
                  let errorMessage = "Erreur de géolocalisation";
                  switch (err.code) {
                    case err.PERMISSION_DENIED:
                      errorMessage = "L'accès à la géolocalisation a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
                      break;
                    case err.POSITION_UNAVAILABLE:
                      errorMessage = "La position n'est pas disponible. Vérifiez que la géolocalisation est activée sur votre appareil.";
                      break;
                    case err.TIMEOUT:
                      errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
                      break;
                  }
                  setError(errorMessage);
                },
                options
              );
            }
          }}>
            Réessayer
          </button>
          <button className="retry-button" onClick={() => setError(null)}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return position === null ? null : (
    <Marker position={position} icon={UserIcon}>
      <Popup>Vous êtes ici</Popup>
    </Marker>
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

// Déclaration du type pour window.handleGoogleRedirect
declare global {
  interface Window {
    handleGoogleRedirect?: () => void;
  }
}

function App() {
  const { activeTab, setActiveTab, showAddMessage, setShowAddMessage, showEmergency, setShowEmergency, closeAllPanels, isEditing, setIsEditing } = useAppPanels();
  const location = useLocation();

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
  const [newMessageSender, setNewMessageSender] = useState('Organisation'); 
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
  const [previousTab, setPreviousTab] = useState<'map' | 'events' | 'chat' | 'planning' | 'calendar'>('map');
  
  useEffect(() => {
    if (location.pathname === '/map') {
      setActiveTab('map');
    }
  }, [location.pathname]);
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gestion de la redirection Google au chargement
  useEffect(() => {
    console.log('useEffect handleGoogleRedirect appelé');
    handleGoogleRedirect().then(user => {
      if (user) {
        console.log('Redirection Google, user:', user);
        setUser(user);
      }
    }).catch(error => {
      console.error('Erreur lors de la redirection Google:', error);
    });
  }, []);

  // Listener d'authentification Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      console.log('onAuthStateChanged, user:', user);
      if (user) {
        const adminsRef = ref(database, 'admins');
        onValue(adminsRef, (snapshot) => {
          const admins = snapshot.val();
          console.log('admins:', admins, 'user.uid:', user.uid);
          setIsAdmin(admins && admins[user.uid]);
        });
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lecture en temps réel des messages depuis Firebase
  useEffect(() => {
    const messagesRef = ref(database, 'chatMessages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Transforme l'objet en tableau [{id, ...}]
      const messagesArray = Object.entries(data).map(([id, value]) => ({ id, ...(value as any) }));
      
      // Initialiser le timestamp de dernière lecture seulement si c'est la première fois
      if (!localStorage.getItem('lastSeenChatTimestamp')) {
        const now = Date.now();
        localStorage.setItem('lastSeenChatTimestamp', String(now));
      }
      
      setMessages(messagesArray);
    });
    return () => unsubscribe();
  }, []);

  // Ajout d'un message dans Firebase (avec nom personnalisé)
  const handleAddMessage = (msg: string, sender: string) => {
    const newMsgRef = push(ref(database, 'chatMessages'));
    set(newMsgRef, {
      content: msg,
      sender: sender || 'Organisation',
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
    // TODO: Intégrer ici FCM (Firebase Cloud Messaging) pour notifications push sur mobile/app
  };

  // Modification d'un message dans Firebase (texte et nom)
  const handleEditMessage = (id: string, newContent: string, newSender: string) => {
    update(ref(database, `chatMessages/${id}`), { content: newContent, sender: newSender || 'Organisation' });
  };

  // Suppression d'un message dans Firebase
  const handleDeleteMessage = (id: string) => {
    remove(ref(database, `chatMessages/${id}`));
  };

  // Fonction pour vérifier les droits d'administration avant d'exécuter une action
  const checkAdminRights = () => {
    if (!isAdmin) {
      alert('Cette action nécessite des droits d\'administrateur.');
      return false;
    }
    return true;
  };

  const [hotels] = useState<Hotel[]>([
    {
      id: '1',
      name: "ibis budget Nancy Porte Sud",
      position: [48.638751, 6.183532],
      description: "+33 892 68 31 25",
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
      description: "+33 3 83 44 66 00",
      address: "1 Av. de la Forêt de Haye, 54500 Vandœuvre-lès-Nancy",
      type: 'hotel',
      date: '',
      latitude: 48.650667,
      longitude: 6.146258,
      emoji: '🏢',
      sport: 'Hotel',
      matches: []
    },
  ]);

  const [restaurants] = useState<Restaurant[]>([
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
  ]);

  const [parties] = useState<Party[]>([
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
      name: "Centre Prouvé",
      position: [48.687858, 6.176977],
      description: "Soirée Pompoms du 16 avril, 21h-3h",
      address: "1 Pl. de la République, 54000 Nancy",
      type: 'party',
      date: '2026-04-16T21:00:00',
      latitude: 48.687858,
      longitude: 6.176977,
      emoji: '🎀',
      sport: 'Pompom'
    },
    {
      id: '3',
      name: "Parc des Expositions",
      position: [48.663272, 6.190715],
      description: "Soirée du 17 avril, 22h-4h",
      address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
      type: 'party',
      date: '2026-04-17T22:00:00',
      latitude: 48.663272,
      longitude: 6.190715,
      emoji: '🎉',
      sport: 'Party'
    },
    {
      id: '4',
      name: "Zénith",
      position: [48.710237, 6.139252],
      description: "Soirée du 18 avril, 20h-4h",
      address: "Rue du Zénith, 54320 Maxéville",
      type: 'party',
      date: '2026-04-18T20:00:00',
      latitude: 48.710237,
      longitude: 6.139252,
      emoji: '🎉',
      sport: 'Party'
    }
  ]);

  // Charger les lieux depuis Firebase au démarrage
  useEffect(() => {
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
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [delegationFilter, setDelegationFilter] = useState<string>('all');
  const [venueFilter, setVenueFilter] = useState<string>('Tous');
  const [showFemale, setShowFemale] = useState<boolean>(true);
  const [showMale, setShowMale] = useState<boolean>(true);
  const [showMixed, setShowMixed] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [appAction, setAppAction] = useState<number>(0);
  const [fromEvents, setFromEvents] = useState(false);
  const [isStarFilterActive, setIsStarFilterActive] = useState(false);

  // État pour l'historique des actions et l'index actuel
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('favorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });

  // Fonction pour gérer les favoris
  const toggleFavorite = (placeId: string) => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(placeId);
    if (index === -1) {
      favorites.push(placeId);
    } else {
      favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    triggerMarkerUpdate();
  };

  // Déplacer la définition de triggerMarkerUpdate ici, avant son utilisation
  const triggerMarkerUpdate = () => {
    setAppAction(prev => prev + 1);
    if (mapRef.current) {
      // Nettoyer les marqueurs existants
      markersRef.current.forEach(marker => {
        marker.remove();
      });
      markersRef.current = [];

      // Recréer tous les marqueurs
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
      triggerMarkerUpdate(); // Ajouter cette ligne
      
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
      triggerMarkerUpdate(); // Ajouter cette ligne
      
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
      triggerMarkerUpdate(); // Ajouter cette ligne
      
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
        triggerMarkerUpdate(); // Ajouter cette ligne
        
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
      triggerMarkerUpdate(); // Ajouter cette ligne
      
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
          triggerMarkerUpdate(); // Ajouter cette ligne
          
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
    setIsAddingPlace(false);
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
      events.push({
        id: `party-${party.id || party.name}`,
        name: party.name,
        date: party.date,
        description: party.description,
        address: party.address || `${party.latitude}, ${party.longitude}`,
        location: [party.latitude, party.longitude],
        type: 'party',
        isPassed: isMatchPassed(party.date, undefined, 'party'),
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
      const delegationMatch = delegationFilter === 'all' || 
        (event.teams && event.teams.toLowerCase().includes(delegationFilter.toLowerCase()));

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
            case 'Parc des Expositions':
              partyId = 'parc-expo';
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
  const openInGoogleMaps = (place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    window.open(url, '_blank');
  };

  // Fonction pour gérer l'ouverture des popups
  const handlePopupOpen = (venueId: string) => {
    setOpenPopup(venueId);
    triggerMarkerUpdate();
    
    // Utiliser un MutationObserver pour détecter quand le popup est chargé
    const observer = new MutationObserver((mutations, obs) => {
      const popup = document.querySelector('.leaflet-popup-content');
      if (popup) {
        const matchesList = popup.querySelector('.matches-list');
        if (matchesList) {
          // Scroll vers le haut de la liste des matchs
          matchesList.scrollTo({ top: 0, behavior: 'smooth' });
          // Une fois que nous avons scrollé, on arrête d'observer
          obs.disconnect();
        }
      }
    });

    // Observer les changements dans le document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Arrêter l'observation après 2 secondes au cas où
    setTimeout(() => {
      observer.disconnect();
    }, 2000);
  };

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
      markersRef.current.forEach(marker => {
        marker.remove();
      });
      markersRef.current = [];

      // Ajouter les marqueurs pour les lieux
      venues.forEach(venue => {
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
        
        // Contenu de base du lieu
        popupContent.innerHTML = `
          <h3>${venue.name}</h3>
          <p>${venue.description}</p>
          <p><strong>Sport:</strong> ${venue.sport}</p>
          <p class="venue-address">${venue.address || `${venue.latitude}, ${venue.longitude}`}</p>
        `;

        // Boutons d'actions
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'popup-buttons';
        
        // Bouton Favoris
        const favoriteButton = document.createElement('button');
        favoriteButton.className = `favorite-button ${favorites.includes(venue.id) ? 'active' : ''}`;
        favoriteButton.innerHTML = favorites.includes(venue.id) ? '★' : '☆';
        favoriteButton.addEventListener('click', () => {
          toggleFavorite(venue.id);
          favoriteButton.className = `favorite-button ${favorites.includes(venue.id) ? 'active' : ''}`;
          favoriteButton.innerHTML = favorites.includes(venue.id) ? '★' : '☆';
        });
        buttonsContainer.appendChild(favoriteButton);
        
        // Bouton Google Maps
        const mapsButton = document.createElement('button');
        mapsButton.className = 'maps-button';
        mapsButton.textContent = 'Ouvrir dans Google Maps';
        mapsButton.addEventListener('click', () => {
          openInGoogleMaps(venue);
        });
        buttonsContainer.appendChild(mapsButton);
        
        // Bouton Copier l'adresse
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copier l\'adresse';
        copyButton.addEventListener('click', () => {
          copyToClipboard(venue.address || `${venue.latitude},${venue.longitude}`);
        });
        buttonsContainer.appendChild(copyButton);
        
        popupContent.appendChild(buttonsContainer);

        marker.bindPopup(popupContent);
        
        marker.on('click', () => {
          handlePopupOpen(venue.id || '');
        });

        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });

      // Ajouter les marqueurs pour les hôtels
      hotels.forEach(hotel => {
        // Vérifier si l'hôtel doit être affiché selon les préférences
        const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
        const shouldShow = preferredHotel === 'none' || hotel.id === preferredHotel;

        if (shouldShow) {
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

          // Créer le contenu du popup
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          
          // Contenu de base de l'hôtel
          popupContent.innerHTML = `
            <h3>${hotel.name}</h3>
            <p>${hotel.description}</p>
            <p class="venue-address">${hotel.address || `${hotel.latitude}, ${hotel.longitude}`}</p>
          `;
          
          // Boutons d'actions
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'popup-buttons';
          
          // Bouton Google Maps
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', () => {
            openInGoogleMaps(hotel);
          });
          buttonsContainer.appendChild(mapsButton);
          
          // Bouton Copier l'adresse
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(hotel.address || `${hotel.latitude},${hotel.longitude}`);
          });
          buttonsContainer.appendChild(copyButton);
          
          popupContent.appendChild(buttonsContainer);

          marker.bindPopup(popupContent);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          }
        }
      });

      // Ajouter les marqueurs pour les restaurants
      restaurants.forEach(restaurant => {
        // Vérifier si le restaurant doit être affiché selon les préférences
        const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
        const shouldShow = preferredRestaurant === 'none' || restaurant.id === preferredRestaurant;

        if (shouldShow) {
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

          // Créer le contenu du popup pour le restaurant
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          
          // Contenu de base du restaurant
          popupContent.innerHTML = `
            <h3>${restaurant.name}</h3>
            <p>${restaurant.description}</p>
            <p class="venue-address">${restaurant.address}</p>
          `;
          
          // Boutons d'actions
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'popup-buttons';
          
          // Bouton Favoris
          const favoriteButton = document.createElement('button');
          favoriteButton.className = `favorite-button ${favorites.includes(restaurant.id) ? 'active' : ''}`;
          favoriteButton.innerHTML = favorites.includes(restaurant.id) ? '★' : '☆';
          favoriteButton.addEventListener('click', () => {
            toggleFavorite(restaurant.id);
            favoriteButton.className = `favorite-button ${favorites.includes(restaurant.id) ? 'active' : ''}`;
            favoriteButton.innerHTML = favorites.includes(restaurant.id) ? '★' : '☆';
          });
          buttonsContainer.appendChild(favoriteButton);
          
          // Bouton Google Maps
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', () => {
            openInGoogleMaps(restaurant);
          });
          buttonsContainer.appendChild(mapsButton);
          
          // Bouton Copier l'adresse
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(restaurant.address || `${restaurant.latitude},${restaurant.longitude}`);
          });
          buttonsContainer.appendChild(copyButton);
          
          popupContent.appendChild(buttonsContainer);

          marker.bindPopup(popupContent);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          }
        }
      });

      // Ajouter les marqueurs pour les soirées
      parties.forEach(party => {
        const marker = L.marker([party.latitude, party.longitude], {
          icon: L.divIcon({
            className: 'custom-marker party-marker',
            html: `<div style="background-color: #9C27B0; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                     <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${party.sport === 'Pompom' ? '🎀' : party.sport === 'Defile' ? '🎺' : '🎉'}</span>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
          })
        });

        // Créer le contenu du popup pour la soirée
        const popupContent = document.createElement('div');
        popupContent.className = 'venue-popup';
        
        // Contenu de base de la soirée
        popupContent.innerHTML = `
          <h3>${party.name}</h3>
          <p>${party.description}</p>
          <p class="venue-address">${party.address}</p>
          ${party.name !== 'Place Stanislas' ? '<div class="party-bus"><h4>Bus : <a href="/plannings/planning-bus.pdf" target="_blank" rel="noopener noreferrer">Voir le planning des bus 🚌 </a></h4></div>' : ''}
        `;
        
        // Boutons d'actions
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'popup-buttons';
        
        // Bouton Favoris
        const favoriteButton = document.createElement('button');
        favoriteButton.className = `favorite-button ${favorites.includes(party.id) ? 'active' : ''}`;
        favoriteButton.innerHTML = favorites.includes(party.id) ? '★' : '☆';
        favoriteButton.addEventListener('click', () => {
          toggleFavorite(party.id);
          favoriteButton.className = `favorite-button ${favorites.includes(party.id) ? 'active' : ''}`;
          favoriteButton.innerHTML = favorites.includes(party.id) ? '★' : '☆';
        });
        buttonsContainer.appendChild(favoriteButton);
        
        // Bouton Google Maps
        const mapsButton = document.createElement('button');
        mapsButton.className = 'maps-button';
        mapsButton.textContent = 'Ouvrir dans Google Maps';
        mapsButton.addEventListener('click', () => {
          openInGoogleMaps(party);
        });
        buttonsContainer.appendChild(mapsButton);
        
        // Bouton Copier l'adresse
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copier l\'adresse';
        copyButton.addEventListener('click', () => {
          copyToClipboard(party.address || `${party.latitude},${party.longitude}`);
        });
        buttonsContainer.appendChild(copyButton);
        
        popupContent.appendChild(buttonsContainer);

        marker.bindPopup(popupContent);
        
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      });
    }
  }, [venues, hotels, parties, restaurants, isEditing, isAdmin, favorites]);

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

    // Nettoyer les marqueurs existants
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // Ajouter les marqueurs pour les lieux
    venues.forEach(venue => {
      // Vérifier si le lieu doit être affiché selon les filtres
      const hasMatchingDelegation = delegationFilter === 'all' || 
        (venue.matches && venue.matches.some(match => 
          match.teams.toLowerCase().includes(delegationFilter.toLowerCase())
        ));

      const shouldShow = 
        (eventFilter === 'all' || eventFilter === 'match' || eventFilter === venue.sport) &&
        (venueFilter === 'Tous' || venue.id === venueFilter) &&
        hasMatchingDelegation;

      if (shouldShow) {
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
        
        // Contenu de base du lieu
        popupContent.innerHTML = `
          <h3>${venue.name}</h3>
          <p>${venue.description}</p>
          <p><strong>Sport:</strong> ${venue.sport}</p>
          <p class="venue-address">${venue.address || `${venue.latitude}, ${venue.longitude}`}</p>
        `;

        // Ajouter les matchs si présents
        if (venue.matches && venue.matches.length > 0) {
          const matchesList = document.createElement('div');
          matchesList.className = 'matches-list';
          matchesList.innerHTML = '<h4>Matchs :</h4>';
          
          // Trier les matchs par date
          const sortedMatches = [...venue.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          sortedMatches.forEach(match => {
            // Ne montrer que les matchs de la délégation sélectionnée
            if (delegationFilter === 'all' || match.teams.toLowerCase().includes(delegationFilter.toLowerCase())) {
              const matchElement = document.createElement('div');
              matchElement.className = `match-item ${isMatchPassed(match.date, match.endTime) ? 'match-passed' : ''}`;
              matchElement.innerHTML = `
                <p class="match-date">${formatDateTime(match.date, match.endTime)}</p>
                <p class="match-teams">${match.teams}</p>
                <p class="match-description">${match.description}</p>
                ${match.result ? `<p class="match-result"><strong>Résultat :</strong> ${match.result}</p>` : ''}
              `;

              // Ajouter les boutons d'édition si on est en mode admin ET en mode édition
              if (isAdmin && isEditing) {
                const matchActions = document.createElement('div');
                matchActions.className = 'match-actions';
                matchActions.innerHTML = `
                  <button class="edit-match-button" onclick="event.stopPropagation();">
                    ✏️
                  </button>
                  <button class="delete-match-button" onclick="event.stopPropagation();">
                    🗑️
                  </button>
                `;

                // Ajouter les gestionnaires d'événements pour les boutons
                const editButton = matchActions.querySelector('.edit-match-button');
                const deleteButton = matchActions.querySelector('.delete-match-button');

                if (editButton) {
                  editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startEditingMatch(venue.id, match);
                  });
                }

                if (deleteButton) {
                  deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
                      deleteMatch(venue.id, match.id);
                    }
                  });
                }

                matchElement.appendChild(matchActions);
              }

              matchesList.appendChild(matchElement);
            }
          });

          // Ajouter le style pour les matchs passés
          const style = document.createElement('style');
          style.textContent = `
            .match-passed {
              opacity: 0.5;
              filter: grayscale(100%);
            }
            .match-passed p {
              color: var(--text-color-light);
            }
          `;
          document.head.appendChild(style);

          // Défiler vers le premier match non passé
          setTimeout(() => {
            const firstNonPassedMatch = matchesList.querySelector('.match-item:not(.match-passed)');
            if (firstNonPassedMatch) {
              firstNonPassedMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);

          popupContent.appendChild(matchesList);

          // Ajouter le bouton pour ajouter un nouveau match si on est en mode admin ET en mode édition
          // et que le lieu n'est pas un restaurant, une soirée ou un hôtel
          if (isAdmin && isEditing && venue.type === 'venue') {
            const addMatchButton = document.createElement('button');
            addMatchButton.className = 'add-match-button';
            addMatchButton.textContent = 'Ajouter un match';
            addMatchButton.addEventListener('click', (e) => {
              e.stopPropagation();
              startEditingMatch(venue.id, null);
            });
            popupContent.appendChild(addMatchButton);
          }
        } else {
          // Si aucun match n'est présent, afficher un message et le bouton d'ajout si applicable
          const noMatchesMessage = document.createElement('p');
          noMatchesMessage.textContent = 'Aucun match prévu';
          popupContent.appendChild(noMatchesMessage);

          // Ajouter le bouton pour ajouter un nouveau match si on est en mode admin ET en mode édition
          // et que le lieu n'est pas un restaurant, une soirée ou un hôtel
          if (isAdmin && isEditing && venue.type === 'venue') {
            const addMatchButton = document.createElement('button');
            addMatchButton.className = 'add-match-button';
            addMatchButton.textContent = 'Ajouter un match';
            addMatchButton.addEventListener('click', (e) => {
              e.stopPropagation();
              startEditingMatch(venue.id, null);
            });
            popupContent.appendChild(addMatchButton);
          }
        }

        // Boutons d'actions
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'popup-buttons';
        
        // Bouton Google Maps
        const mapsButton = document.createElement('button');
        mapsButton.className = 'maps-button';
        mapsButton.textContent = 'Ouvrir dans Google Maps';
        mapsButton.addEventListener('click', () => {
          openInGoogleMaps(venue);
        });
        buttonsContainer.appendChild(mapsButton);
        
        // Bouton Copier l'adresse
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copier l\'adresse';
        copyButton.addEventListener('click', () => {
          copyToClipboard(venue.address || `${venue.latitude},${venue.longitude}`);
        });
        buttonsContainer.appendChild(copyButton);

        // Ajouter les boutons d'édition si on est en mode admin ET en mode édition
        if (isAdmin && isEditing) {
          const editButton = document.createElement('button');
          editButton.className = 'edit-button';
          editButton.textContent = 'Modifier';
          editButton.addEventListener('click', () => {
            startEditingVenue(venue);
          });
          buttonsContainer.appendChild(editButton);

          const deleteButton = document.createElement('button');
          deleteButton.className = 'delete-button';
          deleteButton.textContent = 'Supprimer';
          deleteButton.addEventListener('click', () => {
            if (window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) {
              deleteVenue(venue.id);
            }
          });
          buttonsContainer.appendChild(deleteButton);
        }
        
        popupContent.appendChild(buttonsContainer);

        marker.bindPopup(popupContent);
        
        if (mapRef.current) {
          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
        }
      }
    });

    // Ajouter les marqueurs pour les hôtels
    if (eventFilter === 'all') {
      hotels.forEach(hotel => {
        // Vérifier si l'hôtel doit être affiché selon les préférences
        const preferredHotel = localStorage.getItem('preferredHotel') || 'none';
        const shouldShow = preferredHotel === 'none' || hotel.id === preferredHotel;

        if (shouldShow) {
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

          // Créer le contenu du popup
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          
          // Contenu de base de l'hôtel
          popupContent.innerHTML = `
            <h3>${hotel.name}</h3>
            <p>${hotel.description}</p>
            <p class="venue-address">${hotel.address || `${hotel.latitude}, ${hotel.longitude}`}</p>
          `;
          
          // Boutons d'actions
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'popup-buttons';
          
          // Bouton Google Maps
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', () => {
            openInGoogleMaps(hotel);
          });
          buttonsContainer.appendChild(mapsButton);
          
          // Bouton Copier l'adresse
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(hotel.address || `${hotel.latitude},${hotel.longitude}`);
          });
          buttonsContainer.appendChild(copyButton);

          // Ajouter les boutons d'édition si on est en mode admin ET en mode édition
          if (isAdmin && isEditing) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = 'Modifier';
            editButton.addEventListener('click', () => {
              startEditingVenue(hotel as Venue);
            });
            buttonsContainer.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Supprimer';
            deleteButton.addEventListener('click', () => {
              if (window.confirm('Êtes-vous sûr de vouloir supprimer cet hôtel ?')) {
                deleteVenue(hotel.id);
              }
            });
            buttonsContainer.appendChild(deleteButton);
          }
          
          popupContent.appendChild(buttonsContainer);

          marker.bindPopup(popupContent);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          }
        }
      });
    }

    // Ajouter les marqueurs pour les restaurants
    if (eventFilter === 'all') {
      restaurants.forEach(restaurant => {
        // Vérifier si le restaurant doit être affiché selon les préférences
        const preferredRestaurant = localStorage.getItem('preferredRestaurant') || 'none';
        const shouldShow = preferredRestaurant === 'none' || restaurant.id === preferredRestaurant;

        if (shouldShow) {
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

          // Créer le contenu du popup pour le restaurant
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          
          // Contenu de base du restaurant
          popupContent.innerHTML = `
            <h3>${restaurant.name}</h3>
            <p>${restaurant.description}</p>
            <p class="venue-address">${restaurant.address}</p>
          `;
          
          // Boutons d'actions
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'popup-buttons';
          
          // Bouton Google Maps
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', () => {
            openInGoogleMaps(restaurant);
          });
          buttonsContainer.appendChild(mapsButton);
          
          // Bouton Copier l'adresse
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(restaurant.address || `${restaurant.latitude},${restaurant.longitude}`);
          });
          buttonsContainer.appendChild(copyButton);

          // Ajouter les boutons d'édition si on est en mode admin ET en mode édition
          if (isAdmin && isEditing) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = 'Modifier';
            editButton.addEventListener('click', () => {
              startEditingVenue(restaurant as Venue);
            });
            buttonsContainer.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Supprimer';
            deleteButton.addEventListener('click', () => {
              if (window.confirm('Êtes-vous sûr de vouloir supprimer ce restaurant ?')) {
                deleteVenue(restaurant.id);
              }
            });
            buttonsContainer.appendChild(deleteButton);
          }
          
          popupContent.appendChild(buttonsContainer);

          marker.bindPopup(popupContent);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          }
        }
      });
    }

    // Ajouter les marqueurs pour les soirées
    if (eventFilter === 'all' || eventFilter === 'party') {
      parties.forEach(party => {
        let partyId = '';
        switch (party.name) {
          case 'Place Stanislas':
            partyId = 'place-stanislas';
            break;
          case 'Centre Prouvé':
            partyId = 'centre-prouve';
            break;
          case 'Parc des Expositions':
            partyId = 'parc-expo';
            break;
          case 'Zénith':
            partyId = 'zenith';
            break;
          default:
            partyId = party.name.toLowerCase().replace(/\s+/g, '-');
        }

        const shouldShow = venueFilter === 'Tous' || partyId === venueFilter;

        if (shouldShow) {
          const marker = L.marker([party.latitude, party.longitude], {
            icon: L.divIcon({
              className: 'custom-marker party-marker',
              html: `<div style="background-color: #9C27B0; color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                       <span style="font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${party.sport === 'Pompom' ? '🎀' : party.sport === 'Defile' ? '🎺' : '🎉'}</span>
                     </div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
              popupAnchor: [0, -15]
            })
          });

          // Créer le contenu du popup pour la soirée
          const popupContent = document.createElement('div');
          popupContent.className = 'venue-popup';
          
          // Contenu de base de la soirée
          popupContent.innerHTML = `
            <h3>${party.name}</h3>
            <p>${party.description}</p>
            <p class="venue-address">${party.address}</p>
            ${party.name !== 'Place Stanislas' ? '<div class="party-bus"><h4>Bus : <a href="/plannings/planning-bus.pdf" target="_blank" rel="noopener noreferrer">Voir le planning des bus 🚌 </a></h4></div>' : ''}
          `;
          
          // Boutons d'actions
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'popup-buttons';
          
          // Bouton Google Maps
          const mapsButton = document.createElement('button');
          mapsButton.className = 'maps-button';
          mapsButton.textContent = 'Ouvrir dans Google Maps';
          mapsButton.addEventListener('click', () => {
            openInGoogleMaps(party);
          });
          buttonsContainer.appendChild(mapsButton);
          
          // Bouton Copier l'adresse
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.textContent = 'Copier l\'adresse';
          copyButton.addEventListener('click', () => {
            copyToClipboard(party.address || `${party.latitude},${party.longitude}`);
          });
          buttonsContainer.appendChild(copyButton);

          // Ajouter les boutons d'édition si on est en mode admin ET en mode édition
          if (isAdmin && isEditing) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = 'Modifier';
            editButton.addEventListener('click', () => {
              startEditingVenue(party as Venue);
            });
            buttonsContainer.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Supprimer';
            deleteButton.addEventListener('click', () => {
              if (window.confirm('Êtes-vous sûr de vouloir supprimer cette soirée ?')) {
                deleteVenue(party.id);
              }
            });
            buttonsContainer.appendChild(deleteButton);
          }
          
          popupContent.appendChild(buttonsContainer);

          marker.bindPopup(popupContent);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          }
        }
      });
    }
  };

  // Mettre à jour les marqueurs lorsque le filtre change ou qu'une action est effectuée
  useEffect(() => {
    if (mapRef.current) {
      updateMapMarkers();
    }
  }, [eventFilter, venueFilter, delegationFilter, showFemale, showMale, showMixed, venues, appAction]);

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
        firstNonPassedEvent.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    setEventFilter(e.target.value);
    // Réinitialiser le filtre de lieu quand le type d'événement change
    setVenueFilter('Tous');
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleDelegationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ReactGA.event({
      category: 'filter',
      action: 'change_delegation_filter',
      label: e.target.value
    });
    setDelegationFilter(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  // Ajouter la fonction pour gérer le clic sur le bouton ⭐
  const handleStarFilterClick = () => {
    const preferredSport = localStorage.getItem('preferredSport') || 'all';
    const preferredDelegation = localStorage.getItem('preferredDelegation') || 'all';
    
    setIsStarFilterActive(!isStarFilterActive);
    
    if (!isStarFilterActive) {
      // Si le sport préféré est 'none', on utilise 'match' pour afficher tous les sports
      setEventFilter(preferredSport === 'none' ? 'match' : preferredSport);
      setDelegationFilter(preferredDelegation);
    } else {
      setEventFilter('all');
      setDelegationFilter('all');
    }
    
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const getVenueOptions = () => {
    if (eventFilter === 'all' || eventFilter === 'match') {
      return [{ value: 'Tous', label: 'Tous les lieux' }];
    }

    // Pour les soirées et défilés, retourner les lieux fixes
    if (eventFilter === 'party') {
      return [
        { value: 'Tous', label: 'Tous les lieux' },
        { value: 'place-stanislas', label: 'Place Stanislas' },
        { value: 'centre-prouve', label: 'Centre Prouvé' },
        { value: 'parc-expo', label: 'Parc des Expositions' },
        { value: 'zenith', label: 'Zénith' }
      ];
    }

    // Pour les sports, filtrer les lieux par sport
    const filteredVenues = venues.filter(venue => venue.sport === eventFilter);
    const venueOptions = [
      { value: 'Tous', label: 'Tous les lieux' },
      ...filteredVenues.map(venue => ({
        value: venue.id,
        label: venue.name
      }))
    ];

    return venueOptions;
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
    setVenueFilter(e.target.value);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  const handleGenderFilterChange = (gender: 'female' | 'male' | 'mixed') => {
    ReactGA.event({
      category: 'filter',
      action: 'change_gender_filter',
      label: gender
    });
    if (gender === 'female') setShowFemale(!showFemale);
    if (gender === 'male') setShowMale(!showMale);
    if (gender === 'mixed') setShowMixed(!showMixed);
    triggerMarkerUpdate();
    setTimeout(scrollToFirstNonPassedEvent, 100);
  };

  // Calcul du nombre de messages non lus
  const lastSeenChatTimestamp = Number(localStorage.getItem('lastSeenChatTimestamp') || 0);
  const unreadCount = messages.filter(m => m.timestamp > lastSeenChatTimestamp).length;

  const handleOpenChat = () => {
    // Si on est déjà sur le chat, on retourne à l'onglet précédent
    if (activeTab === 'chat') {
      setActiveTab(previousTab);
    } else {
      // Sinon on mémorise l'onglet actuel et on ouvre le chat
      setPreviousTab(activeTab);
      setActiveTab('chat');
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const newTimestamp = lastMsg.timestamp;
        localStorage.setItem('lastSeenChatTimestamp', String(newTimestamp));
        console.log('App - Updated lastSeenChatTimestamp:', newTimestamp);
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
        await auth.signOut();
        setUser(null);
        setIsAdmin(false);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    } else {
      // Sinon on tente de se connecter
      try {
        await loginWithGoogle();
      } catch (error) {
        console.error('Erreur lors de la connexion:', error);
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
        setActiveTab('map');
        break;
      default:
        setActiveTab('map');
    }
  };

  const handleTabChange = (tab: 'map' | 'events' | 'chat' | 'planning' | 'calendar') => {
    setPreviousTab(activeTab);
    setActiveTab(tab);
    if (tab === 'planning' || tab === 'calendar') {
      setFromEvents(activeTab === 'events');
    } else {
      setFromEvents(false);
    }
    if (tab === 'events') {
      setTimeout(() => {
        const firstNonPassedEvent = document.querySelector('.event-item:not(.passed)');
        if (firstNonPassedEvent) {
          firstNonPassedEvent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handlePreferencesClick = () => {
    // Appliquer les préférences
    setEventFilter(preferences.sport === 'none' ? 'match' : preferences.sport);
    setDelegationFilter(preferences.delegation);
    setVenueFilter(preferences.venue);
    setShowFemale(preferences.showFemale);
    setShowMale(preferences.showMale);
    setShowMixed(preferences.showMixed);
    setShowParty(preferences.showParty);
    setShowHotel(preferences.showHotel);
    setShowRestaurant(preferences.showRestaurant);
  };

  // Ajoute le header en haut du return
  return (
    <div className="app">
      <Header
        onChat={handleOpenChat}
        onEmergency={() => setShowEmergency(true)}
        onAdmin={handleAdminClick}
        isAdmin={isAdmin}
        user={user}
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
        getAllDelegations={getAllDelegations}
      />
      <main className="app-main">
        {locationError && showLocationPrompt && (
          <div className="location-error">
            <p>{locationError}</p>
            <div className="location-error-buttons">
              <button className="retry-button" onClick={retryLocation}>
                Réessayer
              </button>
              <button className="retry-button" onClick={handleDontAskAgain}>
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
          {tempMarker && (
            <Marker
              position={tempMarker}
              icon={DefaultIcon}
            >
              <Popup>Nouveau lieu</Popup>
            </Marker>
          )}
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
              {activeTab === 'map' ? '📆 Événements' : '✖️ Fermer'}
                  </button>
            
            {activeTab === 'events' && (
              <div className="events-panel">
                <div className="events-panel-header">
                  <button 
                    className="calendar-button"
                    onClick={() => handleTabChange('calendar')}
                    title="Voir le calendrier"
                    style={{ width: 80 }}
                  >
                    <i className="fas fa-calendar"></i>Calendrier
                  </button>
                  <button
                    className="planning-button"
                    style={{ left: 100, width: 80 }}
                    onClick={() => handleTabChange('planning')}
                    title="Voir les plannings (bus, tournois, etc.)"
                  >
                    <i className="fas fa-table"></i>Planning
                  </button>
                    <button 
                      className="filter-toggle-button"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                    {showFilters ? 'Masquer' : 'Filtrer'}
                    </button>
                </div>
                <div className={`event-filters ${showFilters ? 'show' : ''}`}>
                    {showFilters && (
                    <>
                      <button
                        className={`filter-reset-button star${isStarFilterActive ? ' active' : ''}`}
                        style={{ right: '124px', top: '47px', position: 'absolute' }}
                        onClick={handleStarFilterClick}
                        title="Appliquer vos préférences"
                      >
                        ⭐
                      </button>
                      <button
                        className="filter-reset-button"
                        onClick={() => {
                          setEventFilter('all');
                          setDelegationFilter('all');
                          setVenueFilter('Tous');
                          setShowFemale(true);
                          setShowMale(true);
                          setShowMixed(true);
                          setIsStarFilterActive(false);
                          triggerMarkerUpdate();
                          setTimeout(scrollToFirstNonPassedEvent, 100);
                        }}
                      >
                        🔄
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
                        <option value="party">Soirées et Défilé ⭐</option>
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
                          {event.type === 'match' 
                            ? `${getSportIcon(event.sport || '')} ${event.sport}`
                            : event.sport === 'Defile'
                              ? '🎺 Défilé'
                              : event.sport === 'Pompom'
                                ? '🎀 Pompom'
                                : '🎉 Soirée'}
                        </span>
                        <span className="event-date">{formatDateTime(event.date)}</span>
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
                              <h4 style={{ color: 'var(--success-color)', marginTop: '10px' }}>Résultat : à venir</h4>
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
                <div style={{ padding: '2rem', textAlign: 'left', maxWidth: 800, margin: '0 auto' }}>
                  <PlanningFiles />
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="chat-panel">
                <div className="chat-panel-header">
                  <h3>Messages de l'orga</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isAdmin && (
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
                    style={{ display: 'flex', gap: '8px', padding: '1rem', alignItems: 'center', background: 'var(--bg-secondary)' }}
                    onSubmit={e => {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        if (editingMessageId) {
                          // Si on édite un message existant
                          handleEditMessage(editingMessageId, newMessage, newMessageSender || 'Organisation');
                        } else {
                          // Sinon, on ajoute un nouveau message
                          handleAddMessage(newMessage, newMessageSender || 'Organisation');
                        }
                        setNewMessage('');
                        setNewMessageSender('Organisation');
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
                        style={{ width: 100, height: 25, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      />
                    )}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Votre message..."
                      style={{ flex: 1, height: 25, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      autoFocus
                    />
                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      ➡️
                    </button>
                  </form>
                )}
                <div className="chat-container">
                  {messages.map((message, index) => (
                    <div key={message.id || index} className={`chat-message ${message.isAdmin ? 'admin' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      {/* Header du message : affiche le nom de l'expéditeur */}
                      <div className="chat-message-header" style={{ justifyContent: 'space-between' }}>
                        <span>{message.sender || 'Organisation'}</span>
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
                                handleEditMessage(message.id, editingMessageValue, newMessageSender || 'Organisation');
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
                          <>{message.content}</>
                        )}
                      </div>
                      {/* Boutons admin en bas à droite */}
                      {isAdmin && editingMessageIndex !== index && (
                        <div style={{ position: 'absolute', right: 0, bottom: 6, display: 'flex', gap: 0 }}>
                          <button
                            className="edit-message-button"
                            title="Modifier"
                            onClick={() => {
                              // Ouvre le formulaire d'ajout en haut, pré-rempli
                              setShowAddMessage(true);
                              setNewMessage(message.content);
                              setNewMessageSender(message.sender || 'Organisation');
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16 }}
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
        <div className="form-overlay">
          <div className="edit-form match-edit-form">
            <div className="edit-form-header">
              <h3>{editingMatch.match ? 'Modifier le match' : 'Ajouter un match'}</h3>
            </div>
            <div className="edit-form-content">
              <div className="form-group">
                <label htmlFor="match-date">Date et heure de début</label>
                <input
                  id="match-date"
                  type="datetime-local"
                  value={editingMatch.match ? editingMatch.match.date : newMatch.date}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, date: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, date: e.target.value });
                    }
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-end-time">Heure de fin</label>
                <input
                  id="match-end-time"
                  type="datetime-local"
                  value={editingMatch.match ? editingMatch.match.endTime : (newMatch.endTime || '')}
                  min={editingMatch.match ? editingMatch.match.date : newMatch.date}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, endTime: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, endTime: e.target.value });
                    }
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-teams">Équipes</label>
                <input
                  id="match-teams"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.teams : newMatch.teams}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, teams: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, teams: e.target.value });
                    }
                  }}
                  placeholder="Ex: Nancy vs Alès"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-description">Description</label>
                <input
                  id="match-description"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.description : newMatch.description}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, description: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, description: e.target.value });
                    }
                  }}
                  placeholder="Ex: Phase de poules M"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="match-result">Résultat</label>
                <input
                  id="match-result"
                  type="text"
                  value={editingMatch.match ? editingMatch.match.result : (newMatch.result || '')}
                  onChange={(e) => {
                    if (editingMatch.match) {
                      const updatedMatch = { ...editingMatch.match, result: e.target.value };
                      setEditingMatch({ ...editingMatch, match: updatedMatch });
                    } else {
                      setNewMatch({ ...newMatch, result: e.target.value });
                    }
                  }}
                  placeholder="Ex: 2-1"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button 
                  className="add-button"
                  onClick={() => {
                    if (editingMatch.match) {
                      handleUpdateMatch(
                        editingMatch.venueId!, 
                        editingMatch.match.id, 
                        {
                          date: editingMatch.match.date,
                          endTime: editingMatch.match.endTime || '',
                          teams: editingMatch.match.teams,
                          description: editingMatch.match.description,
                          result: editingMatch.match.result
                        }
                      );
                      finishEditingMatch();
                    } else {
                      handleAddMatch(editingMatch.venueId!);
                    }
                  }}
                  disabled={
                    editingMatch.match 
                      ? !editingMatch.match.date || !editingMatch.match.teams || !editingMatch.match.description
                      : !newMatch.date || !newMatch.teams || !newMatch.description
                  }
                >
                  {editingMatch.match ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={finishEditingMatch}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulaire d'édition de lieu */}
      {isAddingPlace && (
        <div className="form-overlay">
          <div className="edit-form venue-edit-form">
            <div className="edit-form-header">
              <h3>{editingVenue.id ? 'Modifier le lieu' : 'Ajouter un lieu'}</h3>
            </div>
            <div className="edit-form-content">
              <div className="form-group">
                <label htmlFor="venue-name">Nom du lieu</label>
                <input
                  id="venue-name"
                  type="text"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="Ex: Gymnase Raymond Poincaré"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="venue-description">Description</label>
                <input
                  id="venue-description"
                  type="text"
                  value={newVenueDescription}
                  onChange={(e) => setNewVenueDescription(e.target.value)}
                  placeholder="Ex: Pour rentrer il faut..."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="venue-address">Adresse</label>
                <input
                  id="venue-address"
                  type="text"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  placeholder="Ex: 56 Rue Raymond Poincaré, 54000 Nancy"
                  className="form-input"
                />
                <button
                  className="place-marker-button"
                  onClick={() => {
                    setIsPlacingMarker(true);
                    setIsAddingPlace(false);
                  }}
                >
                  Placer sur la carte
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="venue-sport">Sport</label>
                <select
                  id="venue-sport"
                  value={selectedSport}
                  onChange={(e) => {
                    setSelectedSport(e.target.value);
                    setSelectedEmoji(sportEmojis[e.target.value as keyof typeof sportEmojis] || '⚽');
                  }}
                  className="form-input"
                >
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
              <div className="form-actions">
                <button
                  className="add-button"
                  onClick={() => {
                    if (editingVenue.id) {
                      handleUpdateVenue();
                    } else {
                      handleAddVenue();
                    }
                  }}
                  disabled={!newVenueName || !newVenueDescription || (!newVenueAddress && !tempMarker)}
                >
                  {editingVenue.id ? 'Mettre à jour' : 'Ajouter'}
                </button>
                <button
                  className="cancel-button"
                  onClick={cancelEditingVenue}
                >
                  Annuler
                </button>
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
        onEventFilterChange={setEventFilter}
        onDelegationFilterChange={setDelegationFilter}
        onVenueFilterChange={setVenueFilter}
        onGenderFilterChange={(gender) => {
          if (gender === 'female') setShowFemale(!showFemale);
          if (gender === 'male') setShowMale(!showMale);
          if (gender === 'mixed') setShowMixed(!showMixed);
        }}
      />
      {showEmergency && (
        <div className="emergency-popup" onClick={() => setShowEmergency(false)}>
          <div className="emergency-popup-content" onClick={e => e.stopPropagation()}>
            <div className="emergency-popup-header">
            <h3>Contacts d'urgence</h3>
            </div>
            <ul style={{ textAlign: 'left', margin: '1.5rem 1rem' }}>
              <li><strong>SAMU :</strong> 15</li>
              <li><strong>Police :</strong> 17</li>
              <li><strong>Pompier :</strong> 18</li>
              <li><strong>Numéro européen :</strong> 112</li>
              <li><strong>Urgence sourds/malentendants :</strong> 114 (SMS)</li>
            </ul>
            <button 
                className="close-button" 
                onClick={() => setShowEmergency(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  position: 'absolute',
                  right: '0rem',
                  top: '1rem',
                  color: 'var(--text-color)'
                }}
              >
                ×
              </button>          </div>
        </div>
      )}
      <Outlet context={{ closeAllPanels, getAllDelegations }} />
    </div>
  );
}

export default App;
