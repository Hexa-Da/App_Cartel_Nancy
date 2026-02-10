import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useZoomBasedLoading } from '../hooks/useLazyData';
import logger from '../services/Logger';
import './BusLines.css';

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

// Données de la ligne T1 (Tramway) de Nancy avec les vraies coordonnées
const tramLine: TramLine = {
  id: 'T1',
  name: 'Ligne T1',
  description: 'Essey Mouzimpré ↔ Vandeouvre CHU Brabois',
  color: '#FF0000', // Rouge
  coordinates: [
    [48.649118, 6.145746],   // Vandeouvre CHU Brabois (modifié)
    [48.650733, 6.148218],   // Technopôle
    [48.651647, 6.149847],   // Point intermédiaire
    [48.653917, 6.152300],   // Parc de Brabois (modifié)
    [48.657364, 6.155514],   // Notre-Dame-des-Pauvres
    [48.658194, 6.156667],   // Point intermédiaire ajouté
    [48.658926, 6.158021],   // Point intermédiaire
    [48.660226, 6.159446],   // Saint-André - Jardin Botanique
    [48.662663, 6.162116],   // Le Reclus
    [48.665170, 6.164897],   // Point intermédiaire
    [48.665981, 6.165730],   // Vélodrome - Callot
    [48.668397, 6.168561],   // Montet Octroi
    [48.671964, 6.172453],   // ARTEM - Blandant - Thermal
    [48.675217, 6.176070],   // Exelmans (modifié)
    [48.678673, 6.179990],   // Point intermédiaire
    [48.679043, 6.179830],   // Jean Jaurès T1
    [48.681119, 6.178509],   // Garenne - Rose Wild
    [48.684268, 6.176490],   // Mon Désert - Thermal (modifié)
    [48.685171, 6.175799],   // Point intermédiaire
    [48.687458, 6.174090],   // Gare - Saint-Léon
    [48.688379, 6.173525],   // Point intermédiaire (modifié)
    [48.689231, 6.176229],   // Point intermédiaire
    [48.688953, 6.176798],   // Point intermédiaire
    [48.689095, 6.177189],   // Gare - Pierre Semard
    [48.690794, 6.182471],   // Point Central
    [48.691948, 6.186005],   // Place Stanislas - Cathédrale
    [48.693081, 6.189573],   // Point intermédiaire (modifié)
    [48.693370, 6.190932],   // Division de Fer (modifié)
    [48.695032, 6.194019],   // Deux Rives - Olympes de Gouges (modifié)
    [48.697523, 6.198829],   // Cristalleries - Stade Marcel Picot (modifié)
    [48.698737, 6.201331],   // Point intermédiaire
    [48.700510, 6.207530],   // Mairie de Saint Max
    [48.702124, 6.213303],   // Washington Foch
    [48.703162, 6.216946],   // Clinique Pasteur
    [48.703545, 6.219036],   // Point intermédiaire ajouté
    [48.703771, 6.221443],   // Essey Centre (modifié)
    [48.703369, 6.221947],   // Point intermédiaire
    [48.702279, 6.222792],   // Point intermédiaire ajouté
    [48.701557, 6.223492],   // Point intermédiaire
    [48.702193, 6.224752]    // ESSEY Mouzimpré (modifié)
  ] as [number, number][],
  stops: [
    { 
      name: 'Vandeouvre CHU Brabois', 
      coords: [48.649118, 6.145746] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Essey',
          url: 'https://www.google.fr/maps/place/Vandoeuvre+Brabois+-+H./@48.6497914,6.146256,151m/data=!3m1!1e3!4m8!3m7!1s0x4794a211de22cd97:0x683561f03c2f471d!6m1!1v5!8m2!3d48.649532!4d6.146593!16s%2Fg%2F11xfzjfttc?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Technopôle', 
      coords: [48.650733, 6.148218] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Technopole/@48.6504813,6.1478832,153m/data=!3m1!1e3!4m8!3m7!1s0x4794a20e0a5c493f:0xb7147ccc53ccada4!6m1!1v5!8m2!3d48.6508815!4d6.1481107!16s%2Fg%2F11rkdnt0z9?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Technop%C3%B4le/@48.6504813,6.1478832,153m/data=!3m1!1e3!4m8!3m7!1s0x4794a20de0260f55:0x3001b4d8a63fda42!6m1!1v5!8m2!3d48.6507449!4d6.1485011!16s%2Fg%2F11ywtb8xnc?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Parc de Brabois', 
      coords: [48.653917, 6.152300] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Parc+de+Brabois/@48.6537292,6.1521949,123m/data=!3m1!1e3!4m8!3m7!1s0x4794a20cf1870513:0x6a5c4b1f03ba5261!6m1!1v5!8m2!3d48.653561!4d6.151883!16s%2Fg%2F11ycrr3gl8?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Parc+de+Brabois/@48.6540745,6.1525919,125m/data=!3m1!1e3!4m8!3m7!1s0x4794a20cf1870513:0xc965c6a0bc38bd93!6m1!1v5!8m2!3d48.6542073!4d6.1527526!16s%2Fg%2F11hdsfpp9k?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Notre-Dame-des-Pauvres Direction Sud', 
      coords: [48.655905, 6.154130] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Doyen+Roubault/@48.6566031,6.1546652,137m/data=!3m1!1e3!4m8!3m7!1s0x4794a274a21e551d:0x3e2c2887f8183f3c!6m1!1v5!8m2!3d48.65657!4d6.15479!16s%2Fg%2F11y4b1spzy?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-André - Jardin Botanique', 
      coords: [48.660226, 6.159446] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Saint-Andr%C3%A9+-+Jardin+Botanique/@48.6597547,6.1588938,247m/data=!3m1!1e3!4m8!3m7!1s0x4794a27675eabf6d:0xac4c3c8372c4e2c4!6m1!1v5!8m2!3d48.6601269!4d6.159274!16s%2Fg%2F11hdsft4gv?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Saint-Andr%C3%A9+-+Jardin+Botanique/@48.6601355,6.1594012,61m/data=!3m1!1e3!4m8!3m7!1s0x4794a2767507ec33:0x103c4ab6729054f1!6m1!1v5!8m2!3d48.6603199!4d6.1595921!16s%2Fg%2F11yvmvzpht?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Le Reclus', 
      coords: [48.662663, 6.162116] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Le+Reclus/@48.6624196,6.1619815,94m/data=!3m1!1e3!4m8!3m7!1s0x4794989d7f63fcfb:0x6ad98359b1df5df3!6m1!1v5!8m2!3d48.6625867!4d6.1619546!16s%2Fg%2F11fn2615w4?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.com/maps/place/Le+Reclus/@48.6623659,6.1617681,16z/data=!4m8!3m7!1s0x4794989d8098618f:0x6647be73ba789f44!6m1!1v5!8m2!3d48.6623659!4d6.1617681!16s%2Fg%2F11yvmt6kcd!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vélodrome - Callot', 
      coords: [48.665981, 6.165730] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/V%C3%A9lodrome+-+Callot/@48.6661615,6.1664183,296m/data=!3m1!1e3!4m8!3m7!1s0x479498832199c241:0x6e1f0c6c8d751c2!6m1!1v5!8m2!3d48.6660329!4d6.1658511!16s%2Fg%2F11yvmzzgfn?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Callot/@48.6660361,6.1661174,49m/data=!3m1!1e3!4m8!3m7!1s0x4794988322755d57:0xe606e48b5a7edfaf!6m1!1v5!8m2!3d48.6661411!4d6.166052!16s%2Fg%2F1thzmv4b?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Montet Octroi', 
      coords: [48.668397, 6.168561] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6683404,6.1685493,109m/data=!3m1!1e3!4m8!3m7!1s0x479498838c8c0383:0xdc3e28efa34f16be!6m1!1v5!8m2!3d48.6683959!4d6.1684431!16s%2Fg%2F11mcbbykq4?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6683404,6.1685493,109m/data=!3m1!1e3!4m8!3m7!1s0x479498838b582b75:0x2e39acac89ba33c7!6m1!1v5!8m2!3d48.6684909!4d6.1686951!16s%2Fg%2F11hdsg65j_?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'ARTEM - Blandant - Thermal', 
      coords: [48.671964, 6.172453] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.6719053,6.1724845,99m/data=!3m1!1e3!4m8!3m7!1s0x47949886fda87293:0x408a91bddda628de!6m1!1v5!8m2!3d48.6719789!4d6.1723281!16s%2Fg%2F11myzt_17_?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.6719053,6.1724845,99m/data=!3m1!1e3!4m8!3m7!1s0x47949886fda87255:0x63caae178d22b4ef!6m1!1v5!8m2!3d48.6720305!4d6.172642!16s%2Fg%2F11x8hz8x2h?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Exelmans', 
      coords: [48.675217, 6.176070] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.com/maps/place/Exelmans/@48.6752469,6.1758841,16z/data=!4m8!3m7!1s0x4794987d4f7cc1ab:0xabc2e0a1d45c1f62!6m1!1v5!8m2!3d48.6752469!4d6.1758841!16s%2Fg%2F11ywt9grnh!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.com/maps/place/Exelmans/@48.6750019,6.1758161,16z/data=!4m8!3m7!1s0x4794987d5009e525:0x5ea06c5de0d4bcff!6m1!1v5!8m2!3d48.6750019!4d6.1758161!16s%2Fg%2F11yvmtprld!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jean Jaurès T1', 
      coords: [48.679043, 6.179830] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Jean+Jaures/@48.6790416,6.180007,65m/data=!3m1!1e3!4m8!3m7!1s0x479498637d3774cd:0x53d4ca921edb36f!6m1!1v5!8m2!3d48.6791609!4d6.1797851!16s%2Fg%2F11fn265wzr?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Jean+Jaures/@48.6794013,6.1796788,66m/data=!3m1!1e3!4m8!3m7!1s0x479498649cf03b49:0x24b11180877d2856!6m1!1v5!8m2!3d48.6794599!4d6.1796641!16s%2Fg%2F11myznrq30?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Garenne - Rose Wild', 
      coords: [48.681119, 6.178509] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Garenne+-+Rose+Wild/@48.6811223,6.1785043,49m/data=!3m1!1e3!4m8!3m7!1s0x47949864d0491d15:0xc08b6c2e90aa96db!6m1!1v5!8m2!3d48.6812298!4d6.1785468!16s%2Fg%2F11x8j0cmhf?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Garenne+-+Rose+Wild/@48.6811223,6.1785043,49m/data=!3m1!1e3!4m8!3m7!1s0x47949864d0491d15:0xc08b6c2e90aa96db!6m1!1v5!8m2!3d48.6812298!4d6.1785468!16s%2Fg%2F11x8j0cmhf?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mon Désert - Thermal', 
      coords: [48.684268, 6.176490] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Mon+D%C3%A9sert+-+Thermal/@48.6842583,6.1764847,46m/data=!3m1!1e3!4m8!3m7!1s0x4794987a9cc13507:0x95ddf0810e50bfc3!6m1!1v5!8m2!3d48.6844035!4d6.1764598!16s%2Fg%2F11x65lbd1b?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.com/maps/place/Mon+D%C3%A9sert+-+Thermal/@48.6844999,6.1764101,16z/data=!4m8!3m7!1s0x4794987077fa5f1d:0x8f3aec632570556a!6m1!1v5!8m2!3d48.6844999!4d6.1764101!16s%2Fg%2F11myzv13d9!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        } 
      ]
    },
    { 
      name: 'Gare - Saint-Léon', 
      coords: [48.687458, 6.174090] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Gare+-+Saint-L%C3%A9on/@48.6867377,6.1745052,86a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x47949871289b11d5:0xcffd5e9d8116276d!6m1!1v5!8m2!3d48.6874882!4d6.1741815!16s%2Fg%2F11x65jp8px?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.com/maps/place/Gare+-+Saint-L%C3%A9on/@48.6875489,6.1740111,17z/data=!4m8!3m7!1s0x479498712f7d3931:0x815b30003174899e!6m1!1v5!8m2!3d48.6875489!4d6.1740111!16s%2Fg%2F11yvmtprjh!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare - Pierre Semard', 
      coords: [48.689095, 6.177189] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Gare+-+Pierre+Semard/@48.6890731,6.1771436,74a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x479498718411de2b:0x8f09a939b68ed6d7!6m1!1v5!8m2!3d48.6890909!4d6.1770521!16s%2Fg%2F11x8hzby70?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.com/maps/place/Gare+-+Pierre+Semard/@48.6891399,6.1773771,17z/data=!4m8!3m7!1s0x4794987186005e29:0x40415d9943f3e5f2!6m1!1v5!8m2!3d48.6891399!4d6.1773771!16s%2Fg%2F11yvmtprk8!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Point Central', 
      coords: [48.690794, 6.182471] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Point+Central/@48.6907821,6.1827702,91a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986db0d9a1c9:0x7209d3f8eb81dadb!6m1!1v5!8m2!3d48.6909751!4d6.1828688!16s%2Fg%2F1tfbb28h?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Point+Central/@48.6906412,6.1818321,88a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986db8ec0a5b:0x3589176738d67977!6m1!1v5!8m2!3d48.6906419!4d6.1819491!16s%2Fg%2F11hdsfswyp?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Cathédrale', 
      coords: [48.691948, 6.186005] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Cath%C3%A9drale/@48.6917588,6.185594,94a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986c843d2219:0x8799d1f09996782a!6m1!1v5!8m2!3d48.6918729!4d6.1858171!16s%2Fg%2F11yvmtqqdg?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Cath%C3%A9drale/@48.6916338,6.1852995,94a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986c889f63e5:0xf8f0e358a4549a95!6m1!1v5!8m2!3d48.6917649!4d6.1855041!16s%2Fg%2F11x8hzx_z8?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Division de Fer', 
      coords: [48.693370, 6.190932] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Division+de+Fer/@48.6935064,6.1913588,78a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986ab5762d6b:0xb1a68d53a768315c!6m1!1v5!8m2!3d48.6935349!4d6.1913201!16s%2Fg%2F11x65l4309?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Division+de+Fer/@48.6935064,6.1913588,78a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794986ab35f87c5:0x33f8c49c9c0a17fd!6m1!1v5!8m2!3d48.6936499!4d6.1916031!16s%2Fg%2F11ywth70qn?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Deux Rives - Olympes de Gouges', 
      coords: [48.695032, 6.194019] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Deux+Rives+-+O.+de+Gouges/@48.6955977,6.195341,80a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983fb17798cd:0x66e1c0196b6f3ab8!6m1!1v5!8m2!3d48.6956529!4d6.1952551!16s%2Fg%2F11x65ht3x1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Deux+Rives+-+O.+de+Gouges/@48.6955977,6.195341,80a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983fadfba983:0x8ee6aae429f2b819!6m1!1v5!8m2!3d48.6957429!4d6.1954981!16s%2Fg%2F11yvmtfd4b?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Cristalleries - Stade Marcel Picot', 
      coords: [48.697523, 6.198829] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Cristalleries+-+Stade+M.+Picot/@48.6973888,6.1987929,77a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983ebbcece39:0x918cd49d7037ad1c!6m1!1v5!8m2!3d48.697491!4d6.19865!16s%2Fg%2F11h_1kwbdq?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Cristalleries+-+Stade+M.+Picot/@48.6973888,6.1987929,77a,35y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983eb0f43b41:0xee859460e911aed6!6m1!1v5!8m2!3d48.6975589!4d6.199001!16s%2Fg%2F11ywtghkz0?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mairie de Saint Max', 
      coords: [48.700510, 6.207530] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Mairie+de+Saint-Max/@48.7005666,6.2076585,72a,38y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983060646ccd:0x13ac836c5512b289!6m1!1v5!8m2!3d48.7005544!4d6.2077635!16s%2Fg%2F11x65hphlb?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Mairie+de+Saint-Max/@48.7005666,6.2076585,72a,38y,1.51t/data=!3m1!1e3!4m8!3m7!1s0x4794983060646ccd:0x13ac836c5512b289!6m1!1v5!8m2!3d48.7005544!4d6.2077635!16s%2Fg%2F11x65hphlb?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Washington Foch', 
      coords: [48.702124, 6.213303] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Washington+Foch/@48.7021021,6.2133305,75a,35.4y,1.52t/data=!3m1!1e3!4m8!3m7!1s0x4794983205ad5595:0x34bfe6e590cfe223!6m1!1v5!8m2!3d48.7021911!4d6.2132437!16s%2Fg%2F1tdf08lj?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },{
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.com/maps/place/Washington+Foch/@48.7021875,6.2132483,17z/data=!4m8!3m7!1s0x47949831ec39d7c7:0x186956ce0df633fe!6m1!1v5!8m2!3d48.7021875!4d6.2132483!16s%2Fg%2F11hdsg2_fv!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Clinique Pasteur', 
      coords: [48.703162, 6.216946] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Clinique+Pasteur/@48.7031829,6.2168594,91a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x4794982d7a0e9997:0x4ac4a11cb14a8b03!6m1!1v5!8m2!3d48.7032191!4d6.2168322!16s%2Fg%2F11fn2665sm?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Clinique+Pasteur/@48.7031879,6.2171733,91a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x4794982d6994fec3:0xd894842ea69562d!6m1!1v5!8m2!3d48.703278!4d6.217435!16s%2Fg%2F11h_1kwbdl?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Essey Centre', 
      coords: [48.703771, 6.221443] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre CHU',
          url: 'https://www.google.fr/maps/place/Essey+Centre/@48.70366,6.2207829,135a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x479499d2ec448d9b:0x29e78bed2ddfb9f1!6m1!1v5!8m2!3d48.7036389!4d6.221782!16s%2Fg%2F11x65hvtvg?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Essey Mouzimpré',
          url: 'https://www.google.fr/maps/place/Essey+Centre/@48.70366,6.2207829,135a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x479499d2ec4491e1:0x674472ea53cb065b!6m1!1v5!8m2!3d48.7036639!4d6.221153!16s%2Fg%2F11ywt7vp7j?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'ESSEY Mouzimpré', 
      coords: [48.702193, 6.224752] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Essey+Mouzimpr%C3%A9/@48.7020763,6.2218731,17.3z/data=!4m8!3m7!1s0x479499ce0675cf13:0x75f863b2e639a540!6m1!1v4!8m2!3d48.7017348!4d6.2248642!16s%2Fg%2F1tfcgpx6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    }
  ]
};

// Nouvelle ligne T5 (violet)
const tramLineT5: TramLine = {
  id: 'T5',
  name: 'Ligne T5',
  description: 'Vandeouvre Roberval ↔ Maxéville Meurthe-Canal',
  color: '#8B00FF', // Violet
  coordinates: [
    // Tracé principal jusqu'à Pichon
    [48.651716, 6.178839], // Vandeouvre Roberval
    [48.651426, 6.178640], // Point intermédiaire
    [48.650984, 6.176615], // Point intermédiaire
    [48.651062, 6.176066], // Point intermédiaire
    [48.652061, 6.175888], // Collège Simone de Beauvoir
    [48.652969, 6.175796], // Point intermédiaire
    [48.654638, 6.176396], // Rimbaud
    [48.655182, 6.176510], // Point intermédiaire
    [48.655744, 6.176408], // Point intermédiaire
    [48.656816, 6.175270], // Crévic
    [48.657496, 6.174615], // Point intermédiaire
    [48.657726, 6.175792], // Fribourg
    [48.658136, 6.177554], // Point intermédiaire
    [48.658916, 6.177372], // Jeanne d'Arc
    [48.659949, 6.176517], // Kehl
    [48.660789, 6.175613], // Point intermédiaire
    [48.661970, 6.173655], // Nations
    [48.666233, 6.166676], // Vélodrome
    [48.666478, 6.166306], // Point intermédiaire
  ] as [number, number][],
  // Tracé direction Vandeouvre Roberval (gauche)
  coordinatesVandeouvre: [
    [48.683003, 6.184788], // Point intermédiaire
    [48.683524, 6.185382], // Pichon Direction Sud
    [48.684081, 6.185994], // Point intermédiaire
    [48.686100, 6.184457], // Quartier Saint-Nicolas Direction Sud
    [48.689066, 6.182293], // Place Charles III - Point Central Direction Sud
    [48.690898, 6.180990], // Place Stanislas - Dom Calmet Direction Sud
    [48.692093, 6.180120], // Point intermédiaire
    [48.691505, 6.178297], // Point intermédiaire
    [48.691577, 6.178123], // Point intermédiaire
    [48.692224, 6.177389], // Point intermédiaire
    [48.692857, 6.177022], // Place Carnot Direction Sud
    [48.696276, 6.174582], // Baron Louis Direction Sud
    [48.697377, 6.173828], // Point intermédiaire
    [48.697532, 6.174247], // Point intermédiaire
    [48.698127, 6.173850], // Point intermédiaire
    [48.698336, 6.173902], // Désilles
    [48.701023, 6.171971], // Saint-Fiacre
    [48.703160, 6.170455], // Carsat
    [48.704771, 6.169332], // Point intermédiaire
    [48.706122, 6.167832], // Brasseries
    [48.707621, 6.166602], // Point intermédiaire
    [48.709033, 6.167005], // Lavoir
    [48.712318, 6.167999], // Courbet
    [48.715436, 6.168602], // Point intermédiaire
    [48.716398, 6.169120], // Pont Fleuri
    [48.717745, 6.170275], // Point intermédiaire
    [48.716040, 6.172611], // Point intermédiaire
    [48.713962, 6.172240], // Maxéville Meurthe-Canal
  ] as [number, number][],
  // Tracé direction Maxéville Meurthe-Canal (droite)
  coordinatesMaxeville: [
    [48.684081, 6.185994], // Point intermédiaire
    [48.684524, 6.186486], // Pichon Direction Nord
    [48.685037, 6.187112], // Point intermédiaire
    [48.685269, 6.186691], // Point intermédiaire
    [48.685322, 6.186466], // Point intermédiaire
    [48.685567, 6.186148], // Point intermédiaire
    [48.685809, 6.186139], // Point intermédiaire
    [48.687646, 6.184797], // Quartier Saint-Nicolas Direction Nord
    [48.689725, 6.183256], // Place Charles III - Point Central Direction Nord
    [48.692003, 6.181538], // Place Stanislas - Dom Calmet Direction Nord
    [48.692823, 6.180935], // Point intermédiaire
    [48.693032, 6.180786], // Amerval Direction Nord
    [48.693647, 6.180346], // Point intermédiaire
    [48.694244, 6.180079], // Point intermédiaire
    [48.693691, 6.178054], // Point intermédiaire
    [48.694287, 6.177591], // Place Carnot Direction Nord
    [48.695966, 6.176390], // Cours Léopold Direction Nord
    [48.697777, 6.175085], // Point intermédiaire
    [48.697639, 6.174600], // Point intermédiaire
    [48.698233, 6.174172], // Point intermédiaire
    [48.698336, 6.173902], // Désilles
    [48.701023, 6.171971], // Saint-Fiacre
    [48.703160, 6.170455], // Carsat
    [48.704771, 6.169332], // Point intermédiaire
    [48.706122, 6.167832], // Brasseries
    [48.707621, 6.166602], // Point intermédiaire
    [48.709033, 6.167005], // Lavoir
    [48.712318, 6.167999], // Courbet
    [48.715436, 6.168602], // Point intermédiaire
    [48.716398, 6.169120], // Pont Fleuri
    [48.717745, 6.170275], // Point intermédiaire
    [48.716040, 6.172611], // Point intermédiaire
    [48.713962, 6.172240], // Maxéville Meurthe-Canal
  ] as [number, number][],
  stops: [
    { 
      name: 'Vandeouvre Roberval', 
      coords: [48.651716, 6.178839] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Vandoeuvre+Roberval/@48.6524247,6.1785714,18.3z/data=!4m8!3m7!1s0x479498be608f065b:0xb51bb4598d2fb706!6m1!1v5!8m2!3d48.651795!4d6.178999!16s%2Fg%2F11xvq86t55?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Collège Simone de Beauvoir', 
      coords: [48.652061, 6.175888] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Coll%C3%A8ge+Simone+de+Beauvoir/@48.6520965,6.17595,19.77z/data=!4m8!3m7!1s0x479498bdb65fac25:0xe3a28cbfd05ba842!6m1!1v5!8m2!3d48.652119!4d6.175913!16s%2Fg%2F11c5_gb8kh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Coll%C3%A8ge+Simone+de+Beauvoir/@48.6518195,6.1752244,18.5z/data=!4m8!3m7!1s0x479498bdb44863dd:0x47194807337b3039!6m1!1v5!8m2!3d48.652!4d6.175879!16s%2Fg%2F11c5_smf39?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Rimbaud', 
      coords: [48.654638, 6.176396] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Rimbaud/@48.6546612,6.1763941,19.56z/data=!4m8!3m7!1s0x4794989622fc70d1:0x83c6713e60d3eed1!6m1!1v5!8m2!3d48.654762!4d6.176497!16s%2Fg%2F11c2p70wyn?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Rimbaud/@48.6546612,6.1763941,104m/data=!3m1!1e3!4m8!3m7!1s0x479498962148bea7:0x54918f251244bd16!6m1!1v5!8m2!3d48.654527!4d6.176322!16s%2Fg%2F11c2p9736f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Crévic', 
      coords: [48.656816, 6.175270] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Cr%C3%A9vic/@48.656856,6.1752114,18.26z/data=!4m8!3m7!1s0x47949896537d77ab:0x367ae32679ad5998!6m1!1v5!8m2!3d48.656517!4d6.175684!16s%2Fg%2F11c5_j0gnj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Cr%C3%A9vic/@48.6569255,6.1748794,19.84z/data=!4m8!3m7!1s0x47949897089c7d0f:0x8d6445ed989b63bf!6m1!1v5!8m2!3d48.657127!4d6.174924!16s%2Fg%2F11c5_sp579?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Fribourg', 
      coords: [48.657726, 6.175792] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Fribourg/@48.6568771,6.1747798,17.41z/data=!4m8!3m7!1s0x479498971a3584e9:0x4fa186c1a57f1e91!6m1!1v5!8m2!3d48.657673!4d6.175291!16s%2Fg%2F11c5__hlhf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Fribourg/@48.6577189,6.1760553,20.16z/data=!4m8!3m7!1s0x47949896e13d5d83:0x7a838f4d9da53e0b!6m1!1v5!8m2!3d48.657852!6d6.176133!16s%2Fg%2F11fn268lpr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jeanne d\'Arc Direction Maxéville', 
      coords: [48.658916, 6.177372] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Jeanne+d\'Arc/@48.6589205,6.1763562,18.08z/data=!4m8!3m7!1s0x47949896c9929ecb:0x131d640e8b29a48c!6m1!1v5!8m2!3d48.6589441!4d6.1774877!16s%2Fg%2F11c2p80b3v?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Kehl', 
      coords: [48.659949, 6.176517] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Kehl/@48.660551,6.1762495,18.78z/data=!4m8!3m7!1s0x47949890dfa26f05:0x38a2d3d267485898!6m1!1v5!8m2!3d48.660587!4d6.176117!16s%2Fg%2F11ddxpf93h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Kehl/@48.6589205,6.1763562,18.08z/data=!4m8!3m7!1s0x47949890c2def87d:0xdf946aaf0e9da596!6m1!1v5!8m2!3d48.6595845!4d6.1765446!16s%2Fg%2F11h_1lbvyp?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Nations', 
      coords: [48.661970, 6.173655] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Nations/@48.6618753,6.1736532,17.2z/data=!4m8!3m7!1s0x479498908760086f:0x135241431073418c!6m1!1v5!8m2!3d48.662075!4d6.17377!16s%2Fg%2F11c2p4795k?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Nations/@48.6617243,6.1737257,19.35z/data=!4m8!3m7!1s0x479498908173c6f3:0xa3e8c0302e432978!6m1!1v5!8m2!3d48.661799!4d6.173551!16s%2Fg%2F11ddxnhv02?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vélodrome', 
      coords: [48.666233, 6.166676] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/V%C3%A9lodrome/@48.6655987,6.1660303,17.23z/data=!4m8!3m7!1s0x479498830e83e743:0x5f773c87e51b470b!6m1!1v5!8m2!3d48.6663911!4d6.167022!16s%2Fg%2F11h_1l2_g2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/V%C3%A9lodrome+Callot/@48.66588,6.1662819,18.83z/data=!4m8!3m7!1s0x479498831815534b:0xfc5143fd797e9349!6m1!1v5!8m2!3d48.6660511!4d6.1664172!16s%2Fg%2F11jzxjs_ff?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Montet Octroi', 
      coords: [48.668397, 6.168561] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre Roberval',
          url: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6683404,6.1685493,109m/data=!3m1!1e3!4m8!3m7!1s0x479498838c8c0383:0xdc3e28efa34f16be!6m1!1v5!8m2!3d48.6683959!4d6.1684431!16s%2Fg%2F11mcbbykq4?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6683404,6.1685493,109m/data=!3m1!1e3!4m8!3m7!1s0x479498838b582b75:0x2e39acac89ba33c7!6m1!1v5!8m2!3d48.6684909!4d6.1686951!16s%2Fg%2F11hdsg65j_?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'ARTEM - Blandant - Thermal', 
      coords: [48.671964, 6.172453] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre Roberval',
          url: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.6719053,6.1724845,99m/data=!3m1!1e3!4m8!3m7!1s0x47949886fda87293:0x408a91bddda628de!6m1!1v5!8m2!3d48.6719789!4d6.1723281!16s%2Fg%2F11myzt_17_?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.6719053,6.1724845,99m/data=!3m1!1e3!4m8!3m7!1s0x47949886fda87255:0x63caae178d22b4ef!6m1!1v5!8m2!3d48.6720305!4d6.172642!16s%2Fg%2F11x8hz8x2h?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Exelmans', 
      coords: [48.675217, 6.176070] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre Roberval',
          url: 'https://www.google.com/maps/place/Exelmans/@48.6752469,6.1758841,16z/data=!4m8!3m7!1s0x4794987d4f7cc1ab:0xabc2e0a1d45c1f62!6m1!1v5!8m2!3d48.6752469!4d6.1758841!16s%2Fg%2F11ywt9grnh!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.com/maps/place/Exelmans/@48.6750019,6.1758161,16z/data=!4m8!3m7!1s0x4794987d5009e525:0x5ea06c5de0d4bcff!6m1!1v5!8m2!3d48.6750019!4d6.1758161!16s%2Fg%2F11yvmtprld!17m2!4m1!1e3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jean Jaurès', 
      coords: [48.679128, 6.180410] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Jean+Jaur%C3%A8s/@48.6791753,6.1801443,18.92z/data=!4m8!3m7!1s0x47949864801a0e1f:0x6d03f5aa4d69713e!6m1!1v5!8m2!3d48.67925!4d6.1804525!16s%2Fg%2F11c5_yj7tw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Jean+Jaur%C3%A8s/@48.6793383,6.1805644,20.16z/data=!4m8!3m7!1s0x479498647934541f:0x851eea5afebeccf3!6m1!1v5!8m2!3d48.6793098!6d6.1807367!16s%2Fg%2F11fn260x1b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Garenne - Saurupt', 
      coords: [48.681798, 6.183409] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Garenne+-+Saurupt/@48.6813903,6.1823878,19.37z/data=!4m8!3m7!1s0x4794986434723653:0x37da1e112ef68043!6m1!1v5!8m2!3d48.681383!4d6.182836!16s%2Fg%2F11xvpz62zl?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Garenne+-+Saurupt/@48.6820531,6.1832371,19.37z/data=!4m8!3m7!1s0x47949865d836f3a3:0x7befcee7ca8de6ad!6m1!1v5!8m2!3d48.682236!4d6.184035!16s%2Fg%2F11xd8rqp26?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Pichon Direction Sud', 
      coords: [48.683524, 6.185382] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Pichon/@48.6836145,6.1848552,18.94z/data=!4m8!3m7!1s0x479498661c6127ad:0x628714adcce75c9d!6m1!1v5!8m2!3d48.6835659!4d6.1853214!16s%2Fg%2F11c5_sp57d?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Pichon Direction Nord', 
      coords: [48.684524, 6.186486] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Pichon/@48.6846137,6.1866506,20.04z/data=!4m8!3m7!1s0x479498689926ac21:0x9323d9ffe1f60327!6m1!1v5!8m2!3d48.684528!4d6.186583!16s%2Fg%2F11ddxfv337?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Sud', 
      coords: [48.686100, 6.184457] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6862201,6.1841763,19.56z/data=!4m8!3m7!1s0x4794986f2f073daf:0x2ab9dc3c891c1237!6m1!1v5!8m2!3d48.686092!4d6.184456!16s%2Fg%2F11c2p8c3vt?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Nord', 
      coords: [48.687646, 6.184797] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6866564,6.1842266,17.42z/data=!4m8!3m7!1s0x4794986ec96758e7:0xfa2c06d1f65cceb6!6m1!1v5!8m2!3d48.6876289!4d6.1848987!16s%2Fg%2F11ddxjzmlr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Sud', 
      coords: [48.689066, 6.182293] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.6891846,6.1821947,19.78z/data=!4m8!3m7!1s0x4794986e7eb595e9:0xda0c16e2a93099a7!6m1!1v5!8m2!3d48.688946!4d6.182275!16s%2Fg%2F11fn25wfc0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Nord', 
      coords: [48.689725, 6.183256] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.689738,6.1830833,19.97z/data=!4m8!3m7!1s0x4794986c2fa416d3:0x6ce0accf3d312599!6m1!1v5!8m2!3d48.6897402!4d6.1833435!16s%2Fg%2F11c2p3qxvd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Sud', 
      coords: [48.690898, 6.180990] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6912296,6.1809476,18.58z/data=!4m8!3m7!1s0x4794986d91c5c17f:0xc037e67b6cef6764!6m1!1v5!8m2!3d48.690914!4d6.180878!16s%2Fg%2F11ddxp_qxw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Nord', 
      coords: [48.692003, 6.181538] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6918028,6.1814784,19.26z/data=!4m8!3m7!1s0x4794986d748e8975:0xbf7155ff4d7abc40!6m1!1v5!8m2!3d48.6920566!4d6.1816469!16s%2Fg%2F11c5_sr0nc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Amerval Direction Nord', 
      coords: [48.693032, 6.180786] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Amerval/@48.6932385,6.1801501,18.58z/data=!4m8!3m7!1s0x47949872a7fb8c3d:0x2fc05741d9b87456!6m1!1v5!8m2!3d48.693569!4d6.180514!16s%2Fg%2F11xd8npp76?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Carnot Direction Sud', 
      coords: [48.692857, 6.177022] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Place+Carnot/@48.6928988,6.1767242,106m/data=!3m1!1e3!4m8!3m7!1s0x479498731a2a9961:0xbcdffd07b687597a!6m1!1v5!8m2!3d48.692944!4d6.176891!16s%2Fg%2F11ddxk93s2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Baron Louis Direction Sud', 
      coords: [48.696276, 6.174582] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Baron+Louis/@48.6962601,6.1744511,251m/data=!3m1!1e3!4m8!3m7!1s0x4794980b658091e7:0x41e997b3f2f8a4d8!6m1!1v5!8m2!3d48.6962533!4d6.174538!16s%2Fg%2F11ddxph474?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Carnot Direction Nord', 
      coords: [48.694287, 6.177591] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Place+Carnot/@48.6941543,6.1775592,108m/data=!3m1!1e3!4m8!3m7!1s0x479498732b08c373:0x3ff782a04d555c15!6m1!1v5!8m2!3d48.694336!4d6.177522!16s%2Fg%2F11h_1l5qx0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Cours Léopold Direction Nord', 
      coords: [48.695966, 6.176390] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Cours+L%C3%A9opold/@48.6957998,6.1763331,117m/data=!3m1!1e3!4m8!3m7!1s0x4794980c94e54fdd:0x5577aac67f547917!6m1!1v5!8m2!3d48.6960099!4d6.1764502!16s%2Fg%2F11ddxfh9gg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Désilles', 
      coords: [48.698336, 6.173902] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/D%C3%A9silles/@48.6982737,6.1735626,102m/data=!3m1!1e3!4m8!3m7!1s0x4794980bbf8189d1:0x99d726b8bd9e62a1!6m1!1v5!8m2!3d48.6984161!4d6.1739715!16s%2Fg%2F11c2p3tmg9?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/D%C3%A9silles/@48.6982737,6.1735626,102m/data=!3m1!1e3!4m8!3m7!1s0x4794980bbda412fd:0xe8bc568167eac236!6m1!1v5!8m2!3d48.6983573!4d6.1737824!16s%2Fg%2F11c2p8m38h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Fiacre', 
      coords: [48.701023, 6.171971] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Saint-Fiacre/@48.7008012,6.171784,107m/data=!3m1!1e3!4m8!3m7!1s0x4794980996fca93f:0xc811a42bf6e21dec!6m1!1v5!8m2!3d48.7008646!4d6.172176!16s%2Fg%2F11c5_smf3l?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Saint-Fiacre/@48.7007734,6.1721686,33a,55y,3.67t/data=!3m1!1e3!4m8!3m7!1s0x479498099598377f:0x9f6c772d02a89602!6m1!1v5!8m2!3d48.7008793!4d6.1721791!16s%2Fg%2F11c2p80b3v?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Carsat', 
      coords: [48.703160, 6.170455] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Carsat/@48.7030595,6.1705027,67m/data=!3m1!1e3!4m8!3m7!1s0x4794a2a7888b6223:0xadde1cd7c1f93c14!6m1!1v5!8m2!3d48.703095!4d6.1703937!16s%2Fg%2F11c5_shvlc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Brasseries', 
      coords: [48.706122, 6.167832] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Brasseries/@48.7056984,6.1681203,207m/data=!3m1!1e3!4m8!3m7!1s0x4794a2a88b7e010f:0x5ce1d71acd8950bf!6m1!1v5!8m2!3d48.7061651!4d6.1679189!16s%2Fg%2F11c5_sbml_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Brasseries/@48.7056984,6.1681203,207m/data=!3m1!1e3!4m8!3m7!1s0x4794a2a88c00d47d:0x2167bd82de8a9724!6m1!1v5!8m2!3d48.7059985!4d6.1678612!16s%2Fg%2F11c2p9qdc_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Lavoir', 
      coords: [48.709033, 6.167005] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Lavoir/@48.7089603,6.1666578,203m/data=!3m1!1e3!4m8!3m7!1s0x4794a2a9473932b7:0xd61596f4925262b7!6m1!1v5!8m2!3d48.7089978!4d6.1669037!16s%2Fg%2F11c5_sxfw9?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Lavoir/@48.7089603,6.1666578,203m/data=!3m1!1e3!4m8!3m7!1s0x4794a2a9416b9625:0x2ab828a82f396b6e!6m1!1v5!8m2!3d48.7091495!4d6.16718!16s%2Fg%2F11c2p70wyk?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Courbet', 
      coords: [48.712318, 6.167999] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Courbet/@48.7114291,6.1673978,72m/data=!3m1!1e3!4m8!3m7!1s0x4794a2ab959ef883:0xf31049d8c5b467d9!6m1!1v5!8m2!3d48.7115332!4d6.1678333!16s%2Fg%2F11c5_t604l?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Courbet/@48.7131981,6.1680772,31a,57y,4.67t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ab72852155:0x10d4556cc0745297!6m1!1v5!8m2!3d48.713209!4d6.168128!16s%2Fg%2F11xt2jk3hw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Pont Fleuri', 
      coords: [48.716398, 6.169120] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Pont+Fleuri/@48.7163068,6.1687912,116a,35y,1.78t/data=!3m1!1e3!4m8!3m7!1s0x4794bd54c01a2be9:0xb3789156a2ae934d!6m1!1v5!8m2!3d48.71642!4d6.16908!16s%2Fg%2F11jzxj1yzs?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Maxéville',
          url: 'https://www.google.fr/maps/place/Pont+Fleuri/@48.7167632,6.1692136,118m/data=!3m1!1e3!4m8!3m7!1s0x4794bd54f1701d85:0xd87d87154614bdc2!6m1!1v5!8m2!3d48.717138!4d6.16956!16s%2Fg%2F11yjk4d_tg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Maxéville Meurthe-Canal', 
      coords: [48.713962, 6.172240] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Max%C3%A9ville+Meurthe-Canal/@48.7137867,6.1717218,116m/data=!3m1!1e3!4m8!3m7!1s0x4794a2aabcb2ba6f:0x398e310a54dd2072!6m1!1v5!8m2!3d48.713923!4d6.172208!16s%2Fg%2F11yjk4q_fq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    }
  ]
};

const tramLineT4: TramLine = {
  id: 'T4',
  name: 'Ligne T4',
  description: 'Houdemont Porte Sud ↔ Laxou Champ-le-Beouf',
  color: '#FFD700', // Jaune
  coordinates: [
    [48.637413, 6.185020], // Houdemont Porte Sud
    [48.637257, 6.185154], // Point intermédiaire
    [48.636934, 6.185235], // Point intermédiaire
    [48.636805, 6.182854], // Point intermédiaire
    [48.642456, 6.182125], // Erables
    [48.645024, 6.181874], // Houdemont Gare
    [48.646451, 6.181955], // Point intermédiaire
    [48.650075, 6.183543], // Les Mûriers
    [48.652407, 6.184764], // Route d'Heillecourt
    [48.654087, 6.185719], // Point intermédiaire
    [48.654615, 6.185892], // Point intermédiaire
    [48.655356, 6.186037], // Mermoz
    [48.657900, 6.186093], // Point intermédiaire
    [48.659245, 6.186586], // Point intermédiaire
    [48.660026, 6.187042], // Point intermédiaire
    [48.660398, 6.187331], // Point intermédiaire
    [48.661021, 6.187689], // Point intermédiaire
    [48.660879, 6.186745], // Point intermédiaire
    [48.660502, 6.185499], // Place de Londres
    [48.659644, 6.182601], // Amsterdam
    [48.659117, 6.180849], // Angleterre
    [48.658979, 6.180400], // Point intermédiaire
    [48.660280, 6.179623], // Goethe
    [48.661006, 6.179295], // Point intermédiaire
    [48.662562, 6.176685], // Parc des Sports - Nations
    [48.663842, 6.174714], // Point intermédiaire
    [48.664239, 6.174252], // Point intermédiaire
    [48.664913, 6.174753], // Vandeouvre - Marché
    [48.666435, 6.176516], // Point intermédiaire
    [48.667045, 6.177019], // Norvège
    [48.668390, 6.178028], // Point intermédiaire
    [48.669132, 6.178059], // Point intermédiaire
    [48.670003, 6.178592], // Wilson
    [48.670519, 6.178936], // Point intermédiaire
    [48.671257, 6.180159], // Point intermédiaire
    [48.672438, 6.181751], // Briand
    [48.673603, 6.183290], // Point intermédiaire
    [48.673861, 6.183327], // Point intermédiaire
    [48.674719, 6.182698], // Sainte-Colette
    [48.676077, 6.181796], // Oudinot
  ] as [number, number][],
  // Tracé direction Laxou Champ-le-Beouf (gauche)
  coordinatesLaxou: [
    [48.676077, 6.181796], // Oudinot
    [48.678344, 6.180329], // Point intermédiaire
    [48.678827, 6.180072], // Point intermédiaire
    [48.679128, 6.180410], // Jean Jaurès (partagé avec T5)
    [48.681798, 6.183409], // Garenne - Saurupt (partagé avec T5)
    [48.683003, 6.184788], // Point intermédiaire
    [48.683524, 6.185382], // Pichon Direction Sud
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
    [48.686733, 6.168055], // Point intermédiaire
    [48.686566, 6.167868], // Commanderie Direction Sud
    [48.686058, 6.167258], // Point intermédiaire
    [48.686013, 6.167089], // Point intermédiaire
    [48.686012, 6.166898], // Point intermédiaire
    [48.687561, 6.166235], // Préville Direction Sud
    [48.688145, 6.165968], // Point intermédiaire
    [48.688372, 6.165614], // Point intermédiaire
    [48.688917, 6.162981], // Saintifontaine
    [48.689584, 6.159877], // Messier
    [48.690433, 6.155906], // Chemin Blanc
    [48.691116, 6.152686], // Marquette
    [48.691805, 6.149374], // La Côte
    [48.692534, 6.145934], // Viray
    [48.692731, 6.145027], // Point intermédiaire
    [48.692928, 6.143324], // Point intermédiaire
    [48.693259, 6.140156], // Beauregard Sainte-Anne
    [48.693497, 6.138098], // Point intermédiaire
    [48.693037, 6.138168], // Boufflers
    [48.691318, 6.138464], // Georges de la Tour
    [48.690670, 6.138560], // Point intermédiaire
    [48.690284, 6.137243], // Point intermédiaire
    [48.689416, 6.135194], // Observatoire
    [48.688937, 6.134220], // Point intermédiaire
    [48.689204, 6.132839], // Croix Saint-Claude
    [48.689783, 6.130048], // Point intermédiaire
    [48.690321, 6.128707], // Point intermédiaire
    [48.690981, 6.128387], // Laxou Sapinière
    [48.692532, 6.128162], // Point intermédiaire
    [48.694612, 6.128002], // Point intermédiaire
  ] as [number, number][],
  // Tracé direction Houdemont Porte Sud (droite)
  coordinatesHoudemont: [
    [48.684081, 6.185994], // Point intermédiaire
    [48.684524, 6.186486], // Pichon Direction Nord
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

    [48.689870, 6.171286], // Gare - Raymond Poincaré Direction Nord
    [48.689266, 6.169294], // Bégonias Direction Nord
    [48.688424, 6.166499], // Préville Direction Nord
    [48.688337, 6.166199], // Point intermédiaire
    [48.688347, 6.165914], // Point intermédiaire
    [48.688372, 6.165614], // Point intermédiaire
    [48.688917, 6.162981], // Saintifontaine
    [48.689584, 6.159877], // Messier
    [48.690433, 6.155906], // Chemin Blanc
    [48.691116, 6.152686], // Marquette
    [48.691805, 6.149374], // La Côte
    [48.692534, 6.145934], // Viray
    [48.692731, 6.145027], // Point intermédiaire
    [48.692928, 6.143324], // Point intermédiaire
    [48.693259, 6.140156], // Beauregard Sainte-Anne
    [48.693497, 6.138098], // Point intermédiaire
    [48.693037, 6.138168], // Boufflers
    [48.691318, 6.138464], // Georges de la Tour
    [48.690670, 6.138560], // Point intermédiaire
    [48.690284, 6.137243], // Point intermédiaire
    [48.689416, 6.135194], // Observatoire
    [48.688937, 6.134220], // Point intermédiaire
    [48.689204, 6.132839], // Croix Saint-Claude
    [48.689783, 6.130048], // Point intermédiaire
    [48.690321, 6.128707], // Point intermédiaire
  ] as [number, number][],
  stops: [
    { 
      name: 'Houdemont Porte Sud', 
      coords: [48.637413, 6.185020] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Houdemont+Porte+Sud/@48.6374452,6.1844724,107m/data=!3m1!1e3!4m8!3m7!1s0x479498cbdb5a2da3:0x76537508e8a3a703!6m1!1v5!8m2!3d48.6374127!4d6.1851892!16s%2Fg%2F11h_1kwbf6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Erables', 
      coords: [48.642456, 6.182125] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Erables/@48.6426592,6.1822878,151m/data=!3m1!1e3!4m8!3m7!1s0x479498c818aa2103:0xad089dddabdea68!6m1!1v5!8m2!3d48.642738!4d6.182048!16s%2Fg%2F11ddxk17lc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Erables/@48.6426592,6.1822878,151m/data=!3m1!1e3!4m8!3m7!1s0x479498b80a515eb7:0x5598cd7882b6f58c!6m1!1v5!8m2!3d48.64233!4d6.182185!16s%2Fg%2F11c6_g7fsg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Houdemont Gare', 
      coords: [48.645024, 6.181874] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Houdemont+Gare/@48.6450939,6.182644,432m/data=!3m1!1e3!4m8!3m7!1s0x479498b80b7b8a35:0x7e607167a3c702ff!6m1!1v5!8m2!3d48.645088!4d6.181778!16s%2Fg%2F11c5_rgy4c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Houdemont+Gare/@48.6448595,6.1822148,104m/data=!3m1!1e3!4m8!3m7!1s0x479498b80a683a91:0x676a8d3432367367!6m1!1v5!8m2!3d48.644962!4d6.181986!16s%2Fg%2F11ddxmy9cs?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Les Mûriers', 
      coords: [48.650075, 6.183543] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Les+M%C3%BBriers/@48.6500098,6.1835294,399m/data=!3m1!1e3!4m8!3m7!1s0x479498c098964f5b:0x978c767eaa6ab3e9!6m1!1v5!8m2!3d48.650139!4d6.183645!16s%2Fg%2F11ddxntzmd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Les+M%C3%BBriers/@48.6500098,6.1835294,399m/data=!3m1!1e3!4m8!3m7!1s0x479498c0a04add01:0x4d2b97cad1a16680!6m1!1v5!8m2!3d48.650082!4d6.183437!16s%2Fg%2F11c5_h3hc8?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Route d\'Heillecourt', 
      coords: [48.652407, 6.184764] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Route+d\'Heillecourt/@48.6522768,6.1846669,73m/data=!3m1!1e3!4m8!3m7!1s0x479498c06b7a04e1:0x9d0494fde890a97d!6m1!1v5!8m2!3d48.652478!4d6.184869!16s%2Fg%2F11c2p3_1zr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Route+d\'Heillecourt/@48.6522768,6.1846669,73m/data=!3m1!1e3!4m8!3m7!1s0x479498c06e762f6d:0x3634a54b53371229!6m1!1v5!8m2!3d48.652294!4d6.184633!16s%2Fg%2F11ddxkt1kx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mermoz', 
      coords: [48.655356, 6.186037] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Mermoz/@48.6549793,6.1861035,154m/data=!3m1!1e3!4m8!3m7!1s0x479498ea948921bf:0xdbed752a5ef9e1a1!6m1!1v5!8m2!3d48.654865!4d6.186032!16s%2Fg%2F11ddxfh9gd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Mermoz/@48.6555173,6.1860602,155m/data=!3m1!1e3!4m8!3m7!1s0x479498eadd75c209:0x29cd2c929668e1fb!6m1!1v5!8m2!3d48.655823!4d6.18594!16s%2Fg%2F11c5_r6d09?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place de Londres', 
      coords: [48.660502, 6.185499] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+de+Londres/@48.6606573,6.1858438,76a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x479498ecd202b2db:0x4000a914838a7352!6m1!1v5!8m2!3d48.660715!4d6.186009!16s%2Fg%2F11h_1kwm7y?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Place+de+Londres/@48.6606573,6.1858438,76a,35y,1.58t/data=!3m1!1e3!4m8!3m7!1s0x479498ecd1fecd91:0x7f83968b05399bb2!6m1!1v5!8m2!3d48.6607362!4d6.18592!16s%2Fg%2F11hdsft_p5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Amsterdam', 
      coords: [48.659644, 6.182601] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Amsterdam/@48.6598174,6.1824476,333a,35y,1.57t/data=!3m1!1e3!4m8!3m7!1s0x47949893712f35c5:0x27e59488b3fb1f5a!6m1!1v5!8m2!3d48.6597833!4d6.1827267!16s%2Fg%2F11ddxnhv09?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Amsterdam/@48.6598174,6.1824476,333a,35y,1.57t/data=!3m1!1e3!4m8!3m7!1s0x4794989379b719f3:0x69c1b881ff776673!6m1!1v5!8m2!3d48.659542!4d6.182472!16s%2Fg%2F11c2p8c3vp?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Angleterre', 
      coords: [48.659117, 6.180849] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Angleterre/@48.6592539,6.1804018,330a,35y,1.57t/data=!3m1!1e3!4m8!3m7!1s0x479498938afb27e1:0x1916c9684f117149!6m1!1v5!8m2!3d48.659073!4d6.181001!16s%2Fg%2F11ddxpjvtm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Angleterre/@48.6592539,6.1804018,330a,35y,1.57t/data=!3m1!1e3!4m8!3m7!1s0x47949893e6b0f0b3:0x7d2cfbc12172bf29!6m1!1v5!8m2!3d48.6592043!4d6.1808152!16s%2Fg%2F11fn269jzn?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Goethe', 
      coords: [48.660280, 6.179623] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Goethe/@48.6590835,6.1798409,406a,35y,1.57t/data=!3m1!1e3!4m8!3m7!1s0x47949893f084034f:0x95131ca0432ef558!6m1!1v5!8m2!3d48.659554!4d6.180021!16s%2Fg%2F11h_1ldvzq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Goethe/@48.6598137,6.1797357,215a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x47949893e0c41097:0x47a78d26c2e5b02f!6m1!1v5!8m2!3d48.660289!4d6.1797269!16s%2Fg%2F11ddxn9ccf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Parc des Sports - Nations', 
      coords: [48.662562, 6.176685] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Parc+des+Sports+-+Nations/@48.6617055,6.1762712,784a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x4794989175344c7b:0x888184a4b2133360!6m1!1v5!8m2!3d48.661628!4d6.178198!16s%2Fg%2F11yjk1k9g0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Parc+des+Sports+-+Nations/@48.6617055,6.1762712,784a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x47949891a0093a5f:0xcbd07ce60966c5da!6m1!1v5!8m2!3d48.6633097!4d6.175676!16s%2Fg%2F11hdsfz1fj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vandeouvre - Marché', 
      coords: [48.664913, 6.174753] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Vandoeuvre+-+March%C3%A9/@48.6649675,6.1742409,336a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x4794988ffbc7e121:0xa2efa8262fcb9ffa!6m1!1v5!8m2!3d48.664879!4d6.174809!16s%2Fg%2F11c2p8c3vd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Vandoeuvre+-+March%C3%A9/@48.6647828,6.1746001,117a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x4794988ff8c99d4b:0x9f2af1834882510a!6m1!1v5!8m2!3d48.664993!4d6.174791!16s%2Fg%2F11hdsfygsb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Norvège', 
      coords: [48.667045, 6.177019] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Norv%C3%A8ge/@48.6667117,6.1766414,228a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x4794988f0870a30f:0xcbbd2b1728308975!6m1!1v5!8m2!3d48.666896!4d6.1770157!16s%2Fg%2F11ddxp7ydk?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Norv%C3%A8ge/@48.6667117,6.1766414,228a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x4794988f0f251d2b:0xce5b06645cb7bd43!6m1!1v5!8m2!3d48.667183!4d6.176998!16s%2Fg%2F11c2pf1gmr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Wilson', 
      coords: [48.670003, 6.178592] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Wilson/@48.6696109,6.1784986,383a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949889274314eb:0x7d4ec8f661a7d395!6m1!1v5!8m2!3d48.6701057!4d6.1785565!16s%2Fg%2F11c5_rmjzy?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Wilson/@48.6697926,6.1785675,210a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794988926913ffd:0x22e044724c4350f0!6m1!1v5!8m2!3d48.670017!4d6.178627!16s%2Fg%2F11hdsgcfs8?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Briand', 
      coords: [48.672438, 6.181751] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Briand/@48.6715283,6.1804878,690a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x479498898f82ba6b:0x8bec4538d0f61950!6m1!1v5!8m2!3d48.672279!4d6.181315!16s%2Fg%2F11c2p7fxg7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Briand/@48.6715283,6.1804878,690a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x479498899cf1640f:0xbe59824419666654!6m1!1v5!8m2!3d48.672679!4d6.1821586!16s%2Fg%2F11fn25rmp4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Sainte-Colette', 
      coords: [48.674719, 6.182698] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Sainte-Colette/@48.6738786,6.1830212,525a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x47949861f765eabf:0x14238a12291f6267!6m1!1v5!8m2!3d48.674753!4d6.182792!16s%2Fg%2F11c2p82099?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Sainte-Colette/@48.6743444,6.1828508,201a,35y,1.38t/data=!3m1!1e3!4m8!3m7!1s0x479498621d7be6eb:0x2d85ea0947d2d009!6m1!1v5!8m2!3d48.6748329!4d6.1825476!16s%2Fg%2F11l1yfwq_p?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Oudinot Direction Nord', 
      coords: [48.676077, 6.181796] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Oudinot/@48.6762844,6.1816058,102a,35y,1.21t/data=!3m1!1e3!4m8!3m7!1s0x4799486230f4f269:0xe0d3f6f81f90ff49!6m1!1v5!8m2!3d48.676327!4d6.181712!16s%2Fg%2F11c5_skn92?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jean Jaurès', 
      coords: [48.679128, 6.180410] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Jean+Jaur%C3%A8s/@48.6790966,6.1800858,198a,35y,1.06t/data=!3m1!1e3!4m8!3m7!1s0x47949864801a0e1f:0x6d03f5aa4d69713e!6m1!1v5!8m2!3d48.67925!4d6.1804525!16s%2Fg%2F11c5_yj7tw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Jean+Jaur%C3%A8s/@48.6790966,6.1800858,198a,35y,1.06t/data=!3m1!1e3!4m8!3m7!1s0x479498647934541f:0x851eea5afebeccf3!6m1!1v5!8m2!3d48.6793098!4d6.1807367!16s%2Fg%2F11fn260x1b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Garenne - Saurupt', 
      coords: [48.681798, 6.183409] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Garenne+-+Saurupt/@48.6812843,6.1824441,202a,35y,1.06t/data=!3m1!1e3!4m8!3m7!1s0x4794986434723653:0x37da1e112ef68043!6m1!1v5!8m2!3d48.681383!4d6.182836!16s%2Fg%2F11xvpz62zl?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Garenne+-+Saurupt/@48.6819225,6.1832675,199a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x47949865d836f3a3:0x7befcee7ca8de6ad!6m1!1v5!8m2!3d48.682236!4d6.184035!16s%2Fg%2F11xd8rqp26?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Pichon Direction Sud', 
      coords: [48.683524, 6.185382] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Pichon/@48.683432,6.1850023,201a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x479498661c6127ad:0x628714adcce75c9d!6m1!1v5!8m2!3d48.6835659!4d6.1853214!16s%2Fg%2F11c5_sp57d?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]      
    },
    { 
      name: 'Pichon Direction Nord', 
      coords: [48.684524, 6.186486] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Pichon/@48.6843464,6.1862196,287a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498689926ac21:0x9323d9ffe1f60327!6m1!1v5!8m2!3d48.684528!4d6.186583!16s%2Fg%2F11ddxfv337?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Sud', 
      coords: [48.686100, 6.184457] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.685147,6.1851115,520a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986f2f073daf:0x2ab9dc3c891c1237!6m1!1v5!8m2!3d48.686092!4d6.184456!16s%2Fg%2F11c2p8c3vt?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Nord', 
      coords: [48.687646, 6.184797] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6870927,6.1839972,657a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986ec96758e7:0xfa2c06d1f65cceb6!6m1!1v5!8m2!3d48.6876289!4d6.1848987!16s%2Fg%2F11ddxjzmlr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3DD'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Sud', 
      coords: [48.689066, 6.182293] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.689044,6.1822009,171a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986e7eb595e9:0xda0c16e2a93099a7!6m1!1v5!8m2!3d48.688946!4d6.182275!16s%2Fg%2F11fn25wfc0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Nord', 
      coords: [48.689725, 6.183256] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.6890148,6.1823061,659a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986c2fa416d3:0x6ce0accf3d312599!6m1!1v5!8m2!3d48.6897402!4d6.1833435!16s%2Fg%2F11c2p3qxvd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Sud', 
      coords: [48.690898, 6.180990] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6908554,6.1808107,347a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986d91c5c17f:0xc037e67b6cef6764!6m1!1v5!8m2!3d48.690914!4d6.180878!16s%2Fg%2F11ddxp_qxw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare Thiers Poirel Direction Sud', 
      coords: [48.690365, 6.175653] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Gare+Thiers+Poirel/@48.6903806,6.1755869,79a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x47949873c41361d1:0xc06ebe819d4291ac!6m1!1v5!8m2!3d48.6904283!4d6.1757069!16s%2Fg%2F11hdsgcfs6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Nord', 
      coords: [48.692003, 6.181538] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6910745,6.1802457,999a,35y,0.96t/data=!3m1!1e3!4m18!1m9!3m8!1s0x4794986d91c5c17f:0xc037e67b6cef6764!2sPlace+Stanislas+-+Dom+Calmet!6m1!1v5!8m2!3d48.690914!4d6.180878!16s%2Fg%2F11ddxp_qxw!3m7!1s0x4794986d748e8975:0xbf7155ff4d7abc40!6m1!1v5!8m2!3d48.6920566!4d6.1816469!16s%2Fg%2F11c5_sr0nc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Bibliothèque Direction Nord', 
      coords: [48.692137, 6.178665] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Biblioth%C3%A8que/@48.6917621,6.1781087,375a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x47949872f4a1e39d:0xbdc547c881c0289f!6m1!1v5!8m2!3d48.692165!4d6.178653!16s%2Fg%2F11c5_s3w3h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Tour Thiers Gare Direction Nord', 
      coords: [48.690849, 6.174509] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Tour+Thiers+Gare/@48.690536,6.1745642,369a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x479498738d12f2fd:0x315ce76bd5931941!6m1!1v5!8m2!3d48.6908987!4d6.1744956!16s%2Fg%2F11c5_lc19l?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare - Raymond Poincaré Direction Nord', 
      coords: [48.689870, 6.171286] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Gare+-+Raymond+Poincar%C3%A9/@48.6896349,6.1717141,331a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794987429a3b4d3:0xbc15e919aabd107f!6m1!1v5!8m2!3d48.689922!4d6.171256!16s%2Fg%2F11ddxq3mmb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Bégonias Direction Nord', 
      coords: [48.689266, 6.169294] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/B%C3%A9gonias/@48.6891205,6.1691298,197a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x479498760d576787:0xcfddef7c7375c27e!6m1!1v5!8m2!3d48.689281!4d6.169061!16s%2Fg%2F11fn2659ch?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Léon Direction Sud', 
      coords: [48.688326, 6.173023] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Saint+L%C3%A9on/@48.6882737,6.1729299,222a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x47949876ca29f0e3:0xbf9db145abce3e1c!6m1!1v5!8m2!3d48.6882784!4d6.1730729!16s%2Fg%2F11c5_sg2br?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Commanderie Direction Sud', 
      coords: [48.686566, 6.167868] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Commanderie/@48.6864962,6.1677529,200a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x47949877c462fe41:0x7279fb4150900fc0!6m1!1v5!8m2!3d48.68679!4d6.168016!16s%2Fg%2F11c5_s5jv6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Préville Direction Sud', 
      coords: [48.687561, 6.166235] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Pr%C3%A9ville/@48.6876171,6.1660423,197a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29d9df53b7f:0xd225b43d33a4d920!6m1!1v5!8m2!3d48.687504!4d6.1661898!16s%2Fg%2F11c5_gb8kg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Préville Direction Nord', 
      coords: [48.688424, 6.166499] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Pr%C3%A9ville/@48.688417,6.1662961,197a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29d922c5189:0x4804bc6460815986!6m1!1v5!8m2!3d48.688462!4d6.166494!16s%2Fg%2F11c2p8kdnm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saintifontaine', 
      coords: [48.688917, 6.162981] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Santifontaine/@48.6888042,6.1625765,191a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29c40d47fab:0xe54738bc2f069c48!6m1!1v5!8m2!3d48.688866!4d6.163308!16s%2Fg%2F11c5_t6046?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Santifontaine/@48.6888042,6.1625765,191a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29c135fafab:0x3fa052ba2a05db58!6m1!1v5!8m2!3d48.68903!4d6.162654!16s%2Fg%2F11ddxmq4c3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Messier', 
      coords: [48.689584, 6.159877] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Messier/@48.6891534,6.1593759,333a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29be9ef33bb:0x6ea3354482dcfa74!6m1!1v5!8m2!3d48.689533!4d6.160122!16s%2Fg%2F11c5_lltf5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Messier/@48.6891534,6.1593759,333a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29bc4ea2959:0x4adadb5a7d993aaf!6m1!1v5!8m2!3d48.689674!4d6.159643!16s%2Fg%2F11c2p6wbgf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Chemin Blanc', 
      coords: [48.690433, 6.155906] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Chemin+Blanc/@48.6900996,6.1558,313a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29a016a5843:0x11f45dac0eee0e77!6m1!1v5!8m2!3d48.6903601!4d6.1560431!16s%2Fg%2F11c2p4795h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Chemin+Blanc/@48.6900996,6.1558,313a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a290aa9fc621:0xb354bd487e9244d7!6m1!1v5!8m2!3d48.690502!4d6.155789!16s%2Fg%2F11c2p7y04c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Marquette', 
      coords: [48.691116, 6.152686] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Marquette/@48.6908219,6.1521686,292a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a296d6f5c5b5:0xc7947ff8b9516b88!6m1!1v5!8m2!3d48.6911971!4d6.1527104!16s%2Fg%2F11c5_jmfq5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Marquette/@48.6908219,6.1521686,292a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a296d5d6e8e9:0x2dae6f0ba1f5acf2!6m1!1v5!8m2!3d48.6910987!4d6.1526044!16s%2Fg%2F11ddxn1rjh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'La Côte', 
      coords: [48.691805, 6.149374] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/La+C%C3%B4te/@48.6915449,6.1488626,259a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a294172c8019:0x7ecc7e784bea6afc!6m1!1v5!8m2!3d48.6917355!4d6.1495358!16s%2Fg%2F11ddxfv338?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/La+C%C3%B4te/@48.6915449,6.1488626,259a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a29411110339:0x5d3a58bf71fd2074!6m1!1v5!8m2!3d48.691807!4d6.149007!16s%2Fg%2F11xfzndrz_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Viray', 
      coords: [48.692534, 6.145934] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Viray/@48.6923057,6.1455523,244a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a294eb689337:0x7f5da17d35f8e919!6m1!1v5!8m2!3d48.6924873!4d6.1459848!16s%2Fg%2F11c5_gb8km?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Viray/@48.6923057,6.1455523,244a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a294ea154117:0x9c429c59929ca99d!6m1!1v5!8m2!3d48.6926045!4d6.1459355!16s%2Fg%2F11c5_hmknx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Beauregard Sainte-Anne', 
      coords: [48.693259, 6.140156] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Beauregard+Sainte-Anne/@48.6929688,6.1402547,240a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2eba4f89091:0x842431fd7cb9f138!6m1!1v5!8m2!3d48.693119!4d6.140662!16s%2Fg%2F11h_1lf68q?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Beauregard+Sainte-Anne/@48.6929688,6.1402547,240a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ebb095cf85:0xaac8ed3c62511ec7!6m1!1v5!8m2!3d48.693386!4d6.14026!16s%2Fg%2F11h_1lf68r?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Boufflers', 
      coords: [48.693037, 6.138168] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Boufflers/@48.6927782,6.1377427,244a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ebdf694cb5:0xf5921451e358eae2!6m1!1v5!8m2!3d48.693172!4d6.138232!16s%2Fg%2F11c5_rgy4j?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Boufflers/@48.6927782,6.1377427,244a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e96032a393:0xf9b71858eb31122e!6m1!1v5!8m2!3d48.692965!4d6.1381318!16s%2Fg%2F11ddxng4kd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Georges de la Tour', 
      coords: [48.691318, 6.138464] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Georges+de+la+Tour/@48.6911191,6.1379732,242a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ec0601150b:0x3975ec78377d516e!6m1!1v5!8m2!3d48.691393!4d6.138478!16s%2Fg%2F11hdsg92qp?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Georges+de+la+Tour/@48.6904082,6.1375979,243a,35y,1.11t/data=!3m1!1e3!4m8!3m7!1s0x4794a2eea0b06987:0xf17ce4c4004de183!6m1!1v5!8m2!3d48.690598!4d6.137609!16s%2Fg%2F11xd8pxvfc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Observatoire', 
      coords: [48.689416, 6.135194] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Observatoire/@48.6892531,6.1343448,369a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2eef9a55787:0xbe431c5fbb2dbc5c!6m1!1v5!8m2!3d48.689396!4d6.134993!16s%2Fg%2F11h_1l02jm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Observatoire/@48.6892531,6.1343448,369a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2eef9ae0ec3:0x4421dc23e30207f2!6m1!1v5!8m2!3d48.6893769!4d6.1351859!16s%2Fg%2F11c5_r24fv?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Croix Saint-Claude', 
      coords: [48.689204, 6.132839] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Croix+St-Claude/@48.6891882,6.1332114,370a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2efa7c421a9:0x7203877908adf837!6m1!1v5!8m2!3d48.6891833!4d6.1334205!16s%2Fg%2F11c5_qz1nb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Croix+Saint-Claude/@48.6891855,6.1324152,363a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ef828e7cb1:0x900c4d1c564d9692!6m1!1v5!8m2!3d48.6892937!4d6.1319705!16s%2Fg%2F11c2p83qbq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laxou Sapinière', 
      coords: [48.690981, 6.128387] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Laxou+Sapini%C3%A8re/@48.6905765,6.1283264,344a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e43675b307:0x8c9da9864ac7d027!6m1!1v5!8m2!3d48.690872!4d6.128344!16s%2Fg%2F11ddxflx__?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laxou+Sapini%C3%A8re/@48.6905765,6.1283264,344a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e436919661:0x86447570e5f905c0!6m1!1v5!8m2!3d48.691143!4d6.128542!16s%2Fg%2F11c2p7twf2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vair Direction Sud', 
      coords: [48.695672, 6.124361] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Vair/@48.6957143,6.1241211,92m/data=!3m1!1e3!4m8!3m7!1s0x4794a2e042eda2a7:0x22aa3f27b661115c!6m1!1v5!8m2!3d48.6957161!4d6.124316!16s%2Fg%2F11h_1k_jkg?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        }
      ]
    },
    { 
      name: 'Vair Direction Nord', 
      coords: [48.696037, 6.123708] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Vair/@48.6960387,6.1237223,281a,35y,0.97t/data=!3m1!1e3!4m18!1m9!3m8!1s0x4794a2e0f195a159:0x820ca36c670cbb1a!2sVair!6m1!1v5!8m2!3d48.695711!4d6.124376!16s%2Fg%2F11c2p8hl0c!3m7!1s0x4794a2e0f4e7184b:0xd01906ed9cc34ffa!6m1!1v5!8m2!3d48.696017!4d6.12373!16s%2Fg%2F11fn263jzx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Moselotte Direction Sud', 
      coords: [48.697247, 6.125168] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Moselotte/@48.6971043,6.1249539,281a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2de272335e5:0x1f6c90c5cfe4992!6m1!1v5!8m2!3d48.697285!4d6.125163!16s%2Fg%2F11c2p7mv91?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ] 
    },
    { 
      name: 'Saône Direction Nord', 
      coords: [48.696039, 6.125463] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Sa%C3%B4ne/@48.6955444,6.1261759,301a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e0b8c8bde9:0x745573280594f239!6m1!1v5!8m2!3d48.696083!4d6.125679!16s%2Fg%2F11xt2knlr2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laxou Champ-le-Beouf', 
      coords: [48.698156, 6.123322] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Houdemont',
          url: 'https://www.google.fr/maps/place/Champ-le-B%C5%93uf/@48.6972339,6.1242613,797a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2de32d3f609:0xb7d8560e3c22b73c!6m1!1v5!8m2!3d48.6981639!4d6.1239701!16s%2Fg%2F11ddxnm31t?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ] 
    }
  ]
};

// Nouvelle ligne T2 (bleu)
const tramLineT2: TramLine = {
  id: 'T2',
  name: 'Ligne T2',
  description: 'Laneuville Centre ↔ Laxou Sapinière',
  color: '#0000FF', // Bleu
  coordinates: [
    [48.659154, 6.230062], // Laneuville Centre
    [48.659023, 6.230272], // Point intermédiaire
    [48.658538, 6.229864], // Point intermédiaire
    [48.658610, 6.229508], // Point intermédiaire
    [48.658698, 6.229190], // Point intermédiaire
    [48.659197, 6.227741], // Laneuville Piscine
    [48.659706, 6.226246], // Point intermédiaire
    [48.660621, 6.223757], // Point intermédiaire
    [48.660962, 6.223102], // Point intermédiaire
    [48.661454, 6.222312], // Sainte-Valdrée
    [48.663470, 6.219121], // Point intermédiaire
    [48.664344, 6.217911], // Point intermédiaire
    [48.664908, 6.217205], // Point intermédiaire
    [48.665202, 6.216744], // Château de Montaigu
    [48.665589, 6.216069], // Point intermédiaire
    [48.665809, 6.215614], // Point intermédiaire
    [48.665968, 6.215227], // Point intermédiaire
    [48.666427, 6.213544], // Gabriel Fauré
    [48.667314, 6.210127], // Point intermédiaire
    [48.667460, 6.209730], // Point intermédiaire
    [48.667945, 6.208733], // Point intermédiaire
    [48.668345, 6.208225], // Point intermédiaire
    [48.668739, 6.207839], // L'Atelier
    [48.669090, 6.207544], // Point intermédiaire
    [48.669493, 6.207140], // Point intermédiaire
    [48.669879, 6.206965], // Point intermédiaire
    [48.670456, 6.206361], // Point intermédiaire
    [48.670807, 6.206179], // Jarville République
    [48.671087, 6.205966], // Point intermédiaire
    [48.671456, 6.205574], // Point intermédiaire
    [48.672200, 6.204412], // Point intermédiaire
    [48.672757, 6.203092], // Point intermédiaire
    [48.672910, 6.202814], // Point intermédiaire
    [48.673289, 6.202401], // Jarville Mairie
    [48.673795, 6.201968], // Point intermédiaire
    [48.674227, 6.201738], // Point intermédiaire
    [48.674582, 6.201465], // Point intermédiaire
    [48.674981, 6.201034], // Point intermédiaire
    [48.675639, 6.200165], // Alsace-Bonsecours
    [48.676147, 6.199804], // Point intermédiaire
    [48.676407, 6.199660], // Point intermédiaire
    [48.676848, 6.199485], // Point intermédiaire
    [48.677582, 6.198788], // Point intermédiaire
    [48.677968, 6.198322], // Achille Lévy
    [48.678603, 6.197508], // Point intermédiaire
    [48.680103, 6.195395], // Point intermédiaire
    [48.680501, 6.194755], // Vic
    [48.682143, 6.192133], // Hôpital Central - Maternité
    [48.683678, 6.189662], // Point intermédiaire
    [48.684769, 6.187656], // Place des Vosges
    [48.685037, 6.187112], // Point intermédiaire
  ] as [number, number][],
  // Tracé direction Laxou Sapinière (droite)
  coordinatesLaxou: [
    [48.690030, 6.171810], // Point intermédiaire
    [48.690763, 6.171185], // Patton Direction Nord
    [48.691307, 6.170695], // Point intermédiaire
    [48.691729, 6.170207], // Point intermédiaire
    [48.692175, 6.168523], // Point intermédiaire
    [48.692550, 6.168428], // Point intermédiaire
    [48.692897, 6.168254], // Place Godefroy de Bouillon Direction Nord
    [48.693167, 6.167957], // Point de jonction
    [48.695591, 6.167420], // Campus Lettres
    [48.697403, 6.167058], // Point intermédiaire
    [48.698520, 6.166788], // Point intermédiaire
    [48.699183, 6.166190], // Point intermédiaire
    [48.699402, 6.165707], // Place Aimé Mort
    [48.699505, 6.165498], // Point intermédiaire
    [48.700696, 6.164505], // Point intermédiaire
    [48.701676, 6.164090], // Alix Le Clerc
    [48.704323, 6.162999], // Jean Lamour
    [48.705201, 6.162638], // Point intermédiaire
    [48.707037, 6.161787], // Montée de Pinchard
    [48.707161, 6.161006], // Point intermédiaire
    [48.707285, 6.160808], // Point intermédiaire
    [48.707430, 6.160759], // Point intermédiaire
    [48.708810, 6.161143], // Point intermédiaire
    [48.708983, 6.161051], // Point intermédiaire
    [48.709100, 6.160676], // Point intermédiaire
    [48.708969, 6.160311], // Point intermédiaire
    [48.706327, 6.159675], // Point intermédiaire
    [48.706037, 6.159428], // Point intermédiaire
    [48.705877, 6.158752], // Point intermédiaire
    [48.706036, 6.158098], // Point intermédiaire
    [48.706189, 6.157637], // Point intermédiaire
    [48.706051, 6.157149], // Point intermédiaire
    [48.705815, 6.156865], // Point intermédiaire
    [48.705581, 6.156914], // Point intermédiaire
    [48.705245, 6.157485], // Point intermédiaire
    [48.705064, 6.157625], // Point intermédiaire
    [48.704791, 6.157668], // Point intermédiaire
    [48.703873, 6.157520], // Point intermédiaire
    [48.703212, 6.155147], // Tilleul Argenté
    [48.702184, 6.151628], // Cèdre Bleu
    [48.701137, 6.148103], // Point intermédiaire
    [48.700964, 6.147243], // Les Ombelles
    [48.700160, 6.143717], // Cliniques
    [48.699964, 6.142850], // Point intermédiaire
    [48.699708, 6.139329], // Palais des Sports - Gentilly
    [48.699065, 6.135140], // Cascade - La Fontaine
    [48.698884, 6.133915], // Point intermédiaire
    [48.700563, 6.133311], // Poste - Champ-le-Beouf
    [48.701211, 6.133096], // Point intermédiaire
    [48.701472, 6.133186], // Point intermédiaire
    [48.702203, 6.133847], // Point intermédiaire
    [48.702352, 6.133847], // Point intermédiaire
    [48.702525, 6.133750], // Point intermédiaire
    [48.702695, 6.133509], // Point intermédiaire
    [48.703017, 6.132359], // Point intermédiaire
    [48.702992, 6.132102], // Point intermédiaire
    [48.702574, 6.130838], // Saint-Jacques II
    [48.702395, 6.130462], // Point intermédiaire
    [48.700377, 6.129944], // Saint-Exupéry
    [48.699964, 6.129830], // Point intermédiaire
    [48.699833, 6.129337], // Point intermédiaire
    [48.699103, 6.127778], // Madine
    [48.698482, 6.126476], // Point intermédiaire
    [48.698309, 6.125923], // Point intermédiaire
    [48.698219, 6.125361], // Point intermédiaire
    [48.698202, 6.125090], // Point intermédiaire
    [48.698156, 6.123322], // Laxou Champ-le-Beouf
    [48.698137, 6.122952], // Point intermédiaire
    [48.698119, 6.121751], // Point intermédiaire
    [48.698308, 6.121042], // Point intermédiaire
    [48.697630, 6.120190], // Laxou Plateau de Haye Direction Sud
    [48.697303, 6.119962], // Point intermédiaire
    [48.697084, 6.119902], // Point intermédiaire
    [48.696754, 6.119993], // Point intermédiaire
    [48.696418, 6.120347], // Point intermédiaire
    [48.696227, 6.121046], // Mouzon Direction Sud
    [48.696100, 6.123089], // Point intermédiaire
    [48.696037, 6.123708], // Vair Direction Nord
    [48.695998, 6.124373], // Point intermédiaire
    [48.695672, 6.124361], // Vair Direction Sud
    [48.694974, 6.124373], // Point intermédiaire
    [48.694657, 6.127549], // Point intermédiaire
    [48.694612, 6.128002], // Point de jonction
    [48.692532, 6.128162], // Point intermédiaire
    [48.690981, 6.128387], // Laxou Sapinière
  ] as [number, number][],
  // Tracé direction Laneuville Centre (gauche)
  coordinatesLaneuville: [
    [48.687599, 6.170741], // Point intermédiaire
    [48.688383, 6.170310], // Domrémy Direction Sud
    [48.691897, 6.168328], // Place Godefroy de Bouillon Direction Sud
    [48.692312, 6.168028], // Point intermédiaire
    [48.692637, 6.167749], // Point intermédiaire
    [48.693167, 6.167957], // Point de jonction
    [48.695591, 6.167420], // Campus Lettres
    [48.697403, 6.167058], // Point intermédiaire
    [48.698520, 6.166788], // Point intermédiaire
    [48.699183, 6.166190], // Point intermédiaire
    [48.699402, 6.165707], // Place Aimé Mort
    [48.699505, 6.165498], // Point intermédiaire
    [48.700696, 6.164505], // Point intermédiaire
    [48.701676, 6.164090], // Alix Le Clerc
    [48.704323, 6.162999], // Jean Lamour
    [48.705201, 6.162638], // Point intermédiaire
    [48.707037, 6.161787], // Montée de Pinchard
    [48.707161, 6.161006], // Point intermédiaire
    [48.707285, 6.160808], // Point intermédiaire
    [48.707430, 6.160759], // Point intermédiaire
    [48.708810, 6.161143], // Point intermédiaire
    [48.708983, 6.161051], // Point intermédiaire
    [48.709100, 6.160676], // Point intermédiaire
    [48.708969, 6.160311], // Point intermédiaire
    [48.706327, 6.159675], // Point intermédiaire
    [48.706037, 6.159428], // Point intermédiaire
    [48.705877, 6.158752], // Point intermédiaire
    [48.706036, 6.158098], // Point intermédiaire
    [48.706189, 6.157637], // Point intermédiaire
    [48.706051, 6.157149], // Point intermédiaire
    [48.705815, 6.156865], // Point intermédiaire
    [48.705581, 6.156914], // Point intermédiaire
    [48.705245, 6.157485], // Point intermédiaire
    [48.705064, 6.157625], // Point intermédiaire
    [48.704791, 6.157668], // Point intermédiaire
    [48.703873, 6.157520], // Point intermédiaire
    [48.703212, 6.155147], // Tilleul Argenté
    [48.702184, 6.151628], // Cèdre Bleu
    [48.701137, 6.148103], // Point intermédiaire
    [48.700964, 6.147243], // Les Ombelles
    [48.700160, 6.143717], // Cliniques
    [48.699964, 6.142850], // Point intermédiaire
    [48.699708, 6.139329], // Palais des Sports - Gentilly
    [48.699065, 6.135140], // Cascade - La Fontaine
    [48.698884, 6.133915], // Point intermédiaire
    [48.700563, 6.133311], // Poste - Champ-le-Beouf
    [48.701211, 6.133096], // Point intermédiaire
    [48.701472, 6.133186], // Point intermédiaire
    [48.702203, 6.133847], // Point intermédiaire
    [48.702352, 6.133847], // Point intermédiaire
    [48.702525, 6.133750], // Point intermédiaire
    [48.702695, 6.133509], // Point intermédiaire
    [48.703017, 6.132359], // Point intermédiaire
    [48.702992, 6.132102], // Point intermédiaire
    [48.702574, 6.130838], // Saint-Jacques II
    [48.702395, 6.130462], // Point intermédiaire
    [48.700377, 6.129944], // Saint-Exupéry
    [48.699964, 6.129830], // Point intermédiaire
    [48.699833, 6.129337], // Point intermédiaire
    [48.699103, 6.127778], // Madine
    [48.698482, 6.126476], // Point intermédiaire
    [48.698309, 6.125923], // Point intermédiaire
    [48.698219, 6.125361], // Point intermédiaire
    [48.698202, 6.125090], // Point intermédiaire    
  ] as [number, number][],
  stops: [
    { 
      name: 'Laneuville Centre', 
      coords: [48.659154, 6.230062] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laneuveville+Centre/@48.6586224,6.2300653,285a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479499125393c3e7:0x79596655c75c5d53!6m1!1v5!8m2!3d48.6591926!4d6.2300465!16s%2Fg%2F11c2p79ng3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laneuville Piscine', 
      coords: [48.659197, 6.227741] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Laneuveville+Piscine/@48.658713,6.2278307,417a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479499122ae4eba3:0x1846c138db0d7780!6m1!1v5!8m2!3d48.659164!4d6.227811!16s%2Fg%2F11c5_sst7f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laneuveville+Piscine/@48.6591627,6.2277202,77a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479499122a523c07:0x88b1779ca69370c5!6m1!1v5!8m2!3d48.65934!4d6.22771!16s%2Fg%2F11jzxjw36c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Sainte-Valdrée', 
      coords: [48.661454, 6.222312] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Sainte-Valdr%C3%A9e/@48.6612137,6.2219658,328a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949910041c82f9:0xce6019e985fa68a7!6m1!1v5!8m2!3d48.661476!4d6.222332!16s%2Fg%2F11c2p7whks?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Sainte-Valdr%C3%A9e/@48.6612137,6.2219658,328a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949910041c82f9:0xce6019e985fa68a7!6m1!1v5!8m2!3d48.661476!4d6.222332!16s%2Fg%2F11c2p7whks?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Château de Montaigu', 
      coords: [48.665202, 6.216744] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Ch%C3%A2teau+de+Montaigu/@48.6648747,6.2169189,370a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949904797421fb:0xdf06680f9ee706c2!6m1!1v5!8m2!3d48.665096!4d6.217005!16s%2Fg%2F11c5_j0gnr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Ch%C3%A2teau+de+Montaigu/@48.6648747,6.2169189,370a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794990388aad2d7:0xfbc6b2c1fc801c79!6m1!1v5!8m2!3d48.66534!4d6.216466!16s%2Fg%2F11ddxp4fs4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gabriel Fauré', 
      coords: [48.666427, 6.213544] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Gabriel+Faur%C3%A9/@48.6658004,6.2142663,618a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794990236a11b5d:0x958a7e65d47a8c86!6m1!1v5!8m2!3d48.6663998!4d6.2134108!16s%2Fg%2F11c2p3x9p4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Jarville+Gabriel+Faur%C3%A9/@48.6662383,6.2136283,213a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794990233fae547:0x9adcde5c05598c9c!6m1!1v5!8m2!3d48.666431!4d6.213627!16s%2Fg%2F11c2p9dw5h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'L\'Atelier', 
      coords: [48.668739, 6.207839] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/L\'Atelier/@48.6683498,6.2080899,212a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498fe8cfbde85:0x7def051c3a836107!6m1!1v5!8m2!3d48.668743!4d6.207866!16s%2Fg%2F11c2p9dw5f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/L\'Atelier/@48.6683498,6.2080899,212a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498fe8e83ed55:0xca5d3adc4ec0eb69!6m1!1v5!8m2!3d48.668873!4d6.207696!16s%2Fg%2F11ddxmq4bw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jarville République', 
      coords: [48.670807, 6.206179] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Jarville+R%C3%A9publique/@48.6706659,6.2064306,218a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498ff2c30165f:0x2df2c360342f243e!6m1!1v5!8m2!3d48.670704!4d6.206282!16s%2Fg%2F11c5_gvd_y?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Jarville+R%C3%A9publique/@48.6706659,6.2064306,218a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498ff3273c19f:0x7a1aac004ccef94!6m1!1v5!8m2!3d48.670872!4d6.206144!16s%2Fg%2F11c2p7twf1?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jarville Mairie', 
      coords: [48.673289, 6.202401] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Jarville+Mairie/@48.6731645,6.2025117,124a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949857d98ea893:0xa582a361fcc2e43!6m1!1v5!8m2!3d48.673294!4d6.202479!16s%2Fg%2F11c5_s0jh4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Jarville+Mairie/@48.6731645,6.2025117,124a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949857d98ea893:0xa582a361fcc2e43!6m1!1v5!8m2!3d48.673294!4d6.202479!16s%2Fg%2F11c5_s0jh4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Alsace-Bonsecours', 
      coords: [48.675639, 6.200165] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Alsace-Bonsecours/@48.6748303,6.2008986,255a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498582a219c19:0xce5a5da1cc2f2779!6m1!1v5!8m2!3d48.675266!4d6.200723!16s%2Fg%2F11c2p8kdng?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Alsace-Bonsecours/@48.6760157,6.1999864,187a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949859c858f86d:0x7674b1aa00c39e3a!6m1!1v5!8m2!3d48.6761952!4d6.1996858!16s%2Fg%2F11ddxn4t4r?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Achille Lévy', 
      coords: [48.677968, 6.198322] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Achille+L%C3%A9vy/@48.6782174,6.197428,186a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498597db64c55:0xe70b12d7baa09305!6m1!1v5!8m2!3d48.6782174!4d6.1978278!16s%2Fg%2F11ddxn7vgm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Achille+L%C3%A9vy/@48.6777876,6.1981825,186a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794985983c520b9:0x76f19758762b66d2!6m1!1v5!8m2!3d48.67767!4d6.198822!16s%2Fg%2F11c2p70wyf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vic', 
      coords: [48.680501, 6.194755] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Vic/@48.6803366,6.1945504,185a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794985c66b0f249:0x785ff4b968e70aa3!6m1!1v5!8m2!3d48.6805616!4d6.1948898!16s%2Fg%2F11ddxfv33h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Vic/@48.6803366,6.1945504,185a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794985c66b0f249:0x785ff4b968e70aa3!6m1!1v5!8m2!3d48.6805616!4d6.1948898!16s%2Fg%2F11ddxfv33h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Hôpital Central - Maternité', 
      coords: [48.682143, 6.192133] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/H%C3%B4pital+Central+-+Maternit%C3%A9/@48.681822,6.1923236,187a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794985d10faace1:0x9b1e80f2e91d994!6m1!1v5!8m2!3d48.681988!4d6.192293!16s%2Fg%2F11ddxplpk5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/H%C3%B4pital+Central+-+Maternit%C3%A9/@48.681822,6.1923236,187a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794985d15edb9ab:0x16db3bba14ede921!6m1!1v5!8m2!3d48.682289!4d6.192085!16s%2Fg%2F11g8b5qgrr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place des Vosges', 
      coords: [48.684769, 6.187656] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+des+Vosges/@48.6846406,6.1876632,182a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986889b6900b:0x41efb960e8788e9!6m1!1v5!8m2!3d48.6848679!4d6.1876299!16s%2Fg%2F11c2pbvtr1?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Place+des+Vosges/@48.6846406,6.1876632,182a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986889c5dfc3:0xe78efd73565e7523!6m1!1v5!8m2!3d48.684692!4d6.187683!16s%2Fg%2F11xd8rcbdx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Nord', 
      coords: [48.687646, 6.184797] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6869822,6.1853205,503a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986ec96758e7:0xfa2c06d1f65cceb6!6m1!1v5!8m2!3d48.6876289!4d6.1848987!16s%2Fg%2F11ddxjzmlr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Sud', 
      coords: [48.686100, 6.184457] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6855837,6.1848998,345a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986f2f073daf:0x2ab9dc3c891c1237!6m1!1v5!8m2!3d48.686092!4d6.184456!16s%2Fg%2F11c2p8c3vt?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Nord', 
      coords: [48.689725, 6.183256] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.6891446,6.1837986,499a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986c2fa416d3:0x6ce0accf3d312599!6m1!1v5!8m2!3d48.6897402!4d6.1833435!16s%2Fg%2F11c2p3qxvd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Charles III - Point Central Direction Sud', 
      coords: [48.689066, 6.182293] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.6890228,6.1823719,308a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986e7eb595e9:0xda0c16e2a93099a7!6m1!1v5!8m2!3d48.688946!4d6.182275!16s%2Fg%2F11fn25wfc0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Nord', 
      coords: [48.692003, 6.181538] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6913867,6.1823128,500a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986d748e8975:0xbf7155ff4d7abc40!6m1!1v5!8m2!3d48.6920566!4d6.1816469!16s%2Fg%2F11c5_sr0nc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Sud', 
      coords: [48.690898, 6.180990] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6908804,6.1807299,306a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794986d91c5c17f:0xc037e67b6cef6764!6m1!1v5!8m2!3d48.690914!4d6.180878!16s%2Fg%2F11ddxp_qxw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Bibliothèque Direction Nord', 
      coords: [48.692137, 6.178665] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Biblioth%C3%A8que/@48.6915922,6.1798098,492a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949872f4a1e39d:0xbdc547c881c0289f!6m1!1v5!8m2!3d48.692165!4d6.178653!16s%2Fg%2F11c5_s3w3h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Tour Thiers Gare Direction Nord', 
      coords: [48.690849, 6.174509] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Simone+Veil/@48.6908585,6.1749661,326m/data=!3m1!1e3!4m8!3m7!1s0x479498738d12f2fd:0x315ce76bd5931941!6m1!1v5!8m2!3d48.6908987!4d6.1744956!16s%2Fg%2F11c5_lc19l?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        }
      ]
    },
    { 
      name: 'Patton Direction Nord', 
      coords: [48.690763, 6.171185] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Patton/@48.6903451,6.1716649,483a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794987433e597ab:0x4904a84610b0eb3!6m1!1v5!8m2!3d48.69067!4d6.171256!16s%2Fg%2F11fn25scrc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Godefroy de Bouillon Direction Nord', 
      coords: [48.692897, 6.168254] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Godefroy+de+Bouillon/@48.6919127,6.1687023,481a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x479498757d862f09:0x454793c728bf3ae6!6m1!1v5!8m2!3d48.6929092!4d6.1683442!16s%2Fg%2F11c2p7p93q?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare Thiers Poirel Direction Sud', 
      coords: [48.6904283, 6.1757069] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Gare+Thiers+Poirel/@48.6903865,6.1756843,49a,55.3y,4.75t/data=!3m1!1e3!4m8!3m7!1s0x47949873c41361d1:0xc06ebe819d4291ac!6m1!1v5!8m2!3d48.6904283!4d6.1757069!16s%2Fg%2F11hdsgcfs6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint Léon Direction Sud', 
      coords: [48.6882784, 6.1730729] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Saint+L%C3%A9on/@48.6883243,6.1725635,234a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949876ca29f0e3:0xbf9db145abce3e1c!6m1!1v5!8m2!3d48.6882784!4d6.1730729!16s%2Fg%2F11c5_sg2br?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Domrémy Direction Sud', 
      coords: [48.688383, 6.170310] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Domr%C3%A9my/@48.6881711,6.1702565,163m/data=!3m1!1e3!4m8!3m7!1s0x4794987659316d3f:0x5c4f16462835bf8f!6m1!1v5!8m2!3d48.6882764!4d6.170347!16s%2Fg%2F11h_1lhwm2?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        }
      ]
    },
    { 
      name: 'Place Godefroy de Bouillon Direction Sud', 
      coords: [48.691897, 6.168328] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Place+Godefroy+de+Bouillon/@48.6918335,6.1682846,233a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x47949875879518c7:0xf4b7e075cd083929!6m1!1v5!8m2!3d48.691902!4d6.168407!16s%2Fg%2F11c5_r4zc0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Campus Lettres', 
      coords: [48.695591, 6.167420] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Campus+Lettres/@48.6954459,6.1675617,233a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a01f369c51:0x2230336530091347!6m1!1v5!8m2!3d48.695309!4d6.167507!16s%2Fg%2F11ycrnym1j?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Campus+Lettres/@48.6954459,6.1675617,233a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a022dd4d2b:0x340dbb4cd3bba91a!6m1!1v5!8m2!3d48.6955799!4d6.16729!16s%2Fg%2F11c5_ry7lf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place Aimé Mort', 
      coords: [48.699402, 6.165707] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Place+Aim%C3%A9+Morot/@48.6994889,6.1651534,233a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a1373fad01:0xa6364eeb4ab12b67!6m1!1v5!8m2!3d48.6995403!4d6.1657152!16s%2Fg%2F11ddxntzmm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Place+Aim%C3%A9+Morot/@48.6994889,6.1651534,233a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a13beac84f:0x5a73645c7cc58173!6m1!1v5!8m2!3d48.699257!4d6.165813!16s%2Fg%2F11c5_s3w3x?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Alix Le Clerc', 
      coords: [48.701676, 6.164090] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Alix+Le+Clerc/@48.7021825,6.1638884,214a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a4261b1075:0xf2d2f73615be519e!6m1!1v5!8m2!3d48.7020367!4d6.1640872!16s%2Fg%2F11c5_rjf0k?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Alix+Le+Clerc/@48.7014871,6.1639001,347a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a41fbeefa9:0x729911d37de16331!6m1!1v5!8m2!3d48.7013588!4d6.164115!16s%2Fg%2F11c5_t06y3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jean Lamour', 
      coords: [48.704323, 6.162999] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Jean+Lamour/@48.7035914,6.1632455,94a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a5b8a31c6b:0x8a06b4df639ebd69!6m1!1v5!8m2!3d48.7036702!4d6.163149!16s%2Fg%2F11c5_jbjr6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Nancy+Coll%C3%A8ge+Jean+Lamour/@48.7044821,6.1629959,349a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2a58f282cfd:0x7f179eaa463a2939!6m1!1v5!8m2!3d48.7049518!4d6.1628674!16s%2Fg%2F11ddxmwrn6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Montée de Pinchard', 
      coords: [48.707037, 6.161787] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Mont%C3%A9e+de+Pinchard/@48.7072001,6.1614681,347a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2afbb6d0deb:0x3039df6a8af26579!6m1!1v5!8m2!3d48.707054!4d6.161506!16s%2Fg%2F11fn25t46y?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Mont%C3%A9e+de+Pinchard/@48.7072001,6.1614681,347a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2afaca691cf:0x1c9e986ecfd6705a!6m1!1v5!8m2!3d48.707844!4d6.162176!16s%2Fg%2F11c5_sxfw3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Tilleul Argenté', 
      coords: [48.703212, 6.155147] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Tilleul+Argent%C3%A9/@48.7030135,6.1546773,318a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2bbab32e4a9:0x1925eb65f6059dd9!6m1!1v5!8m2!3d48.703217!4d6.155268!16s%2Fg%2F11h_1l38p6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Tilleul+Argent%C3%A9/@48.7030632,6.1548129,217a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2bbacbe2393:0xe310d3fc0acebce4!6m1!1v5!8m2!3d48.703159!4d6.155046!16s%2Fg%2F11h_1lbvz5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Cèdre Bleu', 
      coords: [48.702184, 6.151628] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/C%C3%A8dre+Bleu/@48.7022076,6.1516899,215a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2b961d4b179:0x507ddf55bf8d7be4!6m1!1v5!8m2!3d48.7022904!4d6.1521571!16s%2Fg%2F11c5_gvf02?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/C%C3%A8dre+Bleu/@48.7020682,6.1512245,215a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2b941069773:0x54c8263606b986!6m1!1v5!8m2!3d48.7020112!4d6.15085!16s%2Fg%2F11c5_sp57b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Les Ombelles', 
      coords: [48.700964, 6.147243] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Les+Ombelles/@48.7009319,6.1469,218a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2bf4a8e15db:0xf2aa63375a12c48e!6m1!1v5!8m2!3d48.701004!4d6.147411!16s%2Fg%2F11xfzkrgfv?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Les+Ombelles/@48.7009319,6.1469,218a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2bf4a6dcfe7:0xdad618a1468cac31!6m1!1v5!8m2!3d48.7009336!4d6.1473249!16s%2Fg%2F11ddxpnhpy?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Cliniques', 
      coords: [48.700160, 6.143717] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Cliniques/@48.7001633,6.1435536,204a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c0c0f8e229:0xd19821255c3da064!6m1!1v5!8m2!3d48.7001711!4d6.1440669!16s%2Fg%2F11ddxn08lj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Cliniques/@48.7001633,6.1435536,204a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c0dd948419:0xf23286f07920c9ad!6m1!1v5!8m2!3d48.7001584!4d6.1433908!16s%2Fg%2F11c5_k0wbf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Palais des Sports - Gentilly', 
      coords: [48.699708, 6.139329] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Palais+des+Sports+-+Gentilly/@48.6994554,6.1387073,196a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c3c8ed859b:0xfab8c161cebdfcbd!6m1!1v5!8m2!3d48.6996331!4d6.1384335!16s%2Fg%2F11g65gjstg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Palais+des+Sports+-+Gentilly/@48.6995298,6.1398778,195a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c164e2c451:0x614d7fcb09a3eff4!6m1!1v5!8m2!3d48.6997499!4d6.1405712!16s%2Fg%2F11c20sk6n0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Cascade - La Fontaine', 
      coords: [48.699065, 6.135140] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Cascade+-+La+Fontaine/@48.6988742,6.1347414,194a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c2e0bdd8bb:0x779f1dd5dca81ee5!6m1!1v5!8m2!3d48.6989882!4d6.1350567!16s%2Fg%2F11c2p8x_19?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Cascade+-+La+Fontaine/@48.6989358,6.1349914,106a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2c2d944dd37:0xa9f13af909ed3aea!6m1!1v5!8m2!3d48.6991368!4d6.1352739!16s%2Fg%2F11c2pcrdwf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Poste - Champ-le-Beouf', 
      coords: [48.700563, 6.133311] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Poste+-+Champ-le-Boeuf/@48.7001795,6.1332877,104a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2dccea78567:0x3cdd3e6008a102d!6m1!1v5!8m2!3d48.7002231!4d6.1333303!16s%2Fg%2F11c5__hlh1?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/La+Poste+-+Champ-le-Boeuf/@48.7007971,6.1331255,103a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2dcb0ce7761:0xf5780ee1f04eb63f!6m1!1v5!8m2!3d48.700909!4d6.13317!16s%2Fg%2F11c5_s5jtq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Jacques II', 
      coords: [48.702574, 6.130838] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Saint-Jacques+II/@48.7024293,6.1306973,147a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2db9b4b2013:0x4342bb17c2b81e13!6m1!1v5!8m2!3d48.7026501!4d6.1307102!16s%2Fg%2F11c5_yj7v6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Saint-Jacques+II/@48.7024477,6.130708,131a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2db82fd4045:0x3238bf63bd9707f1!6m1!1v5!8m2!3d48.702553!4d6.131019!16s%2Fg%2F11ddxkcr16?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Exupéry', 
      coords: [48.700377, 6.129944] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Saint-Exup%C3%A9ry/@48.7002204,6.1294498,163m/data=!3m1!1e3!4m18!1m9!3m8!1s0x4794a2dc572b2b1b:0x812347cb23d2266e!2sSaint-Exup%C3%A9ry!6m1!1v5!8m2!3d48.699978!4d6.130438!16s%2Fg%2F11fd4rn294!3m7!1s0x4794a2dc687dec65:0xf0f715289db481e0!6m1!1v5!8m2!3d48.7006389!4d6.1300031!16s%2Fg%2F11zj926fvg?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Saint-Exup%C3%A9ry/@48.7005939,6.1296858,163m/data=!3m1!1e3!4m18!1m9!3m8!1s0x4794a2dc572b2b1b:0x812347cb23d2266e!2sSaint-Exup%C3%A9ry!6m1!1v5!8m2!3d48.699978!4d6.130438!16s%2Fg%2F11fd4rn294!3m7!1s0x4794a2dc67d37ae1:0x67f5bbbb6a791c04!6m1!1v5!8m2!3d48.700939!4d6.130112!16s%2Fg%2F11xzrmrq9q?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        }
      ]
    },
    { 
      name: 'Madine', 
      coords: [48.699103, 6.127778] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Madine/@48.6991651,6.1278152,64a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2ddd8866b3d:0x8e22ed5b5deb0ef6!6m1!1v5!8m2!3d48.6991397!4d6.1280294!16s%2Fg%2F11c5_s77x6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Madine/@48.6991651,6.1278152,64a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2de73c4a479:0xe2ff56a87093f2d5!6m1!1v5!8m2!3d48.699248!4d6.1279533!16s%2Fg%2F11c5_t41jl?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laxou Champ-le-Beouf', 
      coords: [48.698156, 6.123322] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Champ-le-B%C5%93uf/@48.6980282,6.1234592,101a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2de32d3f609:0xb7d8560e3c22b73c!6m1!1v5!8m2!3d48.6981639!4d6.1239701!16s%2Fg%2F11ddxnm31t?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laxou+Champ-le-boeuf/@48.6980144,6.1221308,104a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2dff05dffcf:0xce2b8d0b37775680!6m1!1v5!8m2!3d48.698164!4d6.122347!16s%2Fg%2F11c2p9jn2k?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laxou Plateau de Haye Direction Sud', 
      coords: [48.697630, 6.120190] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laxou+Plateau+de+Haye/@48.6976367,6.1203211,122a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a3201da7ed55:0xd6df4f18d6189590!6m1!1v5!8m2!3d48.6977036!4d6.1201687!16s%2Fg%2F11c5_gb8kq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mouzon Direction Sud', 
      coords: [48.696227, 6.121046] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Mouzon/@48.6957751,6.1226646,429a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e042f2cf85:0xfba1f750d25d4baa!6m1!1v5!8m2!3d48.696096!4d6.122799!16s%2Fg%2F11c2p7s8jr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Vair Direction Sud', 
      coords: [48.695672, 6.124361] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Vair/@48.6957143,6.1241211,92m/data=!3m1!1e3!4m8!3m7!1s0x4794a2e042eda2a7:0x22aa3f27b661115c!6m1!1v5!8m2!3d48.6957161!4d6.124316!16s%2Fg%2F11h_1k_jkg?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D'
        }
      ]
    },
    { 
      name: 'Vair Direction Nord', 
      coords: [48.696037, 6.123708] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Vair/@48.6962682,6.1233909,324a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e0f4e7184b:0xd01906ed9cc34ffa!6m1!1v5!8m2!3d48.696017!4d6.12373!16s%2Fg%2F11fn263jzx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saône Direction Nord', 
      coords: [48.696039, 6.125463] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Sa%C3%B4ne/@48.695871,6.1251326,185a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e0b8c8bde9:0x745573280594f239!6m1!1v5!8m2!3d48.696083!4d6.125679!16s%2Fg%2F11xt2knlr2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Laxou Sapinière', 
      coords: [48.690981, 6.128387] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Laxou+Sapini%C3%A8re/@48.6911286,6.128164,168a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e436919661:0x86447570e5f905c0!6m1!1v5!8m2!3d48.691143!4d6.128542!16s%2Fg%2F11c2p7twf2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    }
  ]
};

// Ligne T3 (verte) - Seichamps Haie Cerlin ↔ Villers Campus Sciences
const tramLineT3: TramLine = {
  id: 'T3',
  name: 'Ligne T3',
  description: 'Seichamps Haie Cerlin ↔ Villers Campus Sciences',
  color: '#008000', // Vert foncé
  coordinates: [
    [48.719416, 6.265903], // Seichamps Haie Cerlin
    [48.719586, 6.265737], // Point intermédiaire
    [48.719615, 6.265367], // Point intermédiaire
    [48.718871, 6.263494], // Point intermédiaire
    [48.718754, 6.263596], // Point intermédiaire
    [48.717942, 6.264040], // Point intermédiaire
    [48.717472, 6.264410], // Point intermédiaire
    [48.717166, 6.264840], // Point intermédiaire
    [48.716947, 6.265448], // Seichamps - Église
    [48.716830, 6.265819], // Point intermédiaire
    [48.716404, 6.266424], // Point intermédiaire
    [48.715781, 6.267399], // Point intermédiaire
    [48.715756, 6.267565], // Point intermédiaire
    [48.715805, 6.267981], // Point intermédiaire
    [48.715763, 6.268255], // Point intermédiaire
    [48.715540, 6.268661], // Point intermédiaire
    [48.715396, 6.268974], // Point intermédiaire
    [48.715281, 6.269117], // Point intermédiaire
    [48.714836, 6.269211], // Donon
    [48.714511, 6.269294], // Point intermédiaire
    [48.714182, 6.269493], // Point intermédiaire
    [48.713934, 6.269643], // Point intermédiaire
    [48.713701, 6.269329], // Point intermédiaire
    [48.712368, 6.267253], // Jardin Roussel
    [48.711935, 6.266626], // Point intermédiaire
    [48.711267, 6.265750], // Point intermédiaire
    [48.710511, 6.264864], // Point intermédiaire
    [48.710235, 6.264611], // Point intermédiaire
    [48.709976, 6.264467], // Point intermédiaire
    [48.709476, 6.264276], // Semoir
    [48.708870, 6.263981], // Point intermédiaire
    [48.708057, 6.263435], // Point intermédiaire
    [48.707692, 6.263034], // Point intermédiaire
    [48.706916, 6.261596], // Point intermédiaire
    [48.706633, 6.261322], // Point intermédiaire
    [48.706371, 6.261147], // Collège Goncourt
    [48.705645, 6.260750], // Point intermédiaire
    [48.705637, 6.260304], // Point intermédiaire
    [48.705545, 6.259478], // Point intermédiaire
    [48.705356, 6.258569], // Blés d'Or
    [48.704504, 6.254986], // Point intermédiaire
    [48.704427, 6.254507], // Charles de Gaulle
    [48.704344, 6.253505], // Point intermédiaire
    [48.704386, 6.252734], // Point intermédiaire
    [48.704502, 6.252008], // Point intermédiaire
    [48.704783, 6.250740], // Point intermédiaire
    [48.704803, 6.250150], // Point intermédiaire
    [48.704671, 6.248867], // Renaissance
    [48.704389, 6.246287], // Point intermédiaire
    [48.704534, 6.245943], // Point intermédiaire
    [48.706252, 6.245210], // Porte Verte
    [48.707493, 6.244672], // Point intermédiaire
    [48.707780, 6.244463], // Point intermédiaire
    [48.708114, 6.244005], // Point intermédiaire
    [48.708965, 6.243950], // Point intermédiaire
    [48.709559, 6.243831], // Tronc qui fume
    [48.710062, 6.243736], // Point intermédiaire
    [48.710807, 6.243393], // Point intermédiaire
    [48.710182, 6.241903], // Point intermédiaire
    [48.710163, 6.241872], // Point intermédiaire
    [48.709559, 6.240423], // Point intermédiaire
    [48.709002, 6.239019], // Edith Piaf
    [48.707232, 6.234604], // Colonies
    [48.706714, 6.233291], // Point intermédiaire
    [48.706494, 6.232841], // Point intermédiaire
    [48.705964, 6.231457], // 69ème RI
    [48.705268, 6.229768], // Point intermédiaire
    [48.703894, 6.231039], // Point intermédiaire
    [48.703692, 6.230423], // Point intermédiaire
    [48.703596, 6.230085], // Quartier Kléber
    [48.702905, 6.227629], // Point intermédiaire
    [48.702711, 6.227082], // Point intermédiaire
    [48.702390, 6.226485], // Point intermédiaire
    [48.701979, 6.225975], // Point intermédiaire
    [48.701688, 6.225716], // Mouzimpré
    [48.701268, 6.225324], // Point intermédiaire
    [48.700676, 6.224576], // Point intermédiaire
    [48.700051, 6.223887], // Point intermédiaire
    [48.698631, 6.222268], // Point intermédiaire
    [48.696858, 6.220316], // Point intermédiaire
    [48.696162, 6.219293], // Point intermédiaire
    [48.695543, 6.218075], // Point intermédiaire
    [48.695208, 6.217209], // Point intermédiaire
    [48.694413, 6.214968], // Fraternité
    [48.693292, 6.211806], // Point intermédiaire
    [48.690837, 6.210784], // Voltaire
    [48.690064, 6.210484], // Point intermédiaire
    [48.688339, 6.209763], // Point intermédiaire
    [48.688375, 6.209328], // Point intermédiaire
    [48.688338, 6.208803], // Point intermédiaire
    [48.688196, 6.208162], // La Meurthe
    [48.687398, 6.204354], // Austrasie
    [48.686571, 6.200243], // Victor
    [48.686414, 6.199481], // Point intermédiaire
    [48.685876, 6.196886], // Loritz Direction Nord
    [48.685604, 6.195592], // Point intermédiaire
    [48.685617, 6.194447], // Point intermédiaire
    [48.685941, 6.193058], // Point intermédiaire
    [48.686163, 6.191963], // Point intermédiaire
    [48.685944, 6.191178], // Saint-Julien
    [48.685821, 6.190873], // Point intermédiaire
    [48.684963, 6.189839], // Point intermédiaire
    [48.684836, 6.189635], // Point intermédiaire
    [48.684584, 6.188964], // Point intermédiaire
    [48.684283, 6.188551], // Point intermédiaire
    [48.684769, 6.187656], // Place des Vosges (partagé)
    [48.685037, 6.187112], // Point intermédiaire
    [48.684524, 6.186486], // Pichon Direction Nord
    [48.684081, 6.185994], // Point intermédiaire
    [48.683524, 6.185382], // Pichon Direction Sud
    [48.683003, 6.184788], // Point intermédiaire
    [48.683298, 6.184280], // Varsovie
    [48.684359, 6.182455], // Point intermédiaire
    [48.684497, 6.182294], // Point intermédiaire
    [48.685810, 6.181332], // Place des justes
    [48.686555, 6.180789], // Point intermédiaire
    [48.686623, 6.180676], // Point intermédiaire
    [48.688255, 6.179488], // Saint-Sébastien
    [48.688572, 6.179270], // Point intermédiaire
    [48.688649, 6.179130], // Point intermédiaire
    [48.688586, 6.179018], // Point intermédiaire
    [48.688247, 6.177907], // Point intermédiaire
    [48.688163, 6.177780], // Point intermédiaire
    [48.688499, 6.177309], // Gare Joffre
    [48.688853, 6.176869], // Point intermédiaire
    [48.689016, 6.176756], // Point intermédiaire
    [48.689285, 6.176450], // Point intermédiaire
    [48.689414, 6.176331], // Point de bifurcation
    // Bifurcation vers Villers (première trace)
    [48.690365, 6.175653], // Gare Thiers Poirel Direction Sud
    [48.690622, 6.175509], // Point intermédiaire
    [48.691047, 6.175161], // Point intermédiaire
    [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
    [48.690030, 6.171810], // Point intermédiaire
    [48.689870, 6.171286], // Gare - Raymond Poincaré Direction Nord
    [48.689266, 6.169294], // Bégonias Direction Nord
    [48.688424, 6.166499], // Préville Direction Nord
    [48.688337, 6.166199], // Point intermédiaire
    [48.688090, 6.165418], // Préville Direction Nord T2
    [48.686661, 6.160751], // Gridel Direction Nord
    [48.685739, 6.157734], // Méderville Direction Nord
    [48.685078, 6.155555], // Domaine Sainte-Anne Direction Nord
    [48.684684, 6.154282], // Point de regroupement
    // Fusion vers Seichamps (deuxième trace)
    [48.684766, 6.155145], // Point intermédiaire
    [48.684783, 6.155963], // Point intermédiaire
    [48.684757, 6.156183], // Domaine Sainte-Anne Direction Sud
    [48.684487, 6.157660], // Point intermédiaire
    [48.684497, 6.157923], // Point intermédiaire
    [48.684632, 6.158454], // Point intermédiaire
    [48.684869, 6.159138], // Point intermédiaire
    [48.685321, 6.160280], // Méderville Direction Sud
    [48.686092, 6.162130], // Point intermédiaire
    [48.686258, 6.162846], // Sacré Coeur Direction Sud
    [48.686443, 6.163734], // Point intermédiaire
    [48.686512, 6.164796], // Point intermédiaire
    [48.686012, 6.166898], // Point intermédiaire
    [48.686013, 6.167089], // Point intermédiaire
    [48.686058, 6.167258], // Point intermédiaire
    [48.686566, 6.167868], // Commanderie Direction Sud
    [48.686733, 6.168055], // Point intermédiaire
    [48.687599, 6.170741], // Point intermédiaire
    [48.688326, 6.173023], // Saint-Léon Direction Sud
    [48.689414, 6.176331], // Point de bifurcation
  ] as [number, number][],
  // Tracé direction Villers bifurcation Loritz (droite)
  coordinatesVillers: [
    [48.686414, 6.199481], // Point intermédiaire
    [48.686471, 6.199428], // Point intermédiaire
    [48.687420, 6.198974], // Point intermédiaire
    [48.687731, 6.198564], // Point intermédiaire
    [48.687678, 6.198269], // Point intermédiaire
    [48.687176, 6.195959], // Point intermédiaire
    [48.687066, 6.195519], // Loritz Direction Sud
    [48.686934, 6.194930], // Point intermédiaire
    [48.685941, 6.193058], // Point intermédiaire
  ] as [number, number][],
  // Tracé direction Seichamps Haie Cerlin (droite)
  coordinatesSeichamps: [
    [48.663495, 6.155502], // Villers Campus Sciences
    [48.663968, 6.155556], // Point intermédiaire
    [48.664422, 6.155645], // Point intermédiaire
    [48.665093, 6.155904], // Grande Corvée
    [48.665507, 6.156151], // Point intermédiaire
    [48.665937, 6.156501], // Point intermédiaire
    [48.666414, 6.156980], // Point intermédiaire
    [48.666750, 6.157444], // Point intermédiaire
    [48.667024, 6.157880], // Point intermédiaire
    [48.667211, 6.158228], // UFR Staps
    [48.667346, 6.158587], // Point intermédiaire
    [48.667591, 6.159450], // Point intermédiaire
    [48.667719, 6.159792], // Point intermédiaire
    [48.667904, 6.160060], // Point intermédiaire
    [48.668185, 6.160359], // Joseph Laurent
    [48.668843, 6.161083], // Point intermédiaire
    [48.670268, 6.158228], // Point intermédiaire
    [48.670675, 6.157520], // Paul Muller
    [48.672442, 6.154544], // Villers Mairie
    [48.675042, 6.150276], // Rodin
    [48.676870, 6.147238], // Point intermédiaire
    [48.677286, 6.146496], // Point intermédiaire
    [48.678044, 6.144837], // Maréville
    [48.678655, 6.143541], // Point intermédiaire
    [48.678967, 6.142996], // Point intermédiaire
    [48.679304, 6.142533], // Point intermédiaire
    [48.679758, 6.143380], // Point intermédiaire
    [48.679495, 6.143535], // Point intermédiaire
    [48.679435, 6.143659], // Point intermédiaire
    [48.679400, 6.144271], // Point intermédiaire
    [48.679397, 6.144741], // Point intermédiaire
    [48.679403, 6.145145], // Point intermédiaire
    [48.679446, 6.145540], // Point intermédiaire
    [48.679726, 6.148092], // Provinces
    [48.680113, 6.151511], // Europe
    [48.680339, 6.153583], // Point intermédiaire
    [48.681173, 6.152761], // Hardeval
    [48.681911, 6.152040], // Point intermédiaire
    [48.682402, 6.151671], // Point intermédiaire
    [48.682871, 6.151383], // Point intermédiaire
    [48.683950, 6.150875], // Victoire
    [48.683996, 6.150998], // Point intermédiaire
    [48.684510, 6.153109], // Point intermédiaire
    [48.684684, 6.154282], // Point de regroupement
    
    
  ] as [number, number][],
  stops: [
    { 
      name: 'Seichamps Haie Cerlin', 
      coords: [48.719416, 6.265903] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Seichamps+Haie+Cerlin/@48.7193628,6.2657057,230a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x479497520f5ac031:0x28d826258960b8ca!6m1!1v5!8m2!3d48.7194215!4d6.2660532!16s%2Fg%2F11ddxns756?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Seichamps - Église', 
      coords: [48.716947, 6.265448] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Seichamps+-+Eglise/@48.7169896,6.265208,191a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x47949753cbfafb75:0x4d773dbc0396df4c!6m1!1v5!8m2!3d48.717027!4d6.265309!16s%2Fg%2F11ycrnbjk7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Seichamps+-+Eglise/@48.7169896,6.265208,191a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x47949753cf37b65d:0xa83f2793c0f0646e!6m1!1v5!8m2!3d48.716923!4d6.265538!16s%2Fg%2F11c5_r4zbr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Donon', 
      coords: [48.714836, 6.269211] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Donon/@48.7146561,6.2689283,182a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x4794975358212883:0x3a5232ce39cb1105!6m1!1v5!8m2!3d48.714794!4d6.269253!16s%2Fg%2F11c5_gb8k6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Donon/@48.7147861,6.2689289,182a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479497535853ebdf:0x170315c5900315b2!6m1!1v5!8m2!3d48.714901!4d6.269193!16s%2Fg%2F11c5_sd8bf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Jardin Roussel', 
      coords: [48.712368, 6.267253] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Jardin+Roussel/@48.7124251,6.2669839,362a,35y,0.88t/data=!3m1!1e3!4m8!3m7!1s0x4794975506f2813b:0x87473a5fb212c0e1!6m1!1v5!8m2!3d48.711918!4d6.266603!16s%2Fg%2F11c2p8yqy_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Jardin+Roussel/@48.7124251,6.2669839,362a,35y,0.88t/data=!3m1!1e3!4m8!3m7!1s0x47949754e638fec9:0xec8c4ba2717f1ab3!6m1!1v5!8m2!3d48.712868!4d6.267829!16s%2Fg%2F11ddxmrhp7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Semoir', 
      coords: [48.709476, 6.264276] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Semoir/@48.7098816,6.2643214,365a,35y,0.88t/data=!3m1!1e3!4m8!3m7!1s0x479499fe1f6c864b:0x32b706fda0f48c04!6m1!1v5!8m2!3d48.709763!4d6.264385!16s%2Fg%2F11c2p9dw5c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Semoir/@48.7093901,6.2643374,167a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499fe17e8cf25:0x767fea68bfb6ae8c!6m1!1v5!8m2!3d48.709251!4d6.264195!16s%2Fg%2F11c2p9sc87?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Collège Goncourt', 
      coords: [48.706371, 6.261147] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Coll%C3%A8ge+Goncourt/@48.7065032,6.2611927,172a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499fc24ac39cf:0x68978aa3ee94aa51!6m1!1v5!8m2!3d48.706642!4d6.261406!16s%2Fg%2F11c2p9bxp9?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Coll%C3%A8ge+Goncourt/@48.7065032,6.2611927,172a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499fc237331ef:0xce85871369737257!6m1!1v5!8m2!3d48.706193!4d6.260966!16s%2Fg%2F11h_1l5qxh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Blés d\'Or', 
      coords: [48.705356, 6.258569] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Bl%C3%A9s+d\'Or/@48.7053974,6.25888,174a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499fc80a84303:0x37245fca94be6586!6m1!1v5!8m2!3d48.705448!4d6.258974!16s%2Fg%2F11c2p6y_t7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Bl%C3%A9s+d\'Or/@48.7050948,6.2583557,175a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499fc827e7ddf:0x3c30b0d92b0edeb!6m1!1v5!8m2!3d48.705254!4d6.25834!16s%2Fg%2F11ddxmrhpk?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Charles de Gaulle', 
      coords: [48.704427, 6.254507] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Charles+de+Gaulle/@48.7043024,6.2545034,181a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499e4bbf8c495:0x8fe8c6009b0555b8!6m1!1v5!8m2!3d48.704487!4d6.254586!16s%2Fg%2F11c2p91gg6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Charles+de+Gaulle/@48.7043024,6.2545034,181a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499e4bed021c7:0x53413479d52f292b!6m1!1v5!8m2!3d48.704395!4d6.25447!16s%2Fg%2F11c5_rwlp2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Renaissance', 
      coords: [48.704671, 6.248867] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Renaissance/@48.7046155,6.248389,186a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499e46b63cb7b:0x6b32a7c9c05f4486!6m1!1v5!8m2!3d48.7046192!4d6.2489475!16s%2Fg%2F11hdsg21t6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Renaissance/@48.7046155,6.248389,186a,35y,0.89t/data=!3m1!1e3!4m8!3m7!1s0x479499e6bccfb06d:0xf3fd61c344649b36!6m1!1v5!8m2!3d48.704681!4d6.248847!16s%2Fg%2F11c2p4795p?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Porte Verte', 
      coords: [48.706252, 6.245210] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Porte+Verte/@48.7065026,6.2451005,231a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499e0bc899371:0xa868646c27bb9197!6m1!1v5!8m2!3d48.7069585!4d6.2450413!16s%2Fg%2F11c5_sst7h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Essey+Porte+Verte/@48.7056914,6.2451505,229a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499e737026873:0x6be512a108fc2def!6m1!1v5!8m2!3d48.705471!4d6.245525!16s%2Fg%2F11pz4psjyc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Tronc qui fume', 
      coords: [48.709559, 6.243831] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Tronc+qui+fume/@48.709414,6.2435691,457a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499dfd25cea3b:0x2eca4593886c28b2!6m1!1v5!8m2!3d48.7089721!4d6.2437867!16s%2Fg%2F11c2p6wbg4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Tronc+qui+fume/@48.709414,6.2435691,457a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499dfee09d769:0x80ca7470789dc!6m1!1v5!8m2!3d48.710373!4d6.243706!16s%2Fg%2F11hdsg5vzh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Edith Piaf', 
      coords: [48.709002, 6.239019] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Edith+Piaf/@48.708898,6.2393869,293a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499df242d0db5:0xf6ba3b6cf7c6ea08!6m1!1v5!8m2!3d48.709198!4d6.239519!16s%2Fg%2F11c5_rp29b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Edith+Piaf/@48.708981,6.2388936,163a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499df2af6ab97:0x611a68489197584a!6m1!1v5!8m2!3d48.7089473!4d6.23867!16s%2Fg%2F11c2p8yqz9?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Colonies', 
      coords: [48.707232, 6.234604] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Colonies/@48.7073325,6.23452,164a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d99b906e69:0x3c99c7482e5eceb5!6m1!1v5!8m2!3d48.7074181!4d6.2348107!16s%2Fg%2F11c2p6wbfz?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Colonies/@48.7073325,6.23452,164a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d912f1b5db:0x50eba39fdfa1aa85!6m1!1v5!8m2!3d48.7071187!4d6.2344507!16s%2Fg%2F11hdsft4gr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: '69ème RI', 
      coords: [48.705964, 6.231457] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/69%C3%A8me+RI/@48.7054716,6.2305227,167a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d0bcc61f39:0x29087ca10ef7afc5!6m1!1v5!8m2!3d48.705673!4d6.230885!16s%2Fg%2F11xd8n554k?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/69%C3%A8me+RI/@48.7054482,6.2303495,167a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d0be63278f:0xf065d610f1b172d5!6m1!1v5!8m2!3d48.70549!4d6.230207!16s%2Fg%2F11ddxjhl6w?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Quartier Kléber', 
      coords: [48.703596, 6.230085] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Quartier+Kl%C3%A9ber/@48.7034304,6.229998,169a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d068c52165:0x585e55f4a005494d!6m1!1v5!8m2!3d48.7034963!4d6.230022!16s%2Fg%2F11ddxmv92y?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/ESSEY-LES-NANCY+-+Quartier+Kl%C3%A9ber/@48.7034304,6.229998,169a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499d065deed1b:0x8baec6887ffc9b71!6m1!1v5!8m2!3d48.703711!4d6.230219!16s%2Fg%2F11c2p9yy95?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mouzimpré', 
      coords: [48.701688, 6.225716] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Mouzimpr%C3%A9/@48.7014985,6.2253719,170a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499ce1c18aa91:0x81301ab6928efdee!6m1!1v5!8m2!3d48.701683!4d6.22582!16s%2Fg%2F11ddxjzmln?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Essey+Mouzimpr%C3%A9/@48.7014985,6.2253719,170a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479499ce1ceef311:0x622f2d8176f4fa04!6m1!1v5!8m2!3d48.701672!4d6.225606!16s%2Fg%2F11spsqmxqd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Fraternité', 
      coords: [48.694413, 6.214968] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Fraternit%C3%A9/@48.6947156,6.2159932,74a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949835a0543285:0xa4d5bf77a9cdc58f!6m1!1v5!8m2!3d48.693951!4d6.21381!16s%2Fg%2F11c2p7twf4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Fraternit%C3%A9/@48.6947156,6.2159932,74a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794983520b8b8f5:0x6e882d36771fb68e!6m1!1v5!8m2!3d48.694836!4d6.21603!16s%2Fg%2F11g8b6gjm_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Voltaire', 
      coords: [48.690837, 6.210784] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Voltaire/@48.6909305,6.2108463,211a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984a2440c615:0x321a643a14fa0c49!6m1!1v5!8m2!3d48.691032!4d6.210847!16s%2Fg%2F11c2p7l8fz?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Voltaire/@48.6909305,6.2108463,211a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984a2f08e091:0x5a69a78010122891!6m1!1v5!8m2!3d48.690693!4d6.210731!16s%2Fg%2F11c5_ndqq4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'La Meurthe', 
      coords: [48.688196, 6.208162] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/La+Meurthe/@48.6880224,6.2079973,217a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984935d4a80d:0x61cf365aeea04c77!6m1!1v5!8m2!3d48.688262!4d6.208362!16s%2Fg%2F11fn2671lt?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/La+Meurthe/@48.6880224,6.2079973,217a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984935d781d1:0x33aa1affea9be531!6m1!1v5!8m2!3d48.68808!4d6.207677!16s%2Fg%2F11c2p3x9pj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Austrasie', 
      coords: [48.687398, 6.204354] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Austrasie/@48.6873974,6.2045108,218a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984f4851d841:0x804e742ce9702935!6m1!1v5!8m2!3d48.687473!4d6.204852!16s%2Fg%2F11h_1l5d6b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Austrasie/@48.6873974,6.2045108,218a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984f48d6961b:0xe2e8e4eb08a12500!6m1!1v5!8m2!3d48.687496!4d6.204649!16s%2Fg%2F11xfzmvvq6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Victor', 
      coords: [48.686571, 6.200243] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Victor/@48.6867929,6.2013394,218a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949845eb478dd5:0xffaab25716eb54ae!6m1!1v5!8m2!3d48.686905!4d6.202131!16s%2Fg%2F11hdsg5vyw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Victor/@48.6865893,6.199407,218a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498444c8d8ab7:0xe13d8ff169fbaba!6m1!1v5!8m2!3d48.686545!4d6.199849!16s%2Fg%2F11ddxp9p2m?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Loritz Direction Nord', 
      coords: [48.685876, 6.196886] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Loritz/@48.6863971,6.1958577,472a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498437f97333b:0x155e05c36f4fdddc!6m1!1v5!8m2!3d48.6858252!4d6.1969334!16s%2Fg%2F11c5_t230k?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Loritz Direction Sud', 
      coords: [48.687066, 6.195519] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Loritz/@48.6863971,6.1958577,472a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949843bf49193b:0xac17590e15d07f6d!6m1!1v5!8m2!3d48.687119!4d6.195542!16s%2Fg%2F11c5_nb3fw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Julien', 
      coords: [48.685944, 6.191178] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Saint-Julien/@48.6858043,6.1907649,471a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498428179f505:0x6da8fa471c07ffec!6m1!1v5!8m2!3d48.685993!4d6.191367!16s%2Fg%2F11c2p8yqz7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Saint-Julien/@48.6858043,6.1907649,471a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794984281de99cd:0x2b3e3a1564b1f3f2!6m1!1v5!8m2!3d48.686012!4d6.191137!16s%2Fg%2F11ddxp4fsb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place des Vosges', 
      coords: [48.684769, 6.187656] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Place+des+Vosges/@48.684769,6.187656,190a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794986889c5dfc3:0xe78efd73565e7523!6m1!1v5!8m2!3d48.684692!4d6.187683!16s%2Fg%2F11xd8rcbdx?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Place+des+Vosges/@48.684769,6.187656,190a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794986889b6900b:0x41efb960e8788e9!6m1!1v5!8m2!3d48.6848679!4d6.1876299!16s%2Fg%2F11c2pbvtr1?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Varsovie', 
      coords: [48.683298, 6.184280] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Varsovie/@48.6834788,6.1836727,190a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949865fa93e7cf:0xb039e461907afdf!6m1!1v5!8m2!3d48.683418!4d6.183891!16s%2Fg%2F11c2p8sjrj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Varsovie/@48.6834788,6.1836727,190a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949865f0d0fd29:0x19871b4a4174c399!6m1!1v5!8m2!3d48.683735!4d6.183609!16s%2Fg%2F11xd8nsdsy?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Place des justes', 
      coords: [48.685810, 6.181332] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Place+des+justes/@48.6857362,6.1812329,192a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794986fa4fd337d:0x1b73de6ff78f205c!6m1!1v5!8m2!3d48.6858237!4d6.1814069!16s%2Fg%2F11ddxn_519?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Place+des+Justes/@48.6857362,6.1812329,192a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794986fbb8e6e2b:0x5e64e21ac66fe752!6m1!1v5!8m2!3d48.6858113!4d6.1812086!16s%2Fg%2F11fn25y0b9?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Sébastien', 
      coords: [48.688255, 6.179488] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Saint-S%C3%A9bastien/@48.6880113,6.179611,197a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949871dc5cd23b:0x16ea0ce8ebae3120!6m1!1v5!8m2!3d48.6881757!4d6.1796435!16s%2Fg%2F11j8glszlh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Saint-S%C3%A9bastien/@48.6880113,6.179611,197a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949871e1c8c8c1:0x6394e768b09a9696!6m1!1v5!8m2!3d48.6882434!4d6.1794254!16s%2Fg%2F11hdsfrjt3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare Joffre', 
      coords: [48.688499, 6.177309] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Gare+-+Joffre/@48.6882309,6.1762544,412a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498719ae84395:0xdc0b51f848a1fe67!6m1!1v5!8m2!3d48.6887463!4d6.1771675!16s%2Fg%2F11x8j0f77z?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Gare+-+Joffre/@48.6882309,6.1762544,412a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498719b630059:0x508ccb5468ee7a09!6m1!1v5!8m2!3d48.6887354!4d6.1769344!16s%2Fg%2F11x65klwl8?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Victoire', 
      coords: [48.683950, 6.150875] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Victoire/@48.6845533,6.1511147,938a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a28fb90a0569:0xfb9d5ece53ad6ac0!6m1!1v5!8m2!3d48.684322!4d6.152345!16s%2Fg%2F11c2p6y_t3?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Victoire/@48.6839011,6.1513776,592a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a28effdca707:0x84dd0b808cb2423b!6m1!1v5!8m2!3d48.683208!4d6.151135!16s%2Fg%2F11c2p7mv9b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Hardeval', 
      coords: [48.681173, 6.152761] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Hardeval/@48.6808827,6.1525168,587a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a28f46695101:0xf289eecb5298a285!6m1!1v5!8m2!3d48.681408!4d6.152553!16s%2Fg%2F11c2p83qby?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Hardeval/@48.6808827,6.1525168,587a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a28f4d8c018b:0x376bc4d3a248d29f!6m1!1v5!8m2!3d48.680962!4d6.152968!16s%2Fg%2F11c2pcrdw5?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Europe', 
      coords: [48.680113, 6.151511] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Europe/@48.6801564,6.1514996,379a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a288c8bb64fb:0x2ef0ccf9ed4a5b1f!6m1!1v5!8m2!3d48.6803227!4d6.1522992!16s%2Fg%2F11c2p7l8fh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Europe/@48.6802227,6.1513348,154a,35y,0.79t/data=!3m1!1e3!4m8!3m7!1s0x4794a288c5122619:0xbb34fe6f1b73e08c!6m1!1v5!8m2!3d48.680054!4d6.151325!16s%2Fg%2F11ddxnbxld?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Provinces', 
      coords: [48.679726, 6.148092] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Provinces/@48.6801809,6.1476637,802a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a2895d6ca931:0xd145cd86435d8036!6m1!1v5!8m2!3d48.679707!4d6.148133!16s%2Fg%2F11c5_rmj_f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Provinces/@48.6796982,6.147705,176a,35y,0.79t/data=!3m1!1e3!4m8!3m7!1s0x4794a2895cbe22f9:0xfb801ebe2783abfc!6m1!1v5!8m2!3d48.679939!4d6.148096!16s%2Fg%2F11xd8rmmwj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Maréville', 
      coords: [48.678044, 6.144837] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Mar%C3%A9ville/@48.6783522,6.1434995,526a,35y,0.69t/data=!3m1!1e3!4m8!3m7!1s0x4794a28a56a50a55:0xe18ea7fc1f6a44e0!6m1!1v5!8m2!3d48.6781568!4d6.1444084!16s%2Fg%2F11fn25t46v?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Mar%C3%A9ville/@48.6781458,6.1439745,371a,35y,0.69t/data=!3m1!1e3!4m8!3m7!1s0x4794a28a4f4da22b:0x76dfdb169ec7c416!6m1!1v5!8m2!3d48.678005!4d6.145112!16s%2Fg%2F11xd8nsdh_?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Rodin', 
      coords: [48.675042, 6.150276] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Rodin/@48.6746414,6.1499267,372a,35y,0.69t/data=!3m1!1e3!4m8!3m7!1s0x4794a262902f39bf:0xfa71874effbb4d47!6m1!1v5!8m2!3d48.675049!4d6.150173!16s%2Fg%2F11fn25_584?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Rodin/@48.6749864,6.1500778,111a,35y,0.69t/data=!3m1!1e3!4m8!3m7!1s0x4794a27d67b72583:0xdfa6651d9d3743be!6m1!1v5!8m2!3d48.6751606!4d6.1502062!16s%2Fg%2F11fn25zndb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Villers Mairie', 
      coords: [48.672442, 6.154544] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Villers+Mairie/@48.6730552,6.1532533,409a,35y,0.69t/data=!3m1!1e3!4m8!3m7!1s0x4794a27cf9b7018f:0xb941da473a3204bf!6m1!1v5!8m2!3d48.672806!4d6.154018!16s%2Fg%2F11c5_t604m?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Villers+Mairie/@48.6735796,6.1522231,953a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a27c58a1092d:0x1da4b939ca240586!6m1!1v5!8m2!3d48.672214!4d6.154906!16s%2Fg%2F11ddxq5mfg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Paul Muller', 
      coords: [48.670675, 6.157520] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Paul+Muller/@48.6707938,6.1569407,462a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a27ea9ea55f7:0x3eb1d1a637db4e5e!6m1!1v5!8m2!3d48.670773!4d6.157561!16s%2Fg%2F11c5_rbk47?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Paul+Muller/@48.6707938,6.1569407,462a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a27eab3c1c37:0x37cea0d85dc28980!6m1!1v5!8m2!3d48.670406!4d6.157778!16s%2Fg%2F11c5_s3w3q?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Joseph Laurent', 
      coords: [48.668185, 6.160359] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Joseph+Laurent/@48.6682398,6.160307,190a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a278fba041f9:0x42ba3227096bb811!6m1!1v5!8m2!3d48.668274!4d6.160502!16s%2Fg%2F11c5_s5jv7?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Joseph+Laurent/@48.6682398,6.160307,190a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a278fc8a5da7:0x4c1bb2fda96e908e!6m1!1v5!8m2!3d48.668194!4d6.160238!16s%2Fg%2F11c2p99064?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'UFR Staps', 
      coords: [48.667211, 6.158228] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/UFR+Staps/@48.6672836,6.1573239,982a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a279bd53eb8d:0xde3aed0318aa4904!6m1!1v5!8m2!3d48.667229!4d6.158279!16s%2Fg%2F11ddxmv92t?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/UFR+Staps/@48.666957,6.1580453,169a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a279981a08cb:0x63a2c2c632f8b0bc!6m1!1v5!8m2!3d48.66724!4d6.158198!16s%2Fg%2F11c5_r0r_z?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Grande Corvée', 
      coords: [48.665093, 6.155904] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Grande+Corv%C3%A9e/@48.6653924,6.1557634,406a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a27a01c0cf99:0x2ed9a2167d331d40!6m1!1v5!8m2!3d48.665657!4d6.156302!16s%2Fg%2F11c2p7whky?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Grande+Corv%C3%A9e/@48.6653725,6.1556966,453a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a270b1c3f1e9:0xf1ad2e660bbec248!6m1!1v5!8m2!3d48.664738!4d6.155718!16s%2Fg%2F11c2p8_kwc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Villers Campus Sciences', 
      coords: [48.663495, 6.155502] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Villers+Campus+Sciences/@48.6630686,6.1556539,395a,35y,0.68t/data=!3m1!1e3!4m8!3m7!1s0x4794a270d3a0b3c1:0x1b7c277b634acd6f!6m1!1v5!8m2!3d48.663364!4d6.155698!16s%2Fg%2F11h_1ld5vh?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare Thiers Poirel Direction Sud', 
      coords: [48.690365, 6.175653] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Gare+Thiers+Poirel/@48.690384,6.1756471,75a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949873c41361d1:0xc06ebe819d4291ac!6m1!1v5!8m2!3d48.6904283!4d6.1757069!16s%2Fg%2F11hdsgcfs6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Tour Thiers Gare Direction Nord', 
      coords: [48.690849, 6.174509] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Tour+Thiers+Gare/@48.6908545,6.174427,59a,37.7y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x479498738d12f2fd:0x315ce76bd5931941!6m1!1v5!8m2!3d48.6908987!4d6.1744956!16s%2Fg%2F11c5_lc19l?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gare - Raymond Poincaré Direction Nord', 
      coords: [48.689870, 6.171286] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Gare+-+Raymond+Poincar%C3%A9/@48.6899637,6.1711729,166a,35y,0.79t/data=!3m1!1e3!4m8!3m7!1s0x4794987429a3b4d3:0xbc15e919aabd107f!6m1!1v5!8m2!3d48.689922!4d6.171256!16s%2Fg%2F11ddxq3mmb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Bégonias Direction Nord', 
      coords: [48.689266, 6.169294] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/B%C3%A9gonias/@48.6892939,6.1692026,165a,35y,0.79t/data=!3m1!1e3!4m8!3m7!1s0x479498760d576787:0xcfddef7c7375c27e!6m1!1v5!8m2!3d48.689281!4d6.169061!16s%2Fg%2F11fn2659ch?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Préville Direction Nord T2', 
      coords: [48.688090, 6.165418] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Pr%C3%A9ville/@48.6879439,6.1652353,274a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a29da4a221c1:0xffbac6125e9cd536!6m1!1v5!8m2!3d48.6881241!4d6.1654258!16s%2Fg%2F11ddxq1p9t?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Gridel Direction Nord', 
      coords: [48.686661, 6.160751] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Gridel/@48.6862317,6.159695,269a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a29b60e403c3:0x947e6e4f55941ee9!6m1!1v5!8m2!3d48.686689!4d6.1607588!16s%2Fg%2F11c5_ndqqf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Méderville Direction Nord', 
      coords: [48.685739, 6.157734] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/M%C3%A9dreville/@48.6857062,6.1575571,271a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a29ad5e23f61:0x1d01d59223706a7b!6m1!1v5!8m2!3d48.685848!4d6.157499!16s%2Fg%2F11c5_yj7ty?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Domaine Sainte-Anne Direction Nord', 
      coords: [48.685078, 6.155555] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Villers',
          url: 'https://www.google.fr/maps/place/Domaine+Sainte-Anne/@48.6848121,6.1544241,169a,35y,0.79t/data=!3m1!1e3!4m8!3m7!1s0x4794a2855a113ccd:0x2f3b7d00368eb0f8!6m1!1v5!8m2!3d48.684811!4d6.154581!16s%2Fg%2F11hdsfvwbz?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-Léon Direction Sud', 
      coords: [48.688326, 6.173023] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Saint+L%C3%A9on/@48.6865248,6.1676707,947a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949876ca29f0e3:0xbf9db145abce3e1c!6m1!1v5!8m2!3d48.6882784!4d6.1730729!16s%2Fg%2F11c5_sg2br?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Commanderie Direction Sud', 
      coords: [48.686566, 6.167868] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Commanderie/@48.6865179,6.1673555,946a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x47949877c462fe41:0x7279fb4150900fc0!6m1!1v5!8m2!3d48.68679!4d6.168016!16s%2Fg%2F11c5_s5jv6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Sacré Coeur Direction Sud', 
      coords: [48.686258, 6.162846] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Sacr%C3%A9+Coeur/@48.6864698,6.1642554,948a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a29cc3e89cad:0xce4f00e58a8a8525!6m1!1v5!8m2!3d48.686279!4d6.162846!16s%2Fg%2F11ddxnkf_x?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Méderville Direction Sud', 
      coords: [48.685321, 6.160280] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/M%C3%A9dreville/@48.6855392,6.1597235,942a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a284aca3bb07:0x9dc46e527e2f61a0!6m1!1v5!8m2!3d48.685299!4d6.160245!16s%2Fg%2F11c2p7qy9y?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Domaine Sainte-Anne Direction Sud', 
      coords: [48.684757, 6.156183] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Seichamps',
          url: 'https://www.google.fr/maps/place/Domaine+Sainte-Anne/@48.6855324,6.1571003,941a,35y,0.78t/data=!3m1!1e3!4m8!3m7!1s0x4794a28538f844a9:0x9d0f18fd973f0a00!6m1!1v5!8m2!3d48.684757!4d6.156183!16s%2Fg%2F11fn25sx84?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    }
  ]
};

interface TramLine {
  id: string;
  name: string;
  description: string;
  color: string;
  coordinates: [number, number][];
  stops: {
    name: string;
    coords: [number, number];
    googleMapsUrl?: string; // Pour la compatibilité avec T1
    googleMapsUrls?: Array<{
      direction: string;
      url: string;
    }>; // Pour T5 avec directions multiples
  }[];
  coordinatesVandeouvre?: [number, number][];
  coordinatesMaxeville?: [number, number][];
  coordinatesLaxou?: [number, number][];
  coordinatesHoudemont?: [number, number][];
  coordinatesLaneuville?: [number, number][];
  coordinatesVillers?: [number, number][];
  coordinatesSeichamps?: [number, number][];
}

interface BusLinesProps {
  visibleLines: string[];
}

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
      
      {/* Indicateur de chargement des arrêts - Supprimé */}
      {false && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Chargement des arrêts...
        </div>
      )}
      
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
          {(line as any).id === 'T4' && (line as any).coordinatesLaxou && (line as any).coordinatesHoudemont && (
            <>
              {/* Tracé direction Laxou Champ-le-Beouf */}
              <Polyline
                positions={(line as any).coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Houdemont Porte Sud */}
              <Polyline
                positions={(line as any).coordinatesHoudemont}
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
          {(line as any).id === 'T3' && (line as any).coordinatesVillers && (line as any).coordinatesSeichamps && (
            <>
              {/* Tracé direction Villers Campus Sciences */}
              <Polyline
                positions={(line as any).coordinatesVillers}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Seichamps Haie Cerlin */}
              <Polyline
                positions={(line as any).coordinatesSeichamps}
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
          {(line as any).id === 'T2' && (line as any).coordinatesLaxou && (line as any).coordinatesLaneuville && (
            <>
              {/* Tracé direction Laxou Sapinière */}
              <Polyline
                positions={(line as any).coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Laneuville Centre */}
              <Polyline
                positions={(line as any).coordinatesLaneuville}
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
          {(line as any).id === 'T3' && (line as any).coordinatesVillers && (line as any).coordinatesSeichamps && (
            <>
              {/* Tracé direction Villers Campus Sciences */}
              <Polyline
                positions={(line as any).coordinatesVillers}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Seichamps Haie Cerlin */}
              <Polyline
                positions={(line as any).coordinatesSeichamps}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
            </>
          )}
          
          {/* Tracés séparés pour T4 */}
          {(line as any).id === 'T4' && (line as any).coordinatesLaxou && (line as any).coordinatesHoudemont && (
            <>
              {/* Tracé direction Laxou Champ-le-Beouf */}
              <Polyline
                positions={(line as any).coordinatesLaxou}
                color={line.color}
                weight={4}
                opacity={0.8}
              />
              {/* Tracé direction Houdemont Porte Sud */}
              <Polyline
                positions={(line as any).coordinatesHoudemont}
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

        return allStops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            position={stop.coords}
            icon={tramStopIcon}
            eventHandlers={{
              click: () => setSelectedStop(`stop-${index}`)
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
        ));
      })()}
    </>
  );
};

export default BusLines;
