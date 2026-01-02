/**
 * @fileoverview Contexte de navigation pour gérer l'onglet actif
 * 
 * Ce contexte gère :
 * - L'onglet actif dans l'application (map, events, chat, planning, calendar, etc.)
 * - La navigation entre les différentes sections
 * 
 * Nécessaire car :
 * - Centralise la logique de navigation
 * - Évite le prop drilling pour activeTab
 * - Permet une gestion cohérente de la navigation
 */

import React, { createContext, useContext, useState } from 'react';

export type TabType = 'map' | 'events' | 'chat' | 'planning' | 'calendar' | 'home' | 'info' | 'party-map';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('map');

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

