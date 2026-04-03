/**
 * @fileoverview Page de la carte des lieux de soirée
 * 
 * Cette page affiche une carte avec uniquement les lieux de soirée (parties)
 */

import { MapContainer, TileLayer, useMap, ImageOverlay, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ref, onValue, push, remove } from 'firebase/database';
import { database } from '../firebase';
import { firebaseLogger } from '../services/FirebaseLogger';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useForm } from '../contexts/FormContext';
import { useEditing } from '../contexts/EditingContext';
import { useApp } from '../AppContext';
import logger from '../services/Logger';
import { isIssueDeSecoursIndication, ISSUE_DE_SECOURS_MARKER_PUBLIC_PATH } from '../config/indicationMarkers';
import './PartyMap.css';

/** Normalized storage range for plan marker coords in Firebase (legacy 1000×1000 map space). */
const PLAN_MARKER_COORD_RANGE = 1000;

interface Party {
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
  result?: string;
}

// Composant interne pour obtenir la référence de la carte
const MapController: React.FC<{ mapRef: React.MutableRefObject<L.Map | null> }> = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

// Composant pour ajuster la vue de la carte du plan
const PlanMapViewAdjuster: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
  }, [map, bounds]);
  return null;
};

const PartyMap: React.FC = () => {
  const { selectedPartyForMap } = useForm();
  const [parties, setParties] = useState<Party[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  // Si on vient du Parc Expo (ou Hall A/B), afficher l'image du plan
  const showParcExpoPlan = selectedPartyForMap?.startsWith('Parc Expo') ?? false;
  // Si on vient du Zénith, afficher l'image du plan
  const showZenithPlan = selectedPartyForMap === 'Zénith';

  // Initialiser les parties avec les mêmes valeurs que dans App.tsx
  useEffect(() => {
    const initialParties: Party[] = [
      {
        id: '1',
        name: "Place Stanislas",
        position: [48.693524, 6.183270],
        description: 'Défilé 14h–16h30 (informations sur place dès midi)',
        address: "Pl. Stanislas, 54000 Nancy",
        latitude: 48.693524,
        longitude: 6.183270,
        date: '2026-04-16T14:00:00',
        emoji: '🎺',
        sport: 'Defile',
        result: undefined
      },
      {
        id: '2',
        name: "Parc Expo",
        position: [48.663030, 6.191597],
        description: "Soirée Pompoms du 16 avril, 21h-3h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        latitude: 48.663030,
        longitude: 6.191597,
        date: '2026-04-16T21:00:00',
        emoji: '🎀',
        sport: 'Pompom',
        result: 'à venir'
      },
      {
        id: '3',
        name: "Parc Expo",
        position: [48.663481, 6.189737],
        description: "Soirée Showcase 17 novembre, 20h-4h",
        address: "Rue Catherine Opalinska, 54500 Vandœuvre-lès-Nancy",
        latitude: 48.663481,
        longitude: 6.189737,
        date: '2026-11-17T20:00:00',
        emoji: '🎤',
        sport: 'Party',
        result: 'à venir'
      },
      {
        id: '4',
        name: "Zénith",
        position: [48.711077, 6.139991],
        description: "Soirée DJ Contest 18 novembre, 20h-4h",
        address: "Rue du Zénith, 54320 Maxéville",
        latitude: 48.711077,
        longitude: 6.139991,
        date: '2026-11-18T20:00:00',
        emoji: '🎧',
        sport: 'Party',
        result: undefined
      }
    ];
    setParties(initialParties);

    // Charger les résultats et descriptions depuis Firebase
    const unsubscribeResults = onValue(ref(database, 'editableData/partyResults'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setParties((prevParties) => 
          prevParties.map((party) => {
            if (party.id === '2' && data['parc-expo-pompoms']?.result) {
              return { ...party, result: data['parc-expo-pompoms'].result };
            }
            if (party.id === '3' && data['parc-expo-showcase']?.result) {
              return { ...party, result: data['parc-expo-showcase'].result };
            }
            if (party.id === '4' && data['zenith-dj-contest']?.result) {
              return { ...party, result: data['zenith-dj-contest'].result };
            }
            return party;
          })
        );
      }
    });

    const unsubscribeDescriptions = onValue(ref(database, 'editableData/partyDescriptions'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setParties((prevParties) => 
          prevParties.map((party) => {
            const partyData = data[party.id];
            if (partyData?.description) {
              return { ...party, description: partyData.description };
            }
            return party;
          })
        );
      }
    });

    return () => {
      unsubscribeResults();
      unsubscribeDescriptions();
    };
  }, []);

  // Fonction pour ouvrir dans Google Maps
  const openInGoogleMaps = async (party: Party) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(party.address || `${party.latitude},${party.longitude}`)}`;
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url });
      } catch (error) {
        logger.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // Fonction pour copier dans le presse-papier
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Créer les marqueurs pour les parties
  useEffect(() => {
    if (!mapRef.current) return;

    // Nettoyer les anciens marqueurs
    markersRef.current.forEach(marker => {
      marker.removeFrom(mapRef.current!);
    });
    markersRef.current = [];

    parties.forEach(party => {
      const marker = L.marker([party.latitude, party.longitude], {
        icon: L.divIcon({
          className: 'custom-marker party-marker',
          html: `<div><span>${party.emoji || (party.sport === 'Pompom' ? '🎀' : party.sport === 'Defile' ? '🎺' : '🎉')}</span></div>`,
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
        ${party.result && party.sport !== 'Defile' ? `<p style="color: rgba(76, 175, 80, 0.95); margin: 2px 0;">Résultat : ${party.result}</p>` : ''}
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

      popupContent.appendChild(buttonsContainer);
      marker.bindPopup(popupContent, { closeButton: false });
      
      if (mapRef.current) {
        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });

    // Ajuster la vue pour afficher tous les marqueurs
    if (parties.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(parties.map(p => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [parties, showParcExpoPlan, showZenithPlan]);


  // Composant pour gérer les clics sur la carte du plan
  const PlanMapClickHandler: React.FC<{ 
    onMapClick: (lat: number, lng: number) => void;
    isAddingMarker: boolean;
  }> = ({ onMapClick, isAddingMarker }) => {
    useMapEvents({
      click: (e) => {
        if (isAddingMarker) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      }
    });
    return null;
  };

  // Composant pour afficher un plan avec navigation et marqueurs
  const PlanMapView: React.FC<{ 
    title: string; 
    imageSrc: string; 
    imageAlt: string;
    partyName: string;
  }> = ({ imageSrc, partyName }) => {
    const { isEditing } = useEditing();
    const { isAdmin } = useApp();
    const [planMarkers, setPlanMarkers] = useState<any[]>([]);
    const [isAddingMarker, setIsAddingMarker] = useState(false);
    const [selectedIndicationType, setSelectedIndicationType] = useState('Soins');
    const [planImageSize, setPlanImageSize] = useState<{ w: number; h: number } | null>(null);
    const [planImageLoadError, setPlanImageLoadError] = useState(false);
    const [planImageRetryKey, setPlanImageRetryKey] = useState(0);

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
    };

    useEffect(() => {
      setPlanImageSize(null);
      setPlanImageLoadError(false);
      const img = new Image();
      const onLoad = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setPlanImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        } else {
          setPlanImageLoadError(true);
        }
      };
      const onError = () => {
        setPlanImageLoadError(true);
      };
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      img.src = imageSrc;
      return () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
    }, [imageSrc, planImageRetryKey]);

    const imageBounds: L.LatLngBoundsExpression = useMemo(() => {
      if (!planImageSize) {
        return [[0, 0], [PLAN_MARKER_COORD_RANGE, PLAN_MARKER_COORD_RANGE]];
      }
      return [[0, 0], [planImageSize.h, planImageSize.w]];
    }, [planImageSize]);

    const mapCenter: [number, number] = useMemo(() => {
      if (!planImageSize) {
        return [PLAN_MARKER_COORD_RANGE / 2, PLAN_MARKER_COORD_RANGE / 2];
      }
      return [planImageSize.h / 2, planImageSize.w / 2];
    }, [planImageSize]);

    // Charger les marqueurs depuis Firebase
    useEffect(() => {
      const markersRef = ref(database, `planMarkers/${partyName}`);
      const unsubscribe = onValue(markersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const markersArray = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            ...value
          }));
          setPlanMarkers(markersArray);
        } else {
          setPlanMarkers([]);
        }
      });
      return () => unsubscribe();
    }, [partyName]);

    // Gérer le clic sur la carte pour ajouter un marqueur
    const handleMapClick = async (lat: number, lng: number) => {
      if (!isAdmin || !isEditing || !isAddingMarker) return;
      if (!planImageSize || planImageSize.h <= 0 || planImageSize.w <= 0) return;

      const emoji = indicationTypeEmojis[selectedIndicationType] || '📍';
      const storedLat = (lat * PLAN_MARKER_COORD_RANGE) / planImageSize.h;
      const storedLng = (lng * PLAN_MARKER_COORD_RANGE) / planImageSize.w;
      const newMarker = {
        position: [storedLat, storedLng],
        indicationType: selectedIndicationType,
        emoji: emoji,
        timestamp: Date.now()
      };

      try {
        const markersRef = ref(database, `planMarkers/${partyName}`);
        await firebaseLogger.wrapOperation(
          () => Promise.resolve(push(markersRef, newMarker)),
          'write:marker',
          `planMarkers/${partyName}`
        );
        setIsAddingMarker(false);
      } catch (error) {
        // L'erreur est déjà loggée par wrapOperation
        alert('Une erreur est survenue lors de l\'ajout du marqueur.');
      }
    };

    // Supprimer un marqueur
    const handleDeleteMarker = async (markerId: string) => {
      if (!isAdmin || !isEditing) return;
      
      if (window.confirm('Voulez-vous supprimer ce marqueur ?')) {
        try {
          const markerRef = ref(database, `planMarkers/${partyName}/${markerId}`);
          await firebaseLogger.wrapOperation(
            () => remove(markerRef),
            'delete:marker',
            `planMarkers/${partyName}/${markerId}`
          );
        } catch (error) {
          // L'erreur est déjà loggée par wrapOperation
          alert('Une erreur est survenue lors de la suppression du marqueur.');
        }
      }
    };

    return (
      <div className="page-content no-scroll party-map-container">
        {isAdmin && isEditing && (
          <div className="plan-editor-container">
            {!isAddingMarker ? (
              <>
                <select
                  value={selectedIndicationType}
                  onChange={(e) => setSelectedIndicationType(e.target.value)}
                  className="plan-indication-select"
                >
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
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingMarker(true)}
                  className="plan-add-marker-button"
                  title="Ajouter un marqueur sur le plan"
                  aria-label="Ajouter un marqueur sur le plan"
                >
                  <span className="plan-add-marker-button-icon" aria-hidden>+</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAddingMarker(false)}
                className="plan-cancel-button"
              >
                Annuler
              </button>
            )}
          </div>
        )}
        {planImageLoadError && (
          <div className="plan-map-error" role="alert">
            <p className="plan-map-error-message">Impossible de charger le plan.</p>
            <button
              type="button"
              className="plan-map-retry-button"
              onClick={() => setPlanImageRetryKey((k) => k + 1)}
            >
              Réessayer
            </button>
          </div>
        )}
        {!planImageLoadError && !planImageSize && (
          <div className="plan-map-loading" role="status" aria-live="polite">
            Chargement du plan…
          </div>
        )}
        {!planImageLoadError && planImageSize && (
        <MapContainer
          key={`plan-map-${partyName}-${planImageSize.w}-${planImageSize.h}`}
          center={mapCenter}
          zoom={0}
          minZoom={-2}
          maxZoom={3}
          style={{ height: '100%', width: '100%' }}
          crs={L.CRS.Simple}
        >
          <PlanMapViewAdjuster bounds={imageBounds} />
          <ImageOverlay
            url={imageSrc}
            bounds={imageBounds}
            opacity={1}
          />
          <PlanMapClickHandler 
            onMapClick={handleMapClick}
            isAddingMarker={isAddingMarker}
          />
          {planMarkers.filter(marker => marker.position && Array.isArray(marker.position)).map((marker) => {
            const planType = marker.indicationType ? String(marker.indicationType).trim() : '';
            const planInner = isIssueDeSecoursIndication(planType)
              ? `<img src="${ISSUE_DE_SECOURS_MARKER_PUBLIC_PATH}" alt="" class="plan-indication-marker__icon" />`
              : `<span>${marker.emoji || '📍'}</span>`;
            const displayLat = (Number(marker.position[0]) * planImageSize.h) / PLAN_MARKER_COORD_RANGE;
            const displayLng = (Number(marker.position[1]) * planImageSize.w) / PLAN_MARKER_COORD_RANGE;
            return (
            <Marker
              key={marker.id}
              position={[displayLat, displayLng]}
              icon={L.divIcon({
                className: 'custom-marker plan-indication-marker',
                html: `<div>${planInner}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
              })}
            >
              <Popup closeButton={false}>
                <div className="venue-popup">
                  <h3>{marker.indicationType || 'Indication'}</h3>
                  {isAdmin && isEditing && (
                    <button
                      onClick={() => handleDeleteMarker(marker.id)}
                      className="plan-delete-button"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
            );
          })}
        </MapContainer>
        )}
      </div>
    );
  };


  // Si on affiche le plan du Parc Expo
  if (showParcExpoPlan) {
    return (
      <PlanMapView 
        title="Plan du Parc des Expositions"
        imageSrc="/Parc-expo-plan.jpg"
        imageAlt="Plan du Parc des Expositions de Nancy"
        partyName="Parc Expo"
      />
    );
  }

  // Si on affiche le plan du Zénith
  if (showZenithPlan) {
    return (
      <PlanMapView 
        title="Plan du Zénith"
        imageSrc="/Zenith.jpeg"
        imageAlt="Plan du Zénith de Nancy"
        partyName="Zénith"
      />
    );
  }

  // Sinon, afficher la carte normale avec tous les lieux
  return (
    <div className="party-map-container">
      <MapContainer
        center={[48.69, 6.18]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController mapRef={mapRef} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
};

export default PartyMap;

