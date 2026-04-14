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
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
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
import Loader from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';
import logger from './services/Logger';
import { syncNativeDelegationPreferencesWithLocalStorage } from './services/UserPreferencesStorage';

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
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms-of-service" element={<TermsOfServicePage />} />

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

// Configuration avant le rendu React — chaque étape est protégée pour
// garantir que ReactDOM.render() est TOUJOURS atteint (sinon = écran noir).
(async () => {
  try { setupTheme(); } catch (e) { logger.error('[Main] setupTheme:', e); }

  try {
    initializeFirebase();
  } catch (error) {
    logger.error('[Main] ERREUR CRITIQUE Firebase:', error);
  }

  try { setupAnalytics(); } catch (e) { logger.error('[Main] setupAnalytics:', e); }

  try { await setupCapacitor(); } catch (e) { logger.error('[Main] setupCapacitor:', e); }

  try { await syncNativeDelegationPreferencesWithLocalStorage(); } catch (e) { logger.error('[Main] syncPrefs:', e); }

  try { initializeAnalytics(); } catch (e) { logger.error('[Main] initializeAnalytics:', e); }

  ReactDOM.createRoot(document.getElementById('root')!).render(AppRoot);
})();
