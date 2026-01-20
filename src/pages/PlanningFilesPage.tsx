/**
 * @fileoverview Page dédiée pour l'affichage des fichiers
 * 
 * Cette page gère :
 * - Affichage des fichiers filtrés par catégorie (sports, restaurants, bus)
 * - Interface admin pour la gestion des fichiers
 * - Navigation avec paramètres URL pour les filtres
 * - Consultation et téléchargement des fichiers
 * 
 * Nécessaire car :
 * - Centralise l'accès aux fichiers
 * - Permet un filtrage direct par URL
 * - Interface dédiée pour la gestion des fichiers
 * - Séparation claire des fonctionnalités
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlanningFiles from '../components/PlanningFiles';
import { useApp } from '../AppContext';
import { useEditing } from '../contexts/EditingContext';
import { MODAL_SIZES } from '../config/responsive';
import './PlanningFilesPage.css';

// Données hardcodées des hôtels (synchronisées avec App.tsx)
const HOTELS = [
  { id: '1', name: "Ibis Styles Nancy Sud" },
  { id: '2', name: "Nemea Home Suite Nancy Centre" },
  { id: '3', name: "Nemea Grand Coeur Nancy Centre" },
  { id: '4', name: "Hotel Ibis Nancy Brabois" },
  { id: '5', name: "Hotel Residome Nancy" },
  { id: '6', name: "Ibis Budget Nancy Laxou" },
  { id: '7', name: "Hotel Revotel Nancy Centre" },
  { id: '8', name: "Hotel Cerise Nancy" }
];

// Données hardcodées des restaurants (synchronisées avec App.tsx)
const RESTAURANTS = [
  { id: '1', name: "Crous ARTEM" },
  { id: '2', name: "Parc Saint-Marie" }
];

// Données hardcodées des soirées (synchronisées avec App.tsx)
const PARTIES = [
  { id: '1', name: "Place Stanislas", sport: 'Defile', description: "Défilé" },
  { id: '2', name: "Parc Expo - Pompoms", sport: 'Pompom', description: "Soirée Pompoms" },
  { id: '3', name: "Parc Expo - Showcase", sport: 'Party', description: "Soirée Showcase" },
  { id: '4', name: "Zénith - DJ Contest", sport: 'Party', description: "Soirée DJ Contest" }
];

// Sports disponibles (synchronisés avec PlanningFiles.tsx)
const SPORTS = [
  { value: 'Football', label: 'Football ⚽' },
  { value: 'Basketball', label: 'Basketball 🏀' },
  { value: 'Handball', label: 'Handball 🤾' },
  { value: 'Rugby', label: 'Rugby 🏉' },
  { value: 'Ultimate', label: 'Ultimate 🥏' },
  { value: 'Natation', label: 'Natation 🏊' },
  { value: 'Badminton', label: 'Badminton 🏸' },
  { value: 'Tennis', label: 'Tennis 🎾' },
  { value: 'Cross', label: 'Cross 👟' },
  { value: 'Volleyball', label: 'Volleyball 🏐' },
  { value: 'Ping-pong', label: 'Ping-pong 🏓' },
  { value: 'Echecs', label: 'Echecs ♟️' },
  { value: 'Athlétisme', label: 'Athlétisme 🏃‍♂️' },
  { value: 'Spikeball', label: 'Spikeball ⚡️' },
  { value: 'Pétanque', label: 'Pétanque 🍹' },
  { value: 'Escalade', label: 'Escalade 🧗‍♂️' }
];

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
  const { isEditing } = useEditing();

  // Déterminer le filtre initial basé sur les paramètres URL
  useEffect(() => {
    if (searchParams.get('all') === 'true') {
      setEventType('all');
    } else if (searchParams.get('sports') === 'true') {
      setEventType('sports');
    } else if (searchParams.get('restaurants') === 'true') {
      setEventType('restaurants');
    } else if (searchParams.get('hotel') === 'true') {
      setEventType('hotel');
    } else if (searchParams.get('party') === 'true') {
      setEventType('party');
    } else if (searchParams.get('hse') === 'true') {
      setEventType('hse');
    }
  }, [searchParams]);

  // Options pour les types d'événements
  const eventTypeOptions = [
    { value: 'all', label: 'Tous les événements' },
    { value: 'sports', label: 'Sports' },
    { value: 'party', label: 'Soirées/Défilé' },
    { value: 'restaurants', label: 'Restaurants' },
    { value: 'hotel', label: 'Hôtels' },
    { value: 'hse', label: 'HSE' }
  ];

  // Options spécifiques selon le type d'événement
  const getSpecificOptions = (type: string) => {
    switch (type) {
      case 'sports':
        return [
          { value: 'all', label: 'Tous les sports' },
          ...SPORTS
        ];
      case 'party':
        return [
          { value: 'all', label: 'Toutes les soirées/défilé' },
          ...PARTIES.map(party => ({
            value: party.id,
            label: `${party.name} ${party.sport === 'Defile' ? '🎺' : party.sport === 'Pompom' ? '🎀' : party.description?.includes('DJ Contest') ? '🎧' : party.description?.includes('Showcase') ? '🎤' : '🎉'}`
          }))
        ];
      case 'restaurants':
        return [
          { value: 'all', label: 'Tous les restaurants' },
          ...RESTAURANTS.map(restaurant => ({
            value: restaurant.id,
            label: `${restaurant.name}`
          }))
        ];
      case 'hotel':
        return [
          { value: 'all', label: 'Tous les hôtels' },
          ...HOTELS.map(hotel => ({
            value: hotel.id,
            label: `${hotel.name}`
          }))
        ];
      case 'hse':
        return [
          { value: 'all', label: 'Tous les fichiers HSE' },
          { value: 'HSE', label: 'HSE' }
        ];
      default:
        return [{ value: 'all', label: 'Tous' }];
    }
  };

  // Réinitialiser le filtre spécifique quand le type change
  useEffect(() => {
    setSpecificEvent('all');
  }, [eventType]);

  // Callback pour gérer le chargement des données depuis PlanningFiles
  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsPageLoading(loading);
  }, []);

  // Calculer la hauteur des filtres dynamiquement avec gestion iOS robuste
  useEffect(() => {
    const calculateFiltersHeight = () => {
      const filtersElement = document.getElementById('filters-container');
      if (filtersElement) {
        const height = filtersElement.offsetHeight;
        const isSingleLine = eventType === 'all';
        // Sur iOS, ajouter moins d'espace pour redescendre les filtres
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const extraSpace = isIOS ? 20 : (isSingleLine ? 5 : 10);
        const newHeight = height + extraSpace;
        setFiltersHeight(newHeight);
        
        // Forcer le recalcul du style sur iOS
        if (isIOS) {
          const planningPage = document.querySelector('.planning-files-page') as HTMLElement;
          if (planningPage) {
            planningPage.style.paddingTop = `${newHeight + 10}px`;
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
          const newHeight = height + 20;
          setFiltersHeight(newHeight);
          
          // Forcer le style directement avec !important
          const planningPage = document.querySelector('.planning-files-page') as HTMLElement;
          if (planningPage) {
            planningPage.style.setProperty('padding-top', `${newHeight + 10}px`, 'important');
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
        maxWidth: MODAL_SIZES.medium,
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

  // Spinner de chargement affiché sous les filtres
  const loadingSpinner = isPageLoading ? (
    <div className="chat-loading-spinner-container">
      <div className="chat-loading-spinner"></div>
      <div className="chat-loading-text">Chargement des fichiers...</div>
    </div>
  ) : null;

  // Détection iOS pour ajuster le padding
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return (
    <div 
      className={`page-content scrollable planning-files-page ${isPageLoading ? 'loading' : 'loaded'}`}
      style={{
        paddingTop: isIOS ? `${filtersHeight + 10}px` : `${filtersHeight + 20}px`
      }}>
      {uploadBar}

      {/* Système de filtres en cascade - Utilise les classes CSS */}
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
                 eventType === 'hotel' ? 'Hôtel :' :
                 eventType === 'hse' ? 'HSE :' : 'Spécifique :'}
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

      {/* Spinner de chargement sous les filtres */}
      {loadingSpinner}

      {/* Composant PlanningFiles avec filtre */}
      <div 
        className={`planning-container ${isEditing ? 'is-editing' : ''}`}
        style={{ 
          opacity: isPageLoading ? 0 : 1,
          pointerEvents: isPageLoading ? 'none' : 'auto',
          transition: 'opacity 0.3s ease'
        }}
      >
        <PlanningFiles 
          isAdmin={isAdmin && isEditing} 
          filter={eventType === 'all' ? 'all' : specificEvent === 'all' ? eventType : specificEvent}
          showFilterSelector={false}
          uploading={uploading}
          setUploading={handleSetUploading}
          uploadProgress={uploadProgress}
          setUploadProgress={handleSetUploadProgress}
          hotels={HOTELS}
          restaurants={RESTAURANTS}
          parties={PARTIES}
          onLoadingChange={handleLoadingChange}
        />
      </div>
    </div>
  );
};

export default PlanningFilesPage;
