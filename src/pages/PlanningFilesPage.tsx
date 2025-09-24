/**
 * @fileoverview Page dédiée pour l'affichage des plannings
 * 
 * Cette page gère :
 * - Affichage des plannings filtrés par catégorie (sports, restaurants, bus)
 * - Interface admin pour la gestion des plannings
 * - Navigation avec paramètres URL pour les filtres
 * - Consultation et téléchargement des plannings
 * 
 * Nécessaire car :
 * - Centralise l'accès aux plannings
 * - Permet un filtrage direct par URL
 * - Interface dédiée pour la gestion des plannings
 * - Séparation claire des fonctionnalités
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlanningFiles from '../components/PlanningFiles';
import { useApp } from '../AppContext';
import { useAppPanels } from '../AppPanelsContext';
import './PlanningFilesPage.css';

const PlanningFilesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [eventType, setEventType] = useState<string>('all');
  const [specificEvent, setSpecificEvent] = useState<string>('all');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);
  const [filtersHeight, setFiltersHeight] = useState<number>(80);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Wrapper pour setUploading
  const handleSetUploading = (value: boolean) => {
    setUploading(value);
  };
  
  // Wrapper pour setUploadProgress
  const handleSetUploadProgress = (value: number) => {
    setUploadProgress(value);
  };
  const { isAdmin } = useApp();
  const { isEditing } = useAppPanels();

  // Déterminer le filtre initial basé sur les paramètres URL
  useEffect(() => {
    if (searchParams.get('sports') === 'true') {
      setEventType('sports');
    } else if (searchParams.get('restaurants') === 'true') {
      setEventType('restaurants');
    } else if (searchParams.get('bus') === 'true') {
      setEventType('party');
    }
  }, [searchParams]);

  // Options pour les types d'événements
  const eventTypeOptions = [
    { value: 'all', label: 'Tous les événements' },
    { value: 'sports', label: 'Sports' },
    { value: 'party', label: 'Soirées' },
    { value: 'restaurants', label: 'Restaurants' },
    { value: 'bus', label: 'Transport' },
    { value: 'hotel', label: 'Hôtels' }
  ];

  // Options spécifiques selon le type d'événement
  const getSpecificOptions = (type: string) => {
    switch (type) {
      case 'sports':
        return [
          { value: 'all', label: 'Tous les sports' },
          { value: 'Football', label: 'Football ⚽' },
          { value: 'Basketball', label: 'Basketball 🏀' },
          { value: 'Handball', label: 'Handball 🤾' },
          { value: 'Rugby', label: 'Rugby 🏉' },
          { value: 'Ultimate', label: 'Ultimate 🥏' },
          { value: 'Natation', label: 'Natation 🏊' },
          { value: 'Badminton', label: 'Badminton 🏸' },
          { value: 'Tennis', label: 'Tennis 🎾' },
          { value: 'Cross', label: 'Cross 🏃' },
          { value: 'Volleyball', label: 'Volleyball 🏐' },
          { value: 'Ping-pong', label: 'Ping-pong 🏓' },
          { value: 'Boxe', label: 'Boxe 🥊' },
          { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
          { value: 'Pétanque', label: 'Pétanque 🍹' },
          { value: 'Escalade', label: 'Escalade 🧗‍♂️' },
          { value: 'Jeux de société', label: 'Jeux de société 🎲' },
          { value: 'Pompom', label: 'Pompom 🎀' },
          { value: 'Defile', label: 'Défilé 🎺' }
        ];
      case 'party':
        return [
          { value: 'all', label: 'Toutes les soirées' },
          { value: 'jeudi', label: 'Soirée du jeudi' },
          { value: 'vendredi', label: 'Soirée du vendredi' },
          { value: 'samedi', label: 'Soirée du samedi - Gala' },
          { value: 'navettes', label: 'Infos navettes' }
        ];
      case 'restaurants':
        return [
          { value: 'all', label: 'Tous les restaurants' },
          { value: 'crous', label: 'CROUS' },
          { value: 'artem', label: 'Artem' },
          { value: 'autres', label: 'Autres restaurants' }
        ];
      case 'bus':
        return [
          { value: 'all', label: 'Tous les transports' },
          { value: 'zenith', label: 'Bus Zénith' },
          { value: 'retour', label: 'Bus de retour' },
          { value: 'navettes', label: 'Navettes' }
        ];
      case 'hotel':
        return [
          { value: 'all', label: 'Tous les hôtels' },
          { value: 'localisation', label: 'Localisation' },
          { value: 'horaires', label: 'Horaires réception' },
          { value: 'services', label: 'Services disponibles' }
        ];
      default:
        return [{ value: 'all', label: 'Tous' }];
    }
  };

  // Réinitialiser le filtre spécifique quand le type change
  useEffect(() => {
    setSpecificEvent('all');
  }, [eventType]);

  // Simulation du chargement de la page
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800); // Chargement de 800ms

    return () => clearTimeout(timer);
  }, []);

  // Calculer la hauteur des filtres dynamiquement avec gestion iOS robuste
  useEffect(() => {
    const calculateFiltersHeight = () => {
      const filtersElement = document.getElementById('filters-container');
      if (filtersElement) {
        const height = filtersElement.offsetHeight;
        const isSingleLine = eventType === 'all';
        // Sur iOS, ajouter plus d'espace pour éviter le chevauchement
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const extraSpace = isIOS ? 60 : (isSingleLine ? 5 : 10);
        const newHeight = height + extraSpace;
        setFiltersHeight(newHeight);
        
        // Forcer le recalcul du style sur iOS
        if (isIOS) {
          const planningPage = document.querySelector('.planning-files-page') as HTMLElement;
          if (planningPage) {
            planningPage.style.paddingTop = `${newHeight + 40}px`;
          }
        }
      }
    };

    if (!isPageLoading) {
      // Calculer immédiatement
      calculateFiltersHeight();
      
      // Calculer avec plusieurs délais pour iOS
      const timer1 = setTimeout(calculateFiltersHeight, 50);
      const timer2 = setTimeout(calculateFiltersHeight, 150);
      const timer3 = setTimeout(calculateFiltersHeight, 300);
      const timer4 = setTimeout(calculateFiltersHeight, 500);
      const timer5 = setTimeout(calculateFiltersHeight, 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    }
  }, [eventType, specificEvent, isPageLoading]);

  // Effet spécifique pour forcer le recalcul sur iOS avec MutationObserver
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS && !isPageLoading) {
      const forceRecalculate = () => {
        const filtersElement = document.getElementById('filters-container');
        if (filtersElement) {
          const height = filtersElement.offsetHeight;
          const newHeight = height + 60;
          setFiltersHeight(newHeight);
          
          // Forcer le style directement avec !important
          const planningPage = document.querySelector('.planning-files-page') as HTMLElement;
          if (planningPage) {
            planningPage.style.setProperty('padding-top', `${newHeight + 40}px`, 'important');
            // Forcer le reflow
            planningPage.offsetHeight;
          }
        }
      };

      // Recalculer immédiatement
      forceRecalculate();
      
      // Recalculer avec plusieurs délais
      const timers = [
        setTimeout(forceRecalculate, 50),
        setTimeout(forceRecalculate, 150),
        setTimeout(forceRecalculate, 300),
        setTimeout(forceRecalculate, 500),
        setTimeout(forceRecalculate, 1000)
      ];

      // MutationObserver pour détecter les changements dans le DOM
      const observer = new MutationObserver(() => {
        forceRecalculate();
      });

      const filtersElement = document.getElementById('filters-container');
      if (filtersElement) {
        observer.observe(filtersElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }

      // Recalculer sur resize et orientation change
      window.addEventListener('resize', forceRecalculate);
      window.addEventListener('orientationchange', forceRecalculate);
      
      // Recalculer sur scroll (pour iOS)
      window.addEventListener('scroll', forceRecalculate, { passive: true });
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
        observer.disconnect();
        window.removeEventListener('resize', forceRecalculate);
        window.removeEventListener('orientationchange', forceRecalculate);
        window.removeEventListener('scroll', forceRecalculate);
      };
    }
  }, [eventType, specificEvent, isPageLoading]);

  // Barre de chargement d'upload globale
  const uploadBar = uploading ? (
    <div 
      className="upload-progress-bar"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        background: 'rgba(20,20,20,0.95)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'all 0.3s',
        borderRadius: '12px',
        border: '2px solid var(--accent-color)',
        minWidth: '300px',
        maxWidth: '500px',
      }}>
      <div style={{
        color: 'var(--accent-color)',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        Upload en cours...
      </div>
      <div style={{
        width: '100%',
        height: '16px',
        background: '#333',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '10px',
      }}>
        <div style={{
          width: `${uploadProgress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent-color), #4CAF50)',
          transition: 'width 0.3s ease',
          borderRadius: '8px',
        }}></div>
      </div>
      <div style={{
        color: 'var(--accent-color)',
        fontWeight: 'bold',
        fontSize: '1.3rem',
        marginBottom: '5px'
      }}>
        {Math.round(uploadProgress)}%
      </div>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        textAlign: 'center'
      }}>
        {uploadProgress < 100 ? 'Téléchargement du fichier...' : 'Finalisation de l\'upload...'}
      </div>
    </div>
  ) : null;

  // Indicateur de chargement intégré dans le layout
  const loadingIndicator = isPageLoading ? (
    <div className="page-loading-indicator">
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--border-color)',
        borderTop: '3px solid var(--accent-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div style={{
        color: 'var(--accent-color)',
        fontSize: '1rem',
        fontWeight: '600'
      }}>
        Chargement des plannings...
      </div>
    </div>
  ) : null;

  // Détection iOS pour ajuster le padding
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return (
    <div 
      className={`planning-files-page ${isPageLoading ? 'loading' : 'loaded'}`}
      style={{
        paddingTop: isIOS ? `${filtersHeight + 40}px` : `${filtersHeight + 20}px`
      }}>
      {uploadBar}
      {loadingIndicator}

      {/* Système de filtres en cascade - Utilise les classes CSS */}
      {!isPageLoading && (
        <div id="filters-container" className="filters-container">
          <div className="filter-group">
            <label className="filter-label">
              Type d'événement :
            </label>
            <select
              className="filter-select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {eventTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {eventType !== 'all' && (
            <div className="filter-group">
              <label className="filter-label">
                {eventType === 'sports' ? 'Sport :' :
                 eventType === 'party' ? 'Soirée :' :
                 eventType === 'restaurants' ? 'Restaurant :' :
                 eventType === 'bus' ? 'Transport :' :
                 eventType === 'hotel' ? 'Hôtel :' : 'Spécifique :'}
              </label>
              <select
                className="filter-select"
                value={specificEvent}
                onChange={(e) => setSpecificEvent(e.target.value)}
              >
                {getSpecificOptions(eventType).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Composant PlanningFiles avec filtre */}
      {!isPageLoading && (
        <div className="planning-container">
          <PlanningFiles 
            isAdmin={isAdmin && isEditing} 
            filter={eventType === 'all' ? 'all' : specificEvent === 'all' ? eventType : specificEvent}
            showFilterSelector={false}
            uploading={uploading}
            setUploading={handleSetUploading}
            uploadProgress={uploadProgress}
            setUploadProgress={handleSetUploadProgress}
          />
        </div>
      )}
    </div>
  );
};

export default PlanningFilesPage;
