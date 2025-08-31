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
  name: 'T1',
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
      googleMapsUrl: 'https://www.google.fr/maps/place/Vandoeuvre+Brabois+-+H./@48.6493121,6.1463284,19.94z/data=!4m8!3m7!1s0x4794a211dc51595d:0xdefafe326cca9ba!6m1!1v4!8m2!3d48.64947!4d6.1464475!16s%2Fg%2F11mcbbvy0n?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
      name: 'Notre-Dame-des-Pauvres Direction Vandeouvre', 
      coords: [48.657364, 6.155514] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Notre-Dame-des-Pauvres/@48.6569281,6.1546025,17.86z/data=!4m8!3m7!1s0x4794a2748fa4eff3:0xe48f24141f628937!6m1!1v4!8m2!3d48.657397!4d6.155494!16s%2Fg%2F11x65jkk5f?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
      googleMapsUrl: 'https://www.google.fr/maps/place/Essey+Mouzimpr%C3%A9/@48.7020763,6.2218731,17.3z/data=!4m8!3m7!1s0x479499ce0675cf13:0x75f863b2e639a540!6m1!1v4!8m2!3d48.7017348!4d6.2248642!16s%2Fg%2F1tfcgpx6?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    }
  ]
};

// Nouvelle ligne T5 (violet)
const tramLineT5: TramLine = {
  id: 'T5',
  name: 'T5',
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
    [48.679197, 6.180481], // Jean Jaurès (nouveau point T5)
    [48.681695, 6.183273], // Garenne - Saurupt
    [48.683524, 6.185382], // Pichon Direction Vandeouvre
    [48.684524, 6.186486], // Pichon Direction Maxéville
  ] as [number, number][],
  // Tracé direction Vandeouvre Roberval (gauche)
  coordinatesVandeouvre: [
    [48.683524, 6.185382], // Pichon Direction Vandeouvre
    [48.684081, 6.185994], // Point intermédiaire
    [48.686100, 6.184457], // Quartier Saint-Nicolas Direction Vandeouvre
    [48.689066, 6.182293], // Place Charles III - Point Central Direction Vandeouvre
    [48.690898, 6.180990], // Place Stanislas - Dom Calmet Direction Vandeouvre
    [48.692093, 6.180120], // Point intermédiaire
    [48.691505, 6.178297], // Point intermédiaire
    [48.691577, 6.178123], // Point intermédiaire
    [48.692224, 6.177389], // Point intermédiaire
    [48.692857, 6.177022], // Place Carnot Direction Vandeouvre
    [48.696276, 6.174582], // Baron Louis Direction Vandeouvre
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
    [48.684524, 6.186486], // Pichon Direction Maxéville
    [48.685037, 6.187112], // Point intermédiaire
    [48.685269, 6.186691], // Point intermédiaire
    [48.685322, 6.186466], // Point intermédiaire
    [48.685567, 6.186148], // Point intermédiaire
    [48.685809, 6.186139], // Point intermédiaire
    [48.687646, 6.184797], // Quartier Saint-Nicolas Direction Maxéville
    [48.689725, 6.183256], // Place Charles III - Point Central Direction Maxéville
    [48.692003, 6.181538], // Place Stanislas - Dom Calmet Direction Maxéville
    [48.693032, 6.180786], // Amerval Direction Maxéville
    [48.693647, 6.180346], // Point intermédiaire
    [48.694244, 6.180079], // Point intermédiaire
    [48.693691, 6.178054], // Point intermédiaire
    [48.694287, 6.177591], // Place Carnot Direction Maxéville
    [48.695966, 6.176390], // Cours Léopold Direction Maxéville
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
      coords: [48.681695, 6.183273] as [number, number],
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
      name: 'Pichon Direction Vandeouvre', 
      coords: [48.683524, 6.185382] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Pichon/@48.6836145,6.1848552,18.94z/data=!4m8!3m7!1s0x479498661c6127ad:0x628714adcce75c9d!6m1!1v5!8m2!3d48.6835659!4d6.1853214!16s%2Fg%2F11c5_sp57d?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Pichon Direction Maxéville', 
      coords: [48.684524, 6.186486] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Pichon/@48.6846137,6.1866506,20.04z/data=!4m8!3m7!1s0x479498689926ac21:0x9323d9ffe1f60327!6m1!1v5!8m2!3d48.684528!4d6.186583!16s%2Fg%2F11ddxfv337?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Vandeouvre', 
      coords: [48.686100, 6.184457] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6862201,6.1841763,19.56z/data=!4m8!3m7!1s0x4794986f2f073daf:0x2ab9dc3c891c1237!6m1!1v5!8m2!3d48.686092!4d6.184456!16s%2Fg%2F11c2p8c3vt?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Quartier Saint-Nicolas Direction Maxéville', 
      coords: [48.687646, 6.184797] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Quartier+Saint-Nicolas/@48.6866564,6.1842266,17.42z/data=!4m8!3m7!1s0x4794986ec96758e7:0xfa2c06d1f65cceb6!6m1!1v5!8m2!3d48.6876289!4d6.1848987!16s%2Fg%2F11ddxjzmlr?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Charles III - Point Central Direction Vandeouvre', 
      coords: [48.689066, 6.182293] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.6891846,6.1821947,19.78z/data=!4m8!3m7!1s0x4794986e7eb595e9:0xda0c16e2a93099a7!6m1!1v5!8m2!3d48.688946!4d6.182275!16s%2Fg%2F11fn25wfc0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Charles III - Point Central Direction Maxéville', 
      coords: [48.689725, 6.183256] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Charles+III+-+Point+Central/@48.689738,6.1830833,19.97z/data=!4m8!3m7!1s0x4794986c2fa416d3:0x6ce0accf3d312599!6m1!1v5!8m2!3d48.6897402!4d6.1833435!16s%2Fg%2F11c2p3qxvd?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Vandeouvre', 
      coords: [48.690898, 6.180990] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6912296,6.1809476,18.58z/data=!4m8!3m7!1s0x4794986d91c5c17f:0xc037e67b6cef6764!6m1!1v5!8m2!3d48.690914!4d6.180878!16s%2Fg%2F11ddxp_qxw?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Stanislas - Dom Calmet Direction Maxéville', 
      coords: [48.692003, 6.181538] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Stanislas+-+Dom+Calmet/@48.6918028,6.1814784,19.26z/data=!4m8!3m7!1s0x4794986d748e8975:0xbf7155ff4d7abc40!6m1!1v5!8m2!3d48.6920566!4d6.1816469!16s%2Fg%2F11c5_sr0nc?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Amerval Direction Maxéville', 
      coords: [48.693032, 6.180786] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Amerval/@48.6932385,6.1801501,18.58z/data=!4m8!3m7!1s0x47949872a7fb8c3d:0x2fc05741d9b87456!6m1!1v5!8m2!3d48.693569!4d6.180514!16s%2Fg%2F11xd8npp76?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Carnot Direction Vandeouvre', 
      coords: [48.692857, 6.177022] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Carnot/@48.6928988,6.1767242,106m/data=!3m1!1e3!4m8!3m7!1s0x479498731a2a9961:0xbcdffd07b687597a!6m1!1v5!8m2!3d48.692944!4d6.176891!16s%2Fg%2F11ddxk93s2?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Place Carnot Direction Maxéville', 
      coords: [48.694287, 6.177591] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Place+Carnot/@48.6941543,6.1775592,108m/data=!3m1!1e3!4m8!3m7!1s0x479498732b08c373:0x3ff782a04d555c15!6m1!1v5!8m2!3d48.694336!4d6.177522!16s%2Fg%2F11h_1l5qx0?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
    },
    { 
      name: 'Cours Léopold Direction Maxéville', 
      coords: [48.695966, 6.176390] as [number, number],
      googleMapsUrl: 'https://www.google.fr/maps/place/Cours+L%C3%A9opold/@48.6957998,6.1763331,117m/data=!3m1!1e3!4m8!3m7!1s0x4794980c94e54fdd:0x5577aac67f547917!6m1!1v5!8m2!3d48.6960099!4d6.1764502!16s%2Fg%2F11ddxfh9gg?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D'
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
}

interface BusLinesProps {
  visibleLines: string[];
}

const BusLines: React.FC<BusLinesProps> = ({ visibleLines }) => {
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14); // Initial zoom level

  const filteredLines = visibleLines.includes('T1') || visibleLines.includes('T5') ? 
    [tramLineT5, tramLine].filter(line => visibleLines.includes(line.id)) : [];
  const shouldShowMarkers = currentZoom >= 14; // Markers visible from zoom level 14

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
                  ]}
                  color={line.color}
                  weight={6}
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
