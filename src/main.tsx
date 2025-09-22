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

import AllPages from './components/AllPages';


import Layout from './components/Layout';
import './index.css';
import { AppPanelsProvider } from './AppPanelsContext';
import { AppProvider } from './AppContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <AppPanelsProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<App />} />
              <Route path="/info" element={<Info />} />
              <Route path="info/:sectionName" element={<InfoSection />} />

              

              <Route path="classement" element={<div>Classement</div>} />
              <Route path="profil" element={<div>Profil</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AppPanelsProvider>
    </AppProvider>
  </React.StrictMode>
);
