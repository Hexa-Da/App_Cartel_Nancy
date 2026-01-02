/**
 * @fileoverview Point d'entrée principal de l'application Cartel Nancy
 * 
 * Ce fichier configure et démarre l'application React avec :
 * - Le routing principal (React Router)
 * - Les contextes globaux (AppProvider, AppPanelsProvider)
 * - La structure des routes et pages
 * 
 * Nécessaire car :
 * - Centralise la configuration de l'application
 * - Définit la hiérarchie des routes
 * - Initialise les contextes partagés
 * - Point d'entrée unique pour React DOM
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Info from './pages/Info';
import InfoSection from './pages/InfoSection';
import PlanningFilesPage from './pages/PlanningFilesPage';
import Layout from './components/Layout';
import OrientationLock from './components/OrientationLock';
/* Import des fichiers de thème dans l'ordre : tokens, reset, platform */
import './theme/tokens.css';
import './theme/reset.css';
import './theme/platform/ios.css';
import './theme/platform/android.css';
import './index.css';
import { AppPanelsProvider } from './AppPanelsContext';
import { AppProvider } from './AppContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ModalProvider } from './contexts/ModalContext';
import { FormProvider } from './contexts/FormContext';
import { EditingProvider } from './contexts/EditingContext';
import { setupCapacitor } from './config/capacitor';

// Composant racine de l'application
const AppRoot = (
  <React.StrictMode>
    <OrientationLock />
    <AppProvider>
      <NavigationProvider>
        <ModalProvider>
          <FormProvider>
            <EditingProvider>
              <AppPanelsProvider>
                <Router>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route path="/home" element={<Home />} />
                      <Route path="/map" element={<App />} />
                      <Route path="/info" element={<Info />} />
                      <Route path="info/:sectionName" element={<InfoSection />} />
                      <Route path="/planning-files" element={<PlanningFilesPage />} />

                      <Route path="classement" element={<div>Classement</div>} />
                      <Route path="profil" element={<div>Profil</div>} />
                      <Route path="*" element={<Navigate to="/home" replace />} />
                    </Route>
                  </Routes>
                </Router>
              </AppPanelsProvider>
            </EditingProvider>
          </FormProvider>
        </ModalProvider>
      </NavigationProvider>
    </AppProvider>
  </React.StrictMode>
);

// Configuration Capacitor avant le rendu React
(async () => {
  try {
    await setupCapacitor();
  } catch (error) {
    console.error('Erreur lors de la configuration Capacitor:', error);
  }
  
  // Rendre l'app après la configuration (ou même si elle échoue)
  ReactDOM.createRoot(document.getElementById('root')!).render(AppRoot);
})();
