import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useZoomBasedLoading } from '../hooks/useLazyData';
import logger from '../services/Logger';
import './BusLines.css';
import type { BusLinesProps } from './bus/BusLinesTypes';
import { tramLine, tramLineT5, tramLineT4, tramLineT2, tramLineT3 } from './bus/busLinesStaticData';

// Icône pour les arrêts de tram (point blanc)
const tramStopIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: 'tram-stop-icon'
});

// Composant pour contrôler la visibilité des marqueurs
const ZoomController: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMap();
  
  useEffect(() => {
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };
    
    map.on('zoomend', handleZoomEnd);
    onZoomChange(map.getZoom()); // Initial zoom
    
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onZoomChange]);
  
  return null;
};

const BusLines: React.FC<BusLinesProps> = ({ visibleLines }) => {
  const [_, setSelectedStop] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(15); // Initial zoom level

  const filteredLines = useMemo(() => {
    return visibleLines.includes('T1') || visibleLines.includes('T5') || visibleLines.includes('T4') || visibleLines.includes('T2') || visibleLines.includes('T3') ? 
      [tramLineT5, tramLineT4, tramLineT3, tramLineT2, tramLine].filter(line => visibleLines.includes(line.id)) : [];
  }, [visibleLines]);

  // Simuler le chargement des arrêts (dans un vrai projet, ce serait une requête API)
  const loadStopsData = useCallback(async () => {
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 500));
    return { stops: 'loaded' };
  }, []);

  // Utiliser le hook de chargement basé sur le zoom
  const { data: stopsData, loadData: loadStops } = useZoomBasedLoading(
    loadStopsData,
    currentZoom,
    15, // Seuil de zoom
    { delay: 300 } // Délai avant chargement
  );

  // Charger les arrêts quand le zoom devient suffisant
  useEffect(() => {
    if (currentZoom >= 15) {
      loadStops();
    }
  }, [currentZoom, loadStops]);

  const shouldShowMarkers = currentZoom >= 15 && stopsData !== null;

  // Créer des listes des coordonnées des arrêts pour chaque ligne et chaque direction
  // Structure: lineStopsByDirection[lineId][directionName] = [arrêts dans l'ordre]
  const lineStopsByDirection = useMemo(() => {
    const directionMap: Record<string, Record<string, Array<{ name: string; coords: [number, number] }>>> = {};
    
    filteredLines.forEach(line => {
      directionMap[line.id] = {};
      
      // Extraire les deux terminus de la description
      const parts = line.description.split('↔').map(p => p.trim());
      if (parts.length !== 2) {
        // Si pas de séparation claire, créer une seule liste par défaut
        directionMap[line.id]['default'] = line.stops.map(stop => ({
          name: stop.name,
          coords: stop.coords
        }));
        return;
      }
      
      const [terminus1, terminus2] = parts;
      
      // Créer des listes pour chaque direction en préservant l'ordre
      const direction1Stops: Array<{ name: string; coords: [number, number] }> = [];
      const direction2Stops: Array<{ name: string; coords: [number, number] }> = [];
      
      // Parcourir les arrêts dans l'ordre et les classer selon leur direction
      line.stops.forEach((stop, index) => {
        let belongsToDirection1 = false;
        let belongsToDirection2 = false;
        
        // Vérifier si c'est un terminus (premier ou dernier arrêt)
        const isFirstStop = index === 0;
        const isLastStop = index === line.stops.length - 1;
        
        // Vérifier si l'arrêt correspond à un terminus par son nom
        const stopNameLower = stop.name.toLowerCase();
        const isTerminus1 = terminus1.toLowerCase().includes(stopNameLower) || 
                           stopNameLower.includes(terminus1.toLowerCase().split(' ')[0]) ||
                           terminus1.toLowerCase().split(' ').some(word => stopNameLower.includes(word));
        const isTerminus2 = terminus2.toLowerCase().includes(stopNameLower) || 
                           stopNameLower.includes(terminus2.toLowerCase().split(' ')[0]) ||
                           terminus2.toLowerCase().split(' ').some(word => stopNameLower.includes(word));
        
        // Vérifier si l'arrêt a des directions spécifiques
        if (stop.googleMapsUrls && stop.googleMapsUrls.length > 0) {
          stop.googleMapsUrls.forEach(link => {
            const directionMatch = link.direction.match(/Direction\s+(.+)$/);
            if (directionMatch) {
              const destinationCity = directionMatch[1].trim().toLowerCase();
              
              // Vérifier vers quel terminus cette direction pointe
              const terminus1Lower = terminus1.toLowerCase();
              const terminus2Lower = terminus2.toLowerCase();
              
              const matchesTerminus1 = terminus1Lower.includes(destinationCity) || 
                                      destinationCity.includes(terminus1Lower.split(' ')[0]) ||
                                      terminus1Lower.split(' ').some(word => word.length > 2 && destinationCity.includes(word)) ||
                                      destinationCity.split(' ').some(word => word.length > 2 && terminus1Lower.includes(word));
              const matchesTerminus2 = terminus2Lower.includes(destinationCity) || 
                                      destinationCity.includes(terminus2Lower.split(' ')[0]) ||
                                      terminus2Lower.split(' ').some(word => word.length > 2 && destinationCity.includes(word)) ||
                                      destinationCity.split(' ').some(word => word.length > 2 && terminus2Lower.includes(word));
              
              if (matchesTerminus2) {
                belongsToDirection2 = true;
              } else if (matchesTerminus1) {
                belongsToDirection1 = true;
              }
            }
          });
        } else if (stop.googleMapsUrl) {
          // Arrêt sans direction spécifique, l'ajouter aux deux listes
          belongsToDirection1 = true;
          belongsToDirection2 = true;
        }
        
        // Ajouter les terminus aux listes appropriées même s'ils n'ont pas de direction correspondante
        if (isTerminus1 || (isFirstStop && !belongsToDirection1 && !belongsToDirection2)) {
          belongsToDirection1 = true;
        }
        if (isTerminus2 || (isLastStop && !belongsToDirection1 && !belongsToDirection2)) {
          belongsToDirection2 = true;
        }
        
        // Ajouter l'arrêt aux listes appropriées
        if (belongsToDirection1) {
          direction1Stops.push({
            name: stop.name,
            coords: stop.coords
          });
        }
        if (belongsToDirection2) {
          direction2Stops.push({
            name: stop.name,
            coords: stop.coords
          });
        }
      });
      
      // Les arrêts dans line.stops sont dans l'ordre du trajet de terminus1 vers terminus2
      // direction1Stops et direction2Stops sont construits dans l'ordre original (terminus1 → terminus2)
      // 
      // Pour la direction vers terminus1 (depuis terminus2) :
      // - On garde l'ordre original car on part de terminus2 et on va vers terminus1
      // - direction1Stops est déjà dans le bon ordre : [terminus2, ..., terminus1]
      //
      // Pour la direction vers terminus2 (depuis terminus1) :
      // - On doit inverser car on part de terminus1 et on va vers terminus2
      // - direction2Stops doit être inversé : [terminus1, ..., terminus2] devient [terminus2, ..., terminus1]
      // - Mais en fait, on veut [terminus1, ..., terminus2], donc on garde l'ordre original
      
      // En fait, les deux listes sont construites dans l'ordre original (terminus1 → terminus2)
      // Pour direction1 (vers terminus1 depuis terminus2), on garde l'ordre car on part de terminus2
      // Pour direction2 (vers terminus2 depuis terminus1), on garde aussi l'ordre car on part de terminus1
      
      // Stocker les listes avec les noms des terminus comme clés
      if (direction1Stops.length > 0) {
        directionMap[line.id][terminus1] = direction1Stops; // Ordre : terminus2 → terminus1 (ordre original)
      }
      if (direction2Stops.length > 0) {
        directionMap[line.id][terminus2] = direction2Stops; // Ordre : terminus1 → terminus2 (ordre original)
      }
      
      // Si aucune liste n'a été créée, créer une liste par défaut
      if (Object.keys(directionMap[line.id]).length === 0) {
        directionMap[line.id]['default'] = line.stops.map(stop => ({
          name: stop.name,
          coords: stop.coords
        }));
      }
    });
    
    return directionMap;
  }, [filteredLines]);

  // Fonction pour trouver les coordonnées du prochain arrêt dans une direction donnée
  const getNextStopCoords = useCallback((
    currentStopName: string,
    _currentStopCoords: [number, number],
    lineId: string,
    directionText: string
  ): [number, number] | null => {
    // Cas particulier : Saint-Léon Direction Sud sur T3 direction Seichamps -> pointe vers Gare Joffre
    if (lineId === 'T3' && 
        (currentStopName === 'Saint-Léon Direction Sud' || currentStopName === 'Saint Léon Direction Sud') &&
        directionText.includes('Seichamps')) {
      return [48.688499, 6.177309] as [number, number]; // Coordonnées de Gare Joffre
    }
    
    // Cas particulier : Gare Joffre sur T3 direction Villers -> pointe vers Gare Thiers Poirel Direction Sud
    if (lineId === 'T3' && 
        currentStopName === 'Gare Joffre' &&
        (directionText.includes('Villers') || directionText.includes('Villers Campus Sciences'))) {
      return [48.690365, 6.175653] as [number, number]; // Coordonnées de Gare Thiers Poirel Direction Sud
    }
    
    // Cas particulier : Domaine Sainte-Anne Direction Nord sur T3 direction Seichamps -> pointe vers Victoire
    if (lineId === 'T3' && 
        currentStopName === 'Domaine Sainte-Anne Direction Nord' &&
        (directionText.includes('Villers') || directionText.includes('Villers Campus Sciences'))) {
      return [48.683950, 6.150875] as [number, number]; // Coordonnées Victoire
    } 
    
    // Cas particuliers pour T4
    // Normaliser le nom d'arrêt pour le matching
    const normalizeStopName = (name: string): string => {
      return name.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const currentStopNormalized = normalizeStopName(currentStopName);
    const directionTextLower = directionText.toLowerCase();
    
    // Laxou Sapinière direction Laxou (vers Laxou Champ-le-Beouf) -> pointe vers Saône Direction Nord
    if (lineId === 'T4' && 
        (currentStopNormalized === 'laxou sapinière' || currentStopNormalized.includes('laxou sapinière')) &&
        directionTextLower.includes('laxou') && !directionTextLower.includes('houdemont')) {
      return [48.696039, 6.125463] as [number, number]; // Coordonnées de Saône Direction Nord
    }
    
    // Saône Direction Nord direction Laxou (vers Laxou Champ-le-Beouf) -> pointe vers Vair Direction Nord
    if (lineId === 'T4' && 
        (currentStopNormalized.includes('saône direction nord') || currentStopNormalized.includes('saone direction nord')) &&
        directionTextLower.includes('laxou') && !directionTextLower.includes('houdemont')) {
      return [48.696037, 6.123708] as [number, number]; // Coordonnées de Vair Direction Nord
    }
    
    // Vair Direction Nord direction Laxou (vers Laxou Champ-le-Beouf) -> pointe vers Laxou Champ-le-Beouf
    if (lineId === 'T4' && 
        currentStopNormalized.includes('vair direction nord') &&
        directionTextLower.includes('laxou') && !directionTextLower.includes('houdemont')) {
      return [48.698156, 6.123322] as [number, number]; // Coordonnées de Laxou Champ-le-Beouf
    }
    
    // Moselotte Direction Sud direction Houdemont -> pointe vers Vair Direction Sud
    if (lineId === 'T4' && 
        (currentStopNormalized.includes('moselotte') && currentStopNormalized.includes('direction sud')) &&
        (directionTextLower.includes('houdemont') || directionTextLower.includes('porte sud'))) {
      return [48.695672, 6.124361] as [number, number]; // Coordonnées de Vair Direction Sud
    }
    
    // Extraire le nom de la ville de destination depuis la direction
    const directionMatch = directionText.match(/Direction\s+(.+)$/);
    if (!directionMatch) return null;
    
    const destinationCity = directionMatch[1].trim();
    
    // Récupérer les listes d'arrêts par direction pour cette ligne
    const lineDirections = lineStopsByDirection[lineId];
    if (!lineDirections) return null;
    
    // Trouver la liste correspondant à cette direction
    let stopsList: Array<{ name: string; coords: [number, number] }> | null = null;
    
    // D'abord, chercher dans les noms des terminus (plus fiable)
    const fullLine = filteredLines.find(l => l.id === lineId);
    if (fullLine) {
      const parts = fullLine.description.split('↔').map(p => p.trim());
      if (parts.length === 2) {
        const [terminus1, terminus2] = parts;
        
        // Vérifier si la destination correspond à un terminus (matching plus flexible)
        // Normaliser les noms pour le matching (enlever les tirets, normaliser les espaces)
        const normalizeForMatching = (str: string): string => {
          return str.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        };
        const terminus1Normalized = normalizeForMatching(terminus1);
        const terminus2Normalized = normalizeForMatching(terminus2);
        const destinationNormalized = normalizeForMatching(destinationCity);
        
        const matchesTerminus1 = terminus1Normalized.includes(destinationNormalized) || 
                                destinationNormalized.includes(terminus1Normalized.split(' ')[0]) ||
                                terminus1Normalized.split(' ').some(word => word.length > 2 && destinationNormalized.includes(word)) ||
                                destinationNormalized.split(' ').some(word => word.length > 2 && terminus1Normalized.includes(word));
        const matchesTerminus2 = terminus2Normalized.includes(destinationNormalized) || 
                                destinationNormalized.includes(terminus2Normalized.split(' ')[0]) ||
                                terminus2Normalized.split(' ').some(word => word.length > 2 && destinationNormalized.includes(word)) ||
                                destinationNormalized.split(' ').some(word => word.length > 2 && terminus2Normalized.includes(word));
        
        if (matchesTerminus1 && lineDirections[terminus1]) {
          stopsList = lineDirections[terminus1];
        } else if (matchesTerminus2 && lineDirections[terminus2]) {
          stopsList = lineDirections[terminus2];
        }
      }
    }
    
    // Si pas trouvé, chercher dans les clés de direction
    if (!stopsList) {
      for (const [directionName, stops] of Object.entries(lineDirections)) {
        const directionNameLower = directionName.toLowerCase();
        const destinationCityLower = destinationCity.toLowerCase();
        
        if (directionNameLower.includes(destinationCityLower) || 
            destinationCityLower.includes(directionNameLower.split(' ')[0]) ||
            directionNameLower.split(' ').some(word => destinationCityLower.includes(word)) ||
            destinationCityLower.split(' ').some(word => directionNameLower.includes(word))) {
          stopsList = stops;
          break;
        }
      }
    }
    
    // Si toujours pas trouvé, utiliser la liste par défaut
    if (!stopsList && lineDirections['default']) {
      stopsList = lineDirections['default'];
    }
    
    if (!stopsList || stopsList.length === 0) return null;
    
    // Trouver l'index de l'arrêt actuel dans la liste de cette direction
    // Utiliser un matching plus flexible pour trouver l'arrêt (gérer les variations de nom)
    // Normaliser les noms en enlevant les tirets et en normalisant les espaces
    const normalizeName = (name: string): string => {
      return name.toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const currentStopIndex = stopsList.findIndex(stop => {
      const stopNameNormalized = normalizeName(stop.name);
      const currentNameNormalized = normalizeName(currentStopName);
      return stopNameNormalized === currentNameNormalized || 
             stopNameNormalized.includes(currentNameNormalized) || 
             currentNameNormalized.includes(stopNameNormalized);
    });
    
    if (currentStopIndex === -1) return null;
    
    // Déterminer la direction du trajet
    // Si on va vers terminus2 depuis terminus1, on va vers l'avant (index + 1)
    // Si on va vers terminus1 depuis terminus2, on va vers l'arrière (index - 1)
    let goingForward = true;
    
    if (fullLine) {
      const parts = fullLine.description.split('↔').map(p => p.trim());
      if (parts.length === 2) {
        const [terminus1, terminus2] = parts;
        
        // Normaliser les noms pour le matching (enlever les tirets, normaliser les espaces)
        const normalizeForMatching = (str: string): string => {
          return str.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        };
        const terminus1Normalized = normalizeForMatching(terminus1);
        const terminus2Normalized = normalizeForMatching(terminus2);
        const destinationNormalized = normalizeForMatching(destinationCity);
        
        // Vérifier vers quel terminus on va
        const matchesTerminus1 = terminus1Normalized.includes(destinationNormalized) || 
                                destinationNormalized.includes(terminus1Normalized.split(' ')[0]) ||
                                terminus1Normalized.split(' ').some(word => word.length > 2 && destinationNormalized.includes(word)) ||
                                destinationNormalized.split(' ').some(word => word.length > 2 && terminus1Normalized.includes(word));
        const matchesTerminus2 = terminus2Normalized.includes(destinationNormalized) || 
                                destinationNormalized.includes(terminus2Normalized.split(' ')[0]) ||
                                terminus2Normalized.split(' ').some(word => word.length > 2 && destinationNormalized.includes(word)) ||
                                destinationNormalized.split(' ').some(word => word.length > 2 && terminus2Normalized.includes(word));
        
        // Les listes sont dans l'ordre original : terminus2 (début) → terminus1 (fin)
        // Pour T1 : Si on va vers terminus1, on va vers l'avant (vers la fin)
        // Pour T1 : Si on va vers terminus2, on va vers l'arrière (vers le début)
        // Pour T5, T4, T3, T2 : Inverser la logique
        const shouldInvert = ['T5', 'T4', 'T3', 'T2'].includes(lineId);
        
        if (matchesTerminus1) {
          goingForward = shouldInvert ? false : true; // Vers l'arrière pour T5/T4/T3/T2, vers l'avant pour T1
        } else if (matchesTerminus2) {
          goingForward = shouldInvert ? true : false; // Vers l'avant pour T5/T4/T3/T2, vers l'arrière pour T1
        }
      }
    }
    
    // Trouver le prochain arrêt dans la bonne direction
    if (goingForward) {
      // Aller vers l'avant dans la liste
      if (currentStopIndex < stopsList.length - 1) {
        return stopsList[currentStopIndex + 1].coords;
      }
    } else {
      // Aller vers l'arrière dans la liste
      if (currentStopIndex > 0) {
        return stopsList[currentStopIndex - 1].coords;
      }
    }
    
    return null;
  }, [lineStopsByDirection, filteredLines]);

  // Fonction pour calculer l'angle entre deux points géographiques (en degrés)
  // Pour une carte web, l'angle doit être calculé en tenant compte que :
  // - Longitude (lng) = axe X (est-ouest)
  // - Latitude (lat) = axe Y (nord-sud, mais inversé sur l'écran)
  const calculateAngle = useCallback((
    from: [number, number], // [lat, lng]
    to: [number, number]    // [lat, lng]
  ): number => {
    // Calculer les différences
    const deltaLng = to[1] - from[1]; // Différence en longitude (X)
    const deltaLat = from[0] - to[0]; // Différence en latitude (Y, inversé car lat augmente vers le nord)
    
    // Calculer l'angle avec atan2
    // atan2(y, x) donne l'angle depuis l'axe X positif
    // Sur une carte : 0° = Est, 90° = Nord, 180° = Ouest, 270° = Sud
    const angle = Math.atan2(deltaLat, deltaLng) * 180 / Math.PI;
    
    // Normaliser l'angle entre 0 et 360
    return (angle + 360) % 360;
  }, []);

  return (
    <>
      <ZoomController onZoomChange={setCurrentZoom} />

      {/* Afficher les tracés des lignes */}
      {filteredLines.map(line => (
        <React.Fragment key={line.id}>
          {/* Tracé principal */}
        <Polyline
          positions={line.coordinates}
          color={line.color}
          weight={4}
          opacity={0.8}
        />
          {/* Tracés séparés pour T5 */}
          {line.id === 'T5' && line.coordinatesVandeouvre && line.coordinatesMaxeville && (
            <>
              {/* Tracé direction Vandeouvre Roberval */}
              <Polyline
                positions={line.coordinatesVandeouvre}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Maxéville Meurthe-Canal */}
              <Polyline
                positions={line.coordinatesMaxeville}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              
              {/* Section élargie de la ligne T5 entre Vélodrome et Garenne - Saurupt */}
              {line.id === 'T5' && (
                <Polyline
                  positions={[
                    [48.666478, 6.166306], // Point intermédiaire
                    [48.668397, 6.168561], // Montet Octroi (partagé avec T1)
                    [48.671964, 6.172453], // ARTEM - Blandan - Thermal (partagé avec T1)
                    [48.675217, 6.176070], // Exelmans (partagé avec T1)
                    [48.678672, 6.179993], // Point intermédiaire
                    [48.678827, 6.180072], // Point intermédiaire
                    [48.679128, 6.180410], // Jean Jaurès (nouveau point T5)
                    [48.681798, 6.183409], // Garenne - Saurupt
                    [48.683003, 6.184788], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
              {/* Section élargie de la ligne T5 Pichon */}
              {line.id === 'T5' && (
                <Polyline
                  positions={[
                    [48.683003, 6.184788], // Point intermédiaire
                    [48.683524, 6.185382], // Pichon Direction Sud
                    [48.684081, 6.185994], // Point intermédiaire
                    [48.684524, 6.186486], // Pichon Direction Nord
                    [48.685037, 6.187112], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {/* Section élargie de la ligne T5 section doite */}
              {line.id === 'T5' && (
                <Polyline
                  positions={[
                    [48.685037, 6.187112], // Point intermédiaire
                    [48.685269, 6.186691], // Point intermédiaire
                    [48.685322, 6.186466], // Point intermédiaire
                    [48.685567, 6.186148], // Point intermédiaire
                    [48.685809, 6.186139], // Point intermédiaire
                    [48.687646, 6.184797], // Quartier Saint-Nicolas Direction Nord
                    [48.689725, 6.183256], // Place Charles III - Point Central Direction Nord
                    [48.692003, 6.181538], // Place Stanislas - Dom Calmet Direction Nord
                    [48.692823, 6.180935], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
              {/* Tracé direction Vandeouvre Roberval (droite) */}
              {line.id === 'T5' && (
                <Polyline
                  positions={[
                    [48.684081, 6.185994], // Point intermédiaire
                    [48.686100, 6.184457], // Quartier Saint-Nicolas Direction Sud
                    [48.689066, 6.182293], // Place Charles III - Point Central Direction Sud
                    [48.690898, 6.180990], // Place Stanislas - Dom Calmet Direction Sud
                    [48.692093, 6.180120], // Point intermédiaire
                    [48.691505, 6.178297], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
            </>
          )}

          {/* Tracés séparés pour T4 */}
          {line.id === 'T4' && line.coordinatesLaxou && line.coordinatesHoudemont && (
            <>
              {/* Tracé direction Laxou Champ-le-Beouf */}
              <Polyline
                positions={line.coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Houdemont Porte Sud */}
              <Polyline
                positions={line.coordinatesHoudemont}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction ligne T4 fin) */}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.698202, 6.125090], // Point intermédiaire
                    [48.698156, 6.123322], // Laxou Champ-le-Beouf
                    [48.698137, 6.122952], // Point intermédiaire
                    [48.696100, 6.123089], // Point intermédiaire
                    [48.696037, 6.123708], // Vair Direction Nord
                    [48.695998, 6.124373], // Point intermédiaire
                    [48.696039, 6.125463], // Saône Direction Nord
                    [48.696086, 6.126997], // Point intermédiaire
                    [48.694907, 6.127233], // Point intermédiaire
                    [48.694657, 6.127549], // Point intermédiaire
                    [48.694612, 6.128002], // Point intermédiaire
                    [48.692532, 6.128162], // Point intermédiaire
                    [48.690981, 6.128387], // Laxou Sapinière
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.695998, 6.124373], // Point intermédiaire
                    [48.695672, 6.124361], // Vair Direction Sud
                    [48.694974, 6.124373], // Point intermédiaire
                    [48.694657, 6.127549], // Point intermédiaire
                    [48.694612, 6.128002], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.698202, 6.125090], // Point intermédiaire
                    [48.697247, 6.125168], // Moselotte
                    [48.696033, 6.125262], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={4}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.683003, 6.184788], // Point intermédiaire
                    [48.683524, 6.185382], // Pichon Direction Sud
                    [48.684081, 6.185994], // Point intermédiaire
                    [48.684524, 6.186486], // Pichon Direction Nord
                    [48.685037, 6.187112], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                positions={[
                  [48.690622, 6.175509], // Point intermédiaire
                  [48.690365, 6.175653], // Gare Thiers Poirel Direction Sud
                  [48.689414, 6.176331], // Point intermédiaire
                  [48.688326, 6.173023], // Saint-Léon Direction Sud
                  [48.687599, 6.170741], // Point intermédiaire
                  [48.686733, 6.168055], // Point intermédiaire
                  [48.686566, 6.167868], // Commanderie Direction Sud
                  [48.686058, 6.167258], // Point intermédiaire
                  [48.686013, 6.167089], // Point intermédiaire
                  [48.686012, 6.166898], // Point intermédiaire
                ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                positions={[
                  [48.691047, 6.175161], // Point intermédiaire
                  [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
                  [48.690030, 6.171810], // Point intermédiaire
                  [48.689870, 6.171286], // Gare - Raymond Poincaré Direction Nord
                  [48.689266, 6.169294], // Bégonias Direction Nord
                  [48.688424, 6.166499], // Préville Direction Nord
                  [48.688337, 6.166199], // Point intermédiaire
                ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
            </>
          )}

          {/* Tracés séparés pour T3 */}
          {line.id === 'T3' && line.coordinatesVillers && line.coordinatesSeichamps && (
            <>
              {/* Tracé direction Villers Campus Sciences */}
              <Polyline
                positions={line.coordinatesVillers}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Seichamps Haie Cerlin */}
              <Polyline
                positions={line.coordinatesSeichamps}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {line.id === 'T3' && (
                <Polyline
                  positions={[
                    [48.684283, 6.188551], // Point intermédiaire
                    [48.684769, 6.187656], // Place des Vosges (partagé)
                    [48.685037, 6.187112], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T3' && (
                <Polyline
                  positions={[
                    [48.690622, 6.175509], // Point intermédiaire
                    [48.690365, 6.175653], // Gare Thiers Poirel Direction Sud
                    [48.689414, 6.176331], // Point intermédiaire
                    [48.688326, 6.173023], // Saint-Léon Direction Sud
                    [48.687599, 6.170741], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
              {line.id === 'T3' && (
                <Polyline
                positions={[
                  [48.691047, 6.175161], // Point intermédiaire
                  [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
                  [48.690030, 6.171810], // Point intermédiaire
                ]}
                  color={line.color}
                  weight={6}
                  opacity={0.8}
                />
              )}
            </>
          )}

          {/* Tracés séparés pour T2 */}
          {line.id === 'T2' && line.coordinatesLaxou && line.coordinatesLaneuville && (
            <>
              {/* Tracé direction Laxou Sapinière */}
              <Polyline
                positions={line.coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Laneuville Centre */}
              <Polyline
                positions={line.coordinatesLaneuville}
                color={line.color}
                weight={4}
                opacity={0.8}
              />

              {/* Section reduite de la ligne T2 section droite */}
              {line.id === 'T2' && (
                <Polyline
                  positions={[
                    [48.685037, 6.187112], // Point intermédiaire
                    [48.685269, 6.186691], // Point intermédiaire
                    [48.685322, 6.186466], // Point intermédiaire
                    [48.685567, 6.186148], // Point intermédiaire
                    [48.685809, 6.186139], // Point intermédiaire
                    [48.687646, 6.184797], // Quartier Saint-Nicolas Direction Nord
                    [48.689725, 6.183256], // Place Charles III - Point Central Direction Nord
                    [48.692003, 6.181538], // Place Stanislas - Dom Calmet Direction Nord
                    [48.692823, 6.180935], // Point intermédiaire
                    [48.692137, 6.178665], // Bibliothèque Direction Nord
                    [48.691047, 6.175161], // Point intermédiaire
                    [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
                    [48.690030, 6.171810], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={2}
                  opacity={0.8}
                />
              )}
              {/* Section reduite de la ligne T2 section gauche */}
              {line.id === 'T2' && (
                <Polyline
                  positions={[
                    [48.685037, 6.187112], // Point intermédiaire
                    [48.684524, 6.186486], // Pichon Direction Nord
                    [48.684081, 6.185994], // Point intermédiaire
                    [48.686100, 6.184457], // Quartier Saint-Nicolas Direction Sud
                    [48.689066, 6.182293], // Place Charles III - Point Central Direction Sud
                    [48.690898, 6.180990], // Place Stanislas - Dom Calmet Direction Sud
                    [48.692093, 6.180120], // Point intermédiaire
                    [48.691505, 6.178297], // Point intermédiaire
                    [48.690622, 6.175509], // Point intermédiaire
                    [48.690365, 6.175653], // Gare Thiers Poirel Direction Sud
                    [48.689414, 6.176331], // Point intermédiaire
                    [48.688326, 6.173023], // Saint-Léon Direction Sud
                    [48.687599, 6.170741], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={2}
                  opacity={0.8}
                />
              )}
              {line.id === 'T2' && (
                <Polyline
                  positions={[
                    [48.698137, 6.122952], // Point intermédiaire
                    [48.696100, 6.123089], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={4}
                  opacity={0.8}
                />
              )}
              {line.id === 'T2' && (
                <Polyline
                  positions={[
                    [48.695998, 6.124373], // Point intermédiaire
                    [48.696039, 6.125463], // Saône Direction Nord
                    [48.696086, 6.126997], // Point intermédiaire
                    [48.694907, 6.127233], // Point intermédiaire
                    [48.694657, 6.127549], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={4}
                  opacity={0.8}
                />
              )}
              {line.id === 'T2' && (
                <Polyline
                  positions={[
                    [48.684081, 6.185994], // Point intermédiaire
                    [48.684524, 6.186486], // Pichon Direction Nord
                    [48.685037, 6.187112], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={2}
                  opacity={0.8}
                />
              )}
            </>
          )}
          
          {/* Tracés séparés pour T3 */}
          {line.id === 'T3' && line.coordinatesVillers && line.coordinatesSeichamps && (
            <>
              {/* Tracé direction Villers Campus Sciences */}
              <Polyline
                positions={line.coordinatesVillers}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Seichamps Haie Cerlin */}
              <Polyline
                positions={line.coordinatesSeichamps}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
            </>
          )}
          
          {/* Tracés séparés pour T4 */}
          {line.id === 'T4' && line.coordinatesLaxou && line.coordinatesHoudemont && (
            <>
              {/* Tracé direction Laxou Champ-le-Beouf */}
              <Polyline
                positions={line.coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Houdemont Porte Sud */}
              <Polyline
                positions={line.coordinatesHoudemont}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction ligne T4 fin) */}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.698202, 6.125090], // Point intermédiaire
                    [48.698156, 6.123322], // Laxou Champ-le-Beouf
                    [48.698137, 6.122952], // Point intermédiaire
                    [48.696100, 6.123089], // Point intermédiaire
                    [48.696037, 6.123708], // Vair Direction Nord
                    [48.695998, 6.124373], // Point intermédiaire
                    [48.696039, 6.125463], // Saône Direction Nord
                    [48.696086, 6.126997], // Point intermédiaire
                    [48.694907, 6.127233], // Point intermédiaire
                    [48.694657, 6.127549], // Point intermédiaire
                    [48.694612, 6.128002], // Point intermédiaire
                    [48.692532, 6.128162], // Point intermédiaire
                    [48.690981, 6.128387], // Laxou Sapinière
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.695998, 6.124373], // Point intermédiaire
                    [48.695672, 6.124361], // Vair Direction Sud
                    [48.694974, 6.124373], // Point intermédiaire
                    [48.694657, 6.127549], // Point intermédiaire
                    [48.694612, 6.128002], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={8}
                  opacity={0.8}
                />
              )}
              {line.id === 'T4' && (
                <Polyline
                  positions={[
                    [48.698202, 6.125090], // Point intermédiaire
                    [48.697247, 6.125168], // Moselotte
                    [48.696033, 6.125262], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={4}
                  opacity={0.8}
                />
              )}
            </>
          )}

        </React.Fragment>
      ))}

      {/* Afficher les arrêts seulement si le zoom est suffisant */}
      {shouldShowMarkers && (() => {
        // Créer une liste de tous les arrêts avec gestion des doublons
        const allStops: Array<{
          name: string;
          coords: [number, number];
          lines: Array<{
            id: string;
            name: string;
            description: string;
            color: string;
            googleMapsUrl?: string;
            googleMapsUrls?: Array<{
              direction: string;
              url: string;
            }>;
          }>;
        }> = [];

        // Parcourir toutes les lignes pour collecter les arrêts
        filteredLines.forEach(line => {
          line.stops.forEach(stop => {
            // Chercher si cet arrêt existe déjà (même nom et coordonnées proches)
            const existingStopIndex = allStops.findIndex(existing => 
              existing.name === stop.name || 
              (Math.abs(existing.coords[0] - stop.coords[0]) < 0.0005 && 
               Math.abs(existing.coords[1] - stop.coords[1]) < 0.0005)
            );

            if (existingStopIndex >= 0) {
              // Vérifier si cette ligne n'est pas déjà présente
              const existingLine = allStops[existingStopIndex].lines.find(l => l.id === line.id);
              if (!existingLine) {
                // Ajouter cette ligne à l'arrêt existant seulement si elle n'existe pas déjà
                allStops[existingStopIndex].lines.push({
                  id: line.id,
                  name: line.name,
                  description: line.description,
                  color: line.color,
                  googleMapsUrl: stop.googleMapsUrl,
                  googleMapsUrls: stop.googleMapsUrls
                });
              }
            } else {
              // Créer un nouvel arrêt
              allStops.push({
                name: stop.name,
                coords: stop.coords,
                lines: [{
                  id: line.id,
                  name: line.name,
                  description: line.description,
                  color: line.color,
                  googleMapsUrl: stop.googleMapsUrl,
                  googleMapsUrls: stop.googleMapsUrls
                }]
              });
            }
          });
        });

        return allStops.map((stop) => {
          const stopKey = `stop-${stop.name}-${stop.coords[0]}-${stop.coords[1]}`;
          return (
          <Marker
            key={stopKey}
            position={stop.coords}
            icon={tramStopIcon}
            eventHandlers={{
              click: () => setSelectedStop(stopKey)
            }}
          >
            <Popup offset={[0, -10]} closeButton={false}>
              <div className="venue-popup">
                <h3>{stop.name}</h3>
                {stop.lines.sort((a, b) => a.id.localeCompare(b.id)).map((line, lineIndex) => (
                  <div key={`${line.id}-${lineIndex}`}>
                    <p className="line-info">
                      <span className="line-name" style={{ color: line.color }}>
                        {line.name}
                      </span>
                    </p>
                    {/* Gérer les deux types de structure */}
                    {line.googleMapsUrl ? (
                      // Structure simple avec un seul lien
                      <div className="popup-buttons">
                        <button 
                          className="schedule-button"
                          style={{ backgroundColor: line.color }}
                          onClick={async () => {
                            if (Capacitor.isNativePlatform()) {
                              try {
                                await Browser.open({ url: line.googleMapsUrl! });
                              } catch (error) {
                                logger.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
                                window.open(line.googleMapsUrl!, '_blank');
                              }
                            } else {
                              window.open(line.googleMapsUrl!, '_blank');
                            }
                          }}
                        >
                          Voir les horaires {line.name}
                        </button>
                      </div>
                    ) : line.googleMapsUrls ? (
                      // Structure avec plusieurs liens selon la direction
                      // Trier les boutons : Laxou en haut, Houdemont en bas, etc.
                      (() => {
                        const sortedLinks = [...line.googleMapsUrls].sort((a, b) => {
                          const aDir = a.direction.toLowerCase();
                          const bDir = b.direction.toLowerCase();
                          
                          // Ordre de tri : Laxou, puis Houdemont, puis autres par ordre alphabétique
                          if (aDir.includes('laxou') && !bDir.includes('laxou')) return -1;
                          if (!aDir.includes('laxou') && bDir.includes('laxou')) return 1;
                          if (aDir.includes('houdemont') && !bDir.includes('houdemont')) return 1;
                          if (!aDir.includes('houdemont') && bDir.includes('houdemont')) return -1;
                          
                          return aDir.localeCompare(bDir);
                        });
                        
                        return (
                          <div className="popup-buttons">
                            {sortedLinks.map((link, linkIndex) => {
                              // Trouver les coordonnées du prochain arrêt dans la liste ordonnée
                              const nextStopCoords = getNextStopCoords(stop.name, stop.coords, line.id, link.direction);
                              
                              // Calculer l'angle de la flèche si on a les coordonnées du prochain arrêt
                              const arrowAngle = nextStopCoords 
                                ? calculateAngle(stop.coords, nextStopCoords)
                                : null;
                              
                              // Extraire le premier mot du nom de la direction depuis link.direction (format: "Horaires Direction [Nom]")
                              const directionName = link.direction.replace('Horaires Direction ', '').split(' ')[0];
                              
                              return (
                                <button 
                                  key={linkIndex}
                                  className="schedule-button"
                                  style={{ backgroundColor: line.color }}
                                  onClick={async () => {
                                    if (Capacitor.isNativePlatform()) {
                                      try {
                                        await Browser.open({ url: link.url });
                                      } catch (error) {
                                        logger.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
                                        window.open(link.url, '_blank');
                                      }
                                    } else {
                                      window.open(link.url, '_blank');
                                    }
                                  }}
                                >
                                  <span>Horaires pour {directionName} : </span>
                                  {arrowAngle !== null ? (
                                    <span 
                                      className="direction-arrow"
                                      style={{
                                        display: 'inline-block',
                                        transform: `rotate(${arrowAngle}deg)`,
                                        transition: 'transform 0.3s ease'
                                      }}
                                    >
                                      <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="4" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                        style={{ display: 'block' }}
                                      >
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                      </svg>
                                    </span>
                                  ) : (
                                    <span>→</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : null}
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        );
        });
      })()}
    </>
  );
};

export default BusLines;
