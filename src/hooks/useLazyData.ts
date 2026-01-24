/**
 * @fileoverview Hook personnalisé pour le chargement paresseux des données
 * 
 * Ce hook gère :
 * - Chargement différé des données basé sur des conditions
 * - Optimisation des performances en évitant les chargements inutiles
 * - Gestion des états de chargement et d'erreur
 * - Rechargement conditionnel selon les dépendances
 * 
 * Nécessaire car :
 * - Optimise les performances de l'application
 * - Évite les requêtes inutiles à Firebase
 * - Centralise la logique de chargement paresseux
 * - Réutilisable dans différents composants
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLazyDataOptions {
  threshold?: number;
  delay?: number;
  enabled?: boolean;
}

interface UseLazyDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  loadData: () => void;
  isLoaded: boolean;
}

export function useLazyData<T>(
  dataLoader: () => Promise<T>,
  options: UseLazyDataOptions = {}
): UseLazyDataReturn<T> {
  const {
    delay = 0,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled || isLoading || isLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await dataLoader();
      setData(result);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dataLoader, enabled, isLoading, isLoaded]);

  const loadDataWithDelay = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      loadData();
    }, delay);
  }, [loadData, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    loadData: loadDataWithDelay,
    isLoaded
  };
}

// Hook spécialisé pour le chargement basé sur le zoom
export function useZoomBasedLoading<T>(
  dataLoader: () => Promise<T>,
  currentZoom: number,
  zoomThreshold: number = 15,
  options: Omit<UseLazyDataOptions, 'enabled'> = {}
) {
  const enabled = currentZoom >= zoomThreshold;
  
  return useLazyData(dataLoader, {
    ...options,
    enabled
  });
}

// Hook pour le chargement par pagination
export function usePaginatedData<T>(
  dataLoader: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>,
  limit: number = 20
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const loadPage = useCallback(async (page: number) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await dataLoader(page, limit);
      
      if (page === 0) {
        setData(result.data);
      } else {
        setData(prev => [...prev, ...result.data]);
      }
      
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [dataLoader, limit, isLoading]);

  const loadNextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      loadPage(currentPage + 1);
    }
  }, [hasMore, isLoading, currentPage, loadPage]);

  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(0);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadNextPage,
    loadPage,
    reset
  };
}
