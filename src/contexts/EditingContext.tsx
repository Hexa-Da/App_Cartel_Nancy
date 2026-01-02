/**
 * @fileoverview Contexte de gestion du mode édition
 * 
 * Ce contexte gère :
 * - L'état du mode édition pour les administrateurs
 * - La persistance de l'état dans localStorage
 * - La désactivation automatique lors de la déconnexion admin
 * 
 * Nécessaire car :
 * - Centralise la logique du mode édition
 * - Évite le prop drilling pour isEditing
 * - Gère la persistance et la synchronisation avec l'état admin
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface EditingContextType {
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

export const EditingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isEditing, setIsEditing] = useState(() => {
    // Récupérer l'état depuis localStorage au chargement
    const saved = localStorage.getItem('isEditing');
    return saved ? JSON.parse(saved) : false;
  });

  // Sauvegarder l'état isEditing dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('isEditing', JSON.stringify(isEditing));
  }, [isEditing]);

  // Écouter les changements d'état admin et désactiver isEditing si l'admin se déconnecte
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAdmin' && e.newValue !== 'true') {
        // Si l'admin se déconnecte, désactiver le mode édition
        setIsEditing(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setIsEditing]);

  return (
    <EditingContext.Provider value={{ isEditing, setIsEditing }}>
      {children}
    </EditingContext.Provider>
  );
};

export const useEditing = () => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error('useEditing must be used within an EditingProvider');
  }
  return context;
};

