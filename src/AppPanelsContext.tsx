import React, { createContext, useContext, useState } from 'react';

export type TabType = 'map' | 'events' | 'chat' | 'planning' | 'calendar';

interface AppPanelsContextType {
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  showAddMessage: boolean;
  setShowAddMessage: React.Dispatch<React.SetStateAction<boolean>>;
  showEmergency: boolean;
  setShowEmergency: React.Dispatch<React.SetStateAction<boolean>>;
  closeAllPanels: () => void;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppPanelsContext = createContext<AppPanelsContextType | undefined>(undefined);

export const AppPanelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const closeAllPanels = () => {
    setActiveTab('map');
    setShowAddMessage(false);
    setShowEmergency(false);
  };

  return (
    <AppPanelsContext.Provider value={{
      activeTab, setActiveTab,
      showAddMessage, setShowAddMessage,
      showEmergency, setShowEmergency,
      closeAllPanels,
      isEditing, setIsEditing
    }}>
      {children}
    </AppPanelsContext.Provider>
  );
};

export const useAppPanels = () => {
  const context = useContext(AppPanelsContext);
  if (!context) {
    throw new Error('useAppPanels must be used within an AppPanelsProvider');
  }
  return context;
}; 