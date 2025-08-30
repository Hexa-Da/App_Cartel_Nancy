import React, { useState, useEffect } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
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
const tramLine = {
  id: 'T1',
  name: 'Ligne T1',
  description: 'Vandeouvre CHU Brabois - Essey Mouzimpré',
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
      name: 'Notre-Dame-des-Pauvres', 
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
      name: 'Jean Jaurès', 
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

interface BusLinesProps {
  visibleLines: string[];
}

const BusLines: React.FC<BusLinesProps> = ({ visibleLines }) => {
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Filtrer les lignes visibles (maintenant seulement T1)
  const filteredLines = visibleLines.includes('T1') ? [tramLine] : [];

  // Déterminer si les marqueurs doivent être visibles
  const shouldShowMarkers = currentZoom >= 14;

  return (
    <>
      {/* Contrôleur de zoom */}
      <ZoomController onZoomChange={setCurrentZoom} />
      
      {/* Afficher les tracés des lignes */}
      {filteredLines.map(line => (
        <Polyline
          key={line.id}
          positions={line.coordinates}
          color={line.color}
          weight={4}
          opacity={0.8}
        />
      ))}

      {/* Afficher les arrêts seulement si le zoom est suffisant */}
      {shouldShowMarkers && filteredLines.map(line => 
        line.stops.map(stop => (
          <Marker
            key={`${line.id}-${stop.name}`}
            position={stop.coords}
            icon={tramStopIcon}
            eventHandlers={{
              click: () => setSelectedStop(`${line.id}-${stop.name}`)
            }}
          >
            <Popup offset={[0, -10]}>
              <div className="bus-stop-popup">
                <h3>{stop.name}</h3>
                <p className="line-info">
                  <span className="line-name" style={{ color: line.color }}>
                    {line.name}
                  </span>
                  <br />
                  <small>{line.description}</small>
                </p>
                
                <button 
                  className="schedule-button"
                  onClick={() => {
                    window.open(stop.googleMapsUrl, '_blank');
                  }}
                >
                  Voir les horaires
                </button>
              </div>
            </Popup>
          </Marker>
        ))
      )}
    </>
  );
};

export default BusLines;
