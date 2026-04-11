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
import { DEFAULT_HOTELS } from '../data/defaultHotels';
import { DEFAULT_RESTAURANTS } from '../data/defaultRestaurants';
import { DEFAULT_PARTIES } from '../data/defaultParties';
import './PlanningFilesPage.css';

const HOTELS = DEFAULT_HOTELS.map((h) => ({ id: h.id, name: h.name }));
const RESTAURANTS = DEFAULT_RESTAURANTS.map((r) => ({ id: r.id, name: r.name }));
const PARTIES = DEFAULT_PARTIES.map((p) => ({
  id: p.id,
  name: p.name,
  sport: p.sport,
  description: p.description
}));

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
    { value: 'all', label: 'Tous les fichiers' },
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
      // Le 2e filtre est masqué en HSE, mais on le garde pour cohérence.
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
        // Sur iOS, ajouter moins d'espace pour redescendre les filtres
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        // La page n'affiche qu'une seule ligne de filtre.
        const extraSpace = isIOS ? 8 : 4;
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
  }, [eventType, isPageLoading]);

  // Effet spécifique pour forcer le recalcul sur iOS avec MutationObserver
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS && !isPageLoading) {
      const forceRecalculate = () => {
        const filtersElement = document.getElementById('filters-container');
        if (filtersElement) {
          const height = filtersElement.offsetHeight;
          const newHeight = height + 8;
          setFiltersHeight(newHeight);
          
          // Forcer le style directement avec !important
          const planningPage = document.querySelector('.planning-files-page') as HTMLElement;
          if (planningPage) {
            planningPage.style.setProperty('padding-top', `${newHeight + 10}px`, 'important');
            // Forcer le reflow
            void planningPage.offsetHeight;
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
  }, [eventType, isPageLoading]);

  // Barre de chargement d'upload globale
  const uploadBar = uploading ? (
    <div
      className="upload-progress-bar"
      style={{ '--upload-progress': `${uploadProgress}%` } as React.CSSProperties}
    >
      <div className="upload-progress-bar__title">Upload en cours...</div>
      <div className="upload-progress-bar__track">
        <div className="upload-progress-bar__fill" />
      </div>
      <div className="upload-progress-bar__percent">{Math.round(uploadProgress)}%</div>
      <div className="upload-progress-bar__hint">
        {uploadProgress < 100 ? 'Téléchargement du fichier...' : "Finalisation de l'upload..."}
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

  // Aligné sur la 2e ligne de filtres (voir commentaire « 2e ligne masquée ») — utilisé par PlanningFiles.css pour .files-list max-height
  const hasTwoFilters = eventType !== 'all' && eventType !== 'hse';

  // Détection iOS pour ajuster le padding
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return (
    <div 
      className={`page-content scrollable planning-files-page ${isPageLoading ? 'loading' : 'loaded'}`}
      style={{
        paddingTop: isIOS ? `${filtersHeight + 4}px` : `${filtersHeight + 8}px`
      }}>
      {uploadBar}

      {/* Système de filtres en cascade - Utilise les classes CSS */}
      <div 
        id="filters-container" 
        className="filters-container"
      >
          <div className="filter-group">
            <label className="filter-label">
              Type de fichier :
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

          {/* 2e ligne masquée uniquement pour HSE et "tous" */}
          {eventType !== 'all' && eventType !== 'hse' && (
            <div className="filter-group">
              <label className="filter-label">
                {eventType === 'sports'
                  ? 'Sport :'
                  : eventType === 'party'
                    ? 'Soirée :'
                    : eventType === 'restaurants'
                      ? 'Restaurant :'
                      : eventType === 'hotel'
                        ? 'Hôtel :'
                        : 'Spécifique :'}
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
        className={[
          'planning-container',
          isAdmin && isEditing ? 'is-editing' : '',
          hasTwoFilters ? 'has-two-filters' : '',
          isPageLoading ? 'is-page-loading' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <PlanningFiles 
          isAdmin={isAdmin && isEditing} 
          filter={
            eventType === 'all'
              ? 'all'
              : eventType === 'hse'
                ? 'hse'
                : specificEvent === 'all'
                  ? eventType
                  : specificEvent
          }
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
