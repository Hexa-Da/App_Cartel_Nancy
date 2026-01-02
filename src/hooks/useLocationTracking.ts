/**
 * @fileoverview Hook personnalisé pour gérer la géolocalisation
 * 
 * Ce hook centralise la logique de géolocalisation :
 * - Demande et suivi de la position de l'utilisateur
 * - Gestion des erreurs de géolocalisation
 * - Support Capacitor (mobile) et Web
 * - Synchronisation avec localStorage
 * 
 * Nécessaire car :
 * - Sépare la logique de géolocalisation du composant
 * - Facilite la réutilisation et les tests
 * - Améliore la lisibilité du code
 */

import { useState, useEffect, useRef } from 'react';
import { LatLng } from 'leaflet';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import NotificationService from '../services/NotificationService';

export const useLocationTracking = () => {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastErrorTime = useRef<number>(0);
  const watchIdRef = useRef<string | number | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(() => {
    const stored = localStorage.getItem('location');
    return stored === null ? true : stored === 'true';
  });

  const handleLocationError = (err: any) => {
    console.error('Erreur de géolocalisation:', err);
    const now = Date.now();
    if (now - lastErrorTime.current < 3000) return;
    lastErrorTime.current = now;

    let errorMessage = "Erreur de géolocalisation";
    if (err.message?.includes('permission') || err.code === 1) {
      errorMessage = "L'accès à la géolocalisation a été refusé. Veuillez autoriser l'accès dans les paramètres.";
    } else if (err.message?.includes('unavailable') || err.code === 2) {
      errorMessage = "La position n'est pas disponible. Vérifiez que la géolocalisation est activée.";
    } else if (err.message?.includes('timeout') || err.code === 3) {
      errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
    }
    setError(errorMessage);
  };

  const requestLocation = async () => {
    if (!isLocationEnabled) return;

    try {
      setIsLoading(true);
      
      if (Capacitor.isNativePlatform()) {
        // Utiliser l'API Capacitor pour mobile
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        
        const newPosition = new LatLng(coordinates.coords.latitude, coordinates.coords.longitude);
        setPosition(newPosition);
        setError(null);
        setIsLoading(false);
      } else {
        // Utiliser l'API Web standard pour le navigateur
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
            setPosition(newPosition);
            setError(null);
            setIsLoading(false);
          },
          (error) => {
            handleLocationError(error);
            setIsLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    } catch (err: any) {
      handleLocationError(err);
      setIsLoading(false);
    }
  };

  // Écouter les changements de l'état de localisation
  useEffect(() => {
    // Initialiser le service de notifications au démarrage
    const initNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des notifications:', error);
      }
    };
    
    initNotifications();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'location') {
        const newValue = e.newValue === 'true';
        setIsLocationEnabled(newValue);
        if (!newValue) {
          setPosition(null);
          setError(null);
        } else {
          requestLocation();
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

    requestLocation();

    // Surveiller la position
    if (Capacitor.isNativePlatform()) {
      // Utiliser l'API Capacitor pour mobile
      Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000
      }, (position: Position | null) => {
        if (position) {
          const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
          setPosition(newPosition);
          setError(null);
        }
      }).then((watchId) => {
        watchIdRef.current = watchId;
      });
    } else {
      // Utiliser l'API Web standard pour le navigateur
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = new LatLng(position.coords.latitude, position.coords.longitude);
          setPosition(newPosition);
          setError(null);
        },
        (error) => {
          handleLocationError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      watchIdRef.current = watchId;
    }

    return () => {
      if (watchIdRef.current) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current as string });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
      }
    };
  }, [isLocationEnabled]);

  const disableLocation = () => {
    setError(null);
    setIsLocationEnabled(false);
    localStorage.setItem('location', 'false');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'location',
      newValue: 'false',
      oldValue: 'true',
      storageArea: localStorage
    }));
  };

  return {
    position,
    error,
    isLoading,
    isLocationEnabled,
    requestLocation,
    disableLocation
  };
};

