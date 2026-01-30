/**
 * @fileoverview Point d'entrée principal de l'application Cartel Nancy
 * 
 * Ce fichier configure et démarre l'application React avec :
 * - Le routing principal (React Router)
 * - Les contextes globaux (AppProvider, NavigationProvider, ModalProvider, FormProvider, EditingProvider)
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
import { AppProvider } from './AppContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ModalProvider } from './contexts/ModalContext';
import { FormProvider } from './contexts/FormContext';
import { EditingProvider } from './contexts/EditingContext';
import { setupCapacitor } from './config/capacitor';
import { initializeAnalytics } from './config/analytics';
import { setupTheme } from './config/theme-setup';
import { setupAnalytics } from './config/analytics-setup';
import { initializeFirebase } from './firebase';
import { initializeGoogleAuth } from './services/AuthService';
import Loader from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';
import logger from './services/Logger';

// Composant racine de l'application
const AppRoot = (
  <React.StrictMode>
    <ErrorBoundary>
      <Loader />
      <OrientationLock />
      <AppProvider>
      <NavigationProvider>
        <ModalProvider>
          <FormProvider>
            <EditingProvider>
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
            </EditingProvider>
          </FormProvider>
        </ModalProvider>
      </NavigationProvider>
    </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Configuration avant le rendu React
(async () => {
  // 1. Configurer le thème en premier (évite le FOUC)
  setupTheme();
  
  // 2. Initialiser Firebase TRÈS TÔT (avant tout le reste)
  // Sur iOS, cela garantit que les clés sont disponibles avant que les composants
  // ne tentent d'accéder aux données Firebase
  try {
    initializeFirebase();
    logger.log('[Main] Firebase initialisé avec succès');
  } catch (error) {
    logger.error('[Main] ERREUR CRITIQUE: Firebase n\'a pas pu être initialisé:', error);
    // On continue quand même pour éviter un écran blanc, mais l'app ne fonctionnera pas
  }
  
  // 3. Configurer Google Analytics (gtag.js)
  setupAnalytics();
  
  // 4. Configurer Capacitor (plugins natifs)
  try {
    await setupCapacitor();
  } catch (error) {
    logger.error('Erreur lors de la configuration Capacitor:', error);
  }
  
  // 4.5. Initialiser GoogleAuth Capacitor (requis pour Android/iOS)
  // IMPORTANT: Cette initialisation doit être complète avant le rendu React
  // pour éviter les NullPointerException sur Android
  try {
    await initializeGoogleAuth();
    logger.log('[Main] GoogleAuth initialisé avec succès');
  } catch (error) {
    logger.error('[Main] Erreur lors de l\'initialisation de GoogleAuth:', error);
    // Ne pas bloquer l'app si l'initialisation échoue, mais logger l'erreur
  }
  
  // 5. Initialiser ReactGA (complémentaire à gtag.js)
  initializeAnalytics();
  
  // 6. Rendre l'app après la configuration (ou même si elle échoue)
  ReactDOM.createRoot(document.getElementById('root')!).render(AppRoot);
})();
