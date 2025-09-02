import React, { useState, useEffect } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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
    [48.679043, 6.179830],   // Jean Jaurès
    [48.681119, 6.178509],   // Garenne - Rose Wild
    [48.684268, 6.176490],   // Mont Désert - Thermal (modifié)
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
    [48.703771, 6.221443],   // Essey-Centre (modifié)
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
          url: 'https://www.google.fr/maps/place/Vandoeuvre+Brabois+-+H./@48.6493121,6.1463284,19.94z/data=!4m8!3m7!1s0x4794a211dc51595d:0xdefafe326cca9ba!6m1!1v4!8m2!3d48.64947!4d6.1464475!16s%2Fg%2F11mcbbvy0n?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Technopôle', 
      coords: [48.650733, 6.148218] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Technop%C3%B4le/@48.6505696,6.1480625,19.18z/data=!4m8!3m7!1s0x4794a20de2bf326d:0x2af08ce1fe359328!6m1!1v4!8m2!3d48.6507855!4d6.1482375!16s%2Fg%2F11x65j4q_c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Parc de Brabois', 
      coords: [48.653917, 6.152300] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Parc+de+Brabois/@48.6538678,6.152215,21z/data=!4m8!3m7!1s0x4794a20c95b24b09:0xf3e69129a22176!6m1!1v4!8m2!3d48.653887!4d6.152348!16s%2Fg%2F11x65kj0fb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Notre-Dame-des-Pauvres Direction Sud', 
      coords: [48.657364, 6.155514] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Vandeouvre',
          url: 'https://www.google.fr/maps/place/Notre-Dame-des-Pauvres/@48.6569281,6.1546025,17.86z/data=!4m8!3m7!1s0x4794a2748fa4eff3:0xe48f24141f628937!6m1!1v4!8m2!3d48.657397!4d6.155494!16s%2Fg%2F11x65jkk5f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Saint-André - Jardin Botanique', 
      coords: [48.660226, 6.159446] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Saint-Andr%C3%A9+-+Jardin+Botanique/@48.6602025,6.1583062,18.06z/data=!4m8!3m7!1s0x4794a27675eabf6d:0xac4c3c8372c4e2c4!6m1!1v4!8m2!3d48.6602275!4d6.159422!16s%2Fg%2F11hdsft4gv?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Le Reclus', 
      coords: [48.662663, 6.162116] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Le+Reclus/@48.6625734,6.1613286,18.37z/data=!4m8!3m7!1s0x4794989d81dc665b:0xb4e6e0354a5393f5!6m1!1v4!8m2!3d48.662461!4d6.161903!16s%2Fg%2F11hdsfzcks?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Vélodrome - Callot', 
      coords: [48.665981, 6.165730] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Callot/@48.665933,6.1652135,18.37z/data=!4m8!3m7!1s0x4794988322755d57:0xe606e48b5a7edfaf!6m1!1v4!8m2!3d48.6661411!4d6.166052!16s%2Fg%2F1thzmv4b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Montet Octroi', 
      coords: [48.668397, 6.168561] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6684455,6.1685113,21z/data=!4m8!3m7!1s0x479498838c8c0383:0xdc3e28efa34f16be!6m1!1v4!8m2!3d48.6684475!4d6.1685625!16s%2Fg%2F11mcbbykq4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'ARTEM - Blandant - Thermal', 
      coords: [48.671964, 6.172453] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.6720045,6.1723681,21z/data=!4m8!3m7!1s0x47949886fda87255:0x63caae178d22b4ef!6m1!1v4!8m2!3d48.6720305!4d6.172642!16s%2Fg%2F11x8hz8x2h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Exelmans', 
      coords: [48.675217, 6.176070] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Exelmans/@48.6748551,6.1753736,19.51z/data=!4m8!3m7!1s0x4794987d4fe9b613:0xbc301fb9447045cd!6m1!1v4!8m2!3d48.675103!4d6.175924!16s%2Fg%2F1tp_59tn?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Jean Jaurès T1', 
      coords: [48.679043, 6.179830] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Jean+Jaur%C3%A8s/@48.6793597,6.1799183,18.46z/data=!4m8!3m7!1s0x479498637d3774cd:0x53d4ca921edb36f!6m1!1v4!8m2!3d48.6793105!4d6.1797245!16s%2Fg%2F11fn265wzr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Garenne - Rose Wild', 
      coords: [48.681119, 6.178509] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Garenne+-+Rose+Wild/@48.6809323,6.1784107,19.27z/data=!4m8!3m7!1s0x47949864d0491d15:0xc08b6c2e90aa96db!6m1!1v4!8m2!3d48.6812298!4d6.1785468!16s%2Fg%2F11x8j0cmhf?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Mont Désert - Thermal', 
      coords: [48.684268, 6.176490] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Mon+D%C3%A9sert+-+Thermal/@48.6843069,6.176435,19.97z/data=!4m8!3m7!1s0x4794987a9cc13507:0x95ddf0810e50bfc3!6m1!1v4!8m2!3d48.6844035!4d6.1764598!16s%2Fg%2F11x65lbd1b?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Gare - Saint-Léon', 
      coords: [48.687458, 6.174090] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Gare+-+Saint-L%C3%A9on/@48.6873599,6.1741505,19.65z/data=!4m8!3m7!1s0x47949871289b11d5:0xcffd5e9d8116276d!6m1!1v4!8m2!3d48.6874882!4d6.1741815!16s%2Fg%2F11x65jp8px?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Gare - Pierre Semard', 
      coords: [48.689095, 6.177189] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Gare+-+Pierre+Semard/@48.6891417,6.1770759,20.63z/data=!4m8!3m7!1s0x479498718411de2b:0x8f09a939b68ed6d7!6m1!1v4!8m2!3d48.6891225!4d6.177214!16s%2Fg%2F11x8hzby70?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Point Central', 
      coords: [48.690794, 6.182471] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Point+Central/@48.6907614,6.1820377,20.39z/data=!4m8!3m7!1s0x4794986db923e7e3:0x9302cd0f6edc3012!6m1!1v4!8m2!3d48.690805!4d6.182384!16s%2Fg%2F11x8j04x71?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Stanislas - Cathédrale', 
      coords: [48.691948, 6.186005] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Stanislas+-+Cath%C3%A9drale/@48.6916274,6.1853283,19.23z/data=!4m8!3m7!1s0x4794986c889f63e5:0xf8f0e358a4549a95!6m1!1v4!8m2!3d48.6918295!4d6.1856525!16s%2Fg%2F11x8hzx_z8?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Division de Fer', 
      coords: [48.693370, 6.190932] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Division+de+Fer/@48.693393,6.1909838,19.23z/data=!4m8!3m7!1s0x4794986ab5762d6b:0xb1a68d53a768315c!6m1!1v4!8m2!3d48.6935929!4d6.191462!16s%2Fg%2F11x65l4309?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Deux Rives - Olympes de Gouges', 
      coords: [48.695032, 6.194019] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Deux+Rives+-+O.+de+Gouges/@48.6955688,6.1950588,19.23z/data=!4m8!3m7!1s0x4794983fb17798cd:0x66e1c0196b6f3ab8!6m1!1v4!8m2!3d48.6957145!4d6.195355!16s%2Fg%2F11x65ht3x1?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Cristalleries - Stade Marcel Picot', 
      coords: [48.697523, 6.198829] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Cristalleries+-+Stade+M.+Picot/@48.6974199,6.1984788,19.28z/data=!4m8!3m7!1s0x4794983eba48d66d:0xf2fade127808a2a8!6m1!1v4!8m2!3d48.697525!4d6.1988255!16s%2Fg%2F11x65j8xkm?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Mairie de Saint Max', 
      coords: [48.700510, 6.207530] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Mairie+de+Saint-Max/@48.7004973,6.2070828,19.06z/data=!4m8!3m7!1s0x4794983060646ccd:0x13ac836c5512b289!6m1!1v4!8m2!3d48.7005544!4d6.2077635!16s%2Fg%2F11x65hphlb?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Washington Foch', 
      coords: [48.702124, 6.213303] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Washington+Foch/@48.702441,6.2134798,19.06z/data=!4m8!3m7!1s0x4794983205ad5595:0x34bfe6e590cfe223!6m1!1v4!8m2!3d48.7021911!4d6.2132437!16s%2Fg%2F1tdf08lj?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Clinique Pasteur', 
      coords: [48.703162, 6.216946] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Clinique+Pasteur/@48.7030829,6.2161898,19.06z/data=!4m8!3m7!1s0x4794982d42102d8f:0x58845e8a66c543cb!6m1!1v4!8m2!3d48.703242!4d6.217148!16s%2Fg%2F11c6cnt_n4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Essey-Centre', 
      coords: [48.703771, 6.221443] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Essey+Centre/@48.7038826,6.2206614,19.19z/data=!4m8!3m7!1s0x479499d2ec448d9b:0x29e78bed2ddfb9f1!6m1!1v4!8m2!3d48.7036518!4d6.2214678!16s%2Fg%2F11x65hvtvg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
    [48.668397, 6.168561], // Montet Octroi (partagé avec T1)
    [48.671964, 6.172453], // ARTEM - Blandan - Thermal (partagé avec T1)
    [48.675217, 6.176070], // Exelmans (partagé avec T1)
    [48.678672, 6.179993], // Point intermédiaire
    [48.678827, 6.180074], // Point intermédiaire
    [48.679197, 6.180481], // Jean Jaurès (nouveau point T5)
  ] as [number, number][],
  // Tracé direction Vandeouvre Roberval (gauche)
  coordinatesVandeouvre: [
    [48.679197, 6.180481], // Jean Jaurès (partagé avec T1)
    [48.681798, 6.183409], // Garenne - Saurupt
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
          direction: 'Voir les horraires T5',
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
      googleMapsUrl: 'https://www.google.fr/maps/place/Montet+Octroi/@48.6684982,6.1686891,21z/data=!4m8!3m7!1s0x479498838c8c0383:0xdc3e28efa34f16be!6m1!1v5!8m2!3d48.6684475!4d6.1685625!16s%2Fg%2F11mcbbykq4?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'ARTEM - Blandant - Thermal', 
      coords: [48.671964, 6.172453] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/ARTEM+-+Blandan+-+Thermal/@48.672093,6.1721975,19.24z/data=!4m8!3m7!1s0x47949886fda87255:0x63caae178d22b4ef!6m1!1v5!8m2!3d48.6720305!4d6.172642!16s%2Fg%2F11x8hz8x2h?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Exelmans', 
      coords: [48.675217, 6.176070] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Exelmans/@48.6749411,6.1754651,19.77z/data=!4m8!3m7!1s0x4794987d4fe9b613:0xbc301fb9447045cd!6m1!1v5!8m2!3d48.675103!4d6.175924!16s%2Fg%2F11tp_59tn?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Jean Jaurès', 
      coords: [48.679197, 6.180481] as [number, number],
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
    [48.678827, 6.180074], // Point intermédiaire
    [48.679197, 6.180481], // Jean Jaurès (partagé avec T5)
  ] as [number, number][],
  // Tracé direction Laxou Champ-le-Beouf (gauche)
  coordinatesLaxou: [
    [48.679197, 6.180481], // Jean Jaurès (partagé avec T5)
    [48.681798, 6.183409], // Garenne - Saurupt (partagé avec T5)
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
    [48.686012, 6.166898], // Point intermédiaire
    [48.687561, 6.166235], // Préville Direction Sud
    [48.688303, 6.165892], // Point intermédiaire
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
    [48.694649, 6.127576], // Point intermédiaire
    [48.694974, 6.124373], // Point intermédiaire
    [48.695672, 6.124361], // Vair Direction Sud
    [48.695998, 6.124373], // Point intermédiaire
    [48.696033, 6.125262], // Point intermédiaire
    [48.697247, 6.125168], // Moselotte
    [48.698202, 6.125090], // Point intermédiaire
    [48.698156, 6.123322], // Laxou Champ-le-Beouf
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
    [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
    [48.689870, 6.171286], // Gare - Raymond Poincaré Direction Nord
    [48.689266, 6.169294], // Bégonias Direction Nord
    [48.688424, 6.166499], // Préville Direction Nord
    [48.688305, 6.165897], // Point intermédiaire
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
    [48.694649, 6.127576], // Point intermédiaire
    [48.694907, 6.127233], // Point intermédiaire
    [48.696086, 6.126997], // Point intermédiaire
    [48.696039, 6.125463], // Saône Direction Nord
    [48.695998, 6.124373], // Point intermédiaire
    [48.696037, 6.123708], // Vair Direction Nord
    [48.696100, 6.123089], // Point intermédiaire
    [48.698137, 6.122952], // Point intermédiaire
    [48.698156, 6.123322], // Laxou Champ-le-Beouf
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
      coords: [48.679197, 6.180481] as [number, number],
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
          url: 'https://www.google.fr/maps/place/Vair/@48.6960387,6.1237223,281a,35y,0.97t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e0f195a159:0x820ca36c670cbb1a!6m1!1v5!8m2!3d48.695711!4d6.124376!16s%2Fg%2F11c2p8hl0c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
          direction: 'Horaires Direction Laxou',
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
    [48.666427, 6.213544], // Gabriel Faure
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
  ] as [number, number][],
  // Tracé direction Laxou Sapinière (droite)
  coordinatesLaxou: [
    [48.684769, 6.187656], // Place des Vosges
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
    [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
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
    [48.700377, 6.129944], // Point intermédiaire
    [48.700296, 6.130568], // Point intermédiaire
    [48.699963, 6.130504], // Point intermédiaire
    [48.699985, 6.130321], // Saint-Exupéry
    [48.699964, 6.129830], // Point intermédiaire
    [48.699833, 6.129337], // Point intermédiaire
    [48.699103, 6.127778], // Madine
    [48.698482, 6.126476], // Point intermédiaire
    [48.698309, 6.125923], // Point intermédiaire
    [48.698219, 6.125361], // Point intermédiaire
    [48.698156, 6.123322], // Laxou Champ-le-Beouf
    [48.698137, 6.122952], // Point intermédiaire
    [48.698119, 6.121751], // Point intermédiaire
    [48.698308, 6.121042], // Point intermédiaire
    [48.697630, 6.120190], // Laxou Plateau de Haye Direction Nord
    [48.697303, 6.119962], // Point intermédiaire
    [48.697084, 6.119902], // Point intermédiaire
    [48.696754, 6.119993], // Point intermédiaire
    [48.696418, 6.120347], // Point intermédiaire
    [48.696227, 6.121046], // Mouzon Direction Nord
    [48.696100, 6.123089], // Point intermédiaire
    [48.695998, 6.124373], // Point intermédiaire
    [48.695672, 6.124361], // Vair Direction Sud
    [48.694974, 6.124373], // Point intermédiaire
    [48.694649, 6.127576], // Point intermédiaire
    [48.694612, 6.128002], // Point intermédiaire
    [48.692532, 6.128162], // Point de jonction
    [48.690981, 6.128387], // Laxou Sapinière
  ] as [number, number][],
  // Tracé direction Laneuville Centre (gauche)
  coordinatesLaneuville: [
    [48.684769, 6.187656], // Place des Vosges
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
    [48.700377, 6.129944], // Point intermédiaire
    [48.700296, 6.130568], // Point intermédiaire
    [48.699963, 6.130504], // Point intermédiaire
    [48.699985, 6.130321], // Saint-Exupéry
    [48.699964, 6.129830], // Point intermédiaire
    [48.699833, 6.129337], // Point intermédiaire
    [48.699103, 6.127778], // Madine
    [48.698482, 6.126476], // Point intermédiaire
    [48.698309, 6.125923], // Point intermédiaire
    [48.698219, 6.125361], // Point intermédiaire
    [48.698156, 6.123322], // Laxou Champ-le-Beouf
    [48.698137, 6.122952], // Point intermédiaire
    [48.696100, 6.123089], // Point intermédiaire
    [48.696037, 6.123708], // Vair Direction Nord
    [48.695998, 6.124373], // Point intermédiaire
    [48.696039, 6.125463], // Saône Direction Nord
    [48.696086, 6.126997], // Point intermédiaire
    [48.694907, 6.127233], // Point intermédiaire
    [48.694649, 6.127576], // Point intermédiaire
    [48.694612, 6.128002], // Point de jonction
    [48.692532, 6.128162], // Point intermédiaire
    [48.690981, 6.128387], // Laxou Sapinière
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
          direction: 'Voir les Horaires Ligne T2',
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
      name: 'Gabriel Faure', 
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
          direction: 'Voir les Horaires Ligne T2',
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
          direction: 'Voir les Horaires Ligne T2',
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
          url: 'https://www.google.fr/maps/place/Tour+Thiers+Gare/@48.690785,6.1749661,483a,35y,0.97t/data=!3m1!1e3!4m6!3m5!1s0x479498738d12f2fd:0x315ce76bd5931941!8m2!3d48.6908987!4d6.1744956!16s%2Fg%2F11c5_lc19l?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
          url: 'https://www.google.fr/maps/place/Domr%C3%A9my/@48.6881355,6.1702565,234a,35y,0.97t/data=!3m1!1e3!4m6!3m5!1s0x4794987659316d3f:0x5c4f16462835bf8f!8m2!3d48.6882764!4d6.170347!16s%2Fg%2F11h_1lhwm2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
          direction: 'Horaires Direction Laxou',
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
      coords: [48.699985, 6.130321] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Saint-Exup%C3%A9ry/@48.6999858,6.1300399,140a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2dc572b2b1b:0x812347cb23d2266e!6m1!1v5!8m2!3d48.699978!4d6.130438!16s%2Fg%2F11fd4rn294?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Saint-Exup%C3%A9ry/@48.699948,6.1301267,68a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2dc567749af:0xbe266675306b8158!6m1!1v5!8m2!3d48.699933!4d6.1302238!16s%2Fg%2F11gtz6_l4r?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
      name: 'Laxou Plateau de Haye Direction Nord', 
      coords: [48.697630, 6.120190] as [number, number],
      googleMapsUrls: [
        {
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laxou+Plateau+de+Haye/@48.6976367,6.1203211,122a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a3201da7ed55:0xd6df4f18d6189590!6m1!1v5!8m2!3d48.6977036!4d6.1201687!16s%2Fg%2F11c5_gb8kq?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        }
      ]
    },
    { 
      name: 'Mouzon Direction Nord', 
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
          url: 'https://www.google.fr/maps/place/Vair/@48.6957334,6.1235408,289a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e0f195a159:0x820ca36c670cbb1a!6m1!1v5!8m2!3d48.695711!4d6.124376!16s%2Fg%2F11c2p8hl0c?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
          direction: 'Horaires Direction Laxou',
          url: 'https://www.google.fr/maps/place/Laxou+Sapini%C3%A8re/@48.6911286,6.128164,168a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e431967513:0x20496e9b37d61370!6m1!1v5!8m2!3d48.691345!4d6.128298!16s%2Fg%2F11h_1l965z?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
        },
        {
          direction: 'Horaires Direction Laneuville',
          url: 'https://www.google.fr/maps/place/Laxou+Sapini%C3%A8re/@48.6911286,6.128164,168a,35y,1.01t/data=!3m1!1e3!4m8!3m7!1s0x4794a2e436919661:0x86447570e5f905c0!6m1!1v5!8m2!3d48.691143!4d6.128542!16s%2Fg%2F11c2p7twf2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
}

interface BusLinesProps {
  visibleLines: string[];
}

const BusLines: React.FC<BusLinesProps> = ({ visibleLines }) => {
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(15); // Initial zoom level

  const filteredLines = visibleLines.includes('T1') || visibleLines.includes('T5') || visibleLines.includes('T4') || visibleLines.includes('T2') ? 
    [tramLineT5, tramLine, tramLineT4, tramLineT2].filter(line => visibleLines.includes(line.id)) : [];
  const shouldShowMarkers = currentZoom >= 15; // Markers visible from zoom level 1548.669879, 6.206965

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
              
              {/* Section élargie de la ligne T5 entre Vélodrome et Garenne - Saurupt + section droite */}
              {line.id === 'T5' && (
                <Polyline
                  positions={[
                    [48.666478, 6.166306], // Point intermédiaire
                    [48.668397, 6.168561], // Montet Octroi (partagé avec T1)
                    [48.671964, 6.172453], // ARTEM - Blandan - Thermal (partagé avec T1)
                    [48.675217, 6.176070], // Exelmans (partagé avec T1)
                    [48.678672, 6.179993], // Point intermédiaire
                    [48.678827, 6.180074], // Point intermédiaire
                    [48.679197, 6.180481], // Jean Jaurès (nouveau point T5)
                    [48.681798, 6.183409], // Garenne - Saurupt
                    [48.683524, 6.185382], // Pichon Direction Sud
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
                    [48.690849, 6.174509], // Tour Thiers Gare Direction Nord
                    [48.690030, 6.171810], // Point intermédiaire
                  ]}
                  color={line.color}
                  weight={2}
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
            <Popup offset={[0, -10]}>
              <div className="bus-stop-popup">
                <h3>{stop.name}</h3>
                {stop.lines.sort((a, b) => a.id.localeCompare(b.id)).map((line, lineIndex) => (
                  <div key={`${line.id}-${lineIndex}`} style={{ marginBottom: lineIndex < stop.lines.length - 1 ? '12px' : '0' }}>
                <p className="line-info">
                  <span className="line-name" style={{ color: line.color }}>
                    {line.name}
                  </span>
                  <br />
                  <small>{line.description}</small>
                </p>
                    {/* Gérer les deux types de structure */}
                    {line.googleMapsUrl ? (
                      // Structure simple avec un seul lien
                      <button 
                        className="schedule-button"
                        style={{ backgroundColor: line.color }}
                        onClick={async () => {
                          if (Capacitor.isNativePlatform()) {
                            try {
                              await Browser.open({ url: line.googleMapsUrl! });
                            } catch (error) {
                              console.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
                              window.open(line.googleMapsUrl!, '_blank');
                            }
                          } else {
                            window.open(line.googleMapsUrl!, '_blank');
                          }
                        }}
                      >
                        Voir les horaires {line.name}
                      </button>
                    ) : line.googleMapsUrls ? (
                      // Structure avec plusieurs liens selon la direction
                      line.googleMapsUrls.map((link, linkIndex) => (
                        <button 
                          key={linkIndex}
                          className="schedule-button"
                          style={{ 
                            backgroundColor: line.color,
                            marginBottom: linkIndex < line.googleMapsUrls!.length - 1 ? '8px' : '0'
                          }}
                          onClick={async () => {
                            if (Capacitor.isNativePlatform()) {
                              try {
                                await Browser.open({ url: link.url });
                              } catch (error) {
                                console.error('Erreur lors de l\'ouverture dans le navigateur natif:', error);
                                window.open(link.url, '_blank');
                              }
                            } else {
                              window.open(link.url, '_blank');
                            }
                          }}
                        >
                          {link.direction}
                        </button>
                      ))
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
