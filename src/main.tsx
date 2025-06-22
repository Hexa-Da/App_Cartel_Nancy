import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Info from './pages/Info';
import InfoSection from './pages/InfoSection';
import Layout from './components/Layout';
import './index.css';
import { AppPanelsProvider } from './AppPanelsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
