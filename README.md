# Cartel Nancy - Application Mobile

## Description

Cartel Nancy est une application mobile et web développée pour l'événement sportif et culturel « Cartel 2026 » à Nancy. L'application permet aux utilisateurs de consulter les événements, localiser les lieux d'hébergement et restaurants, et accéder aux informations pratiques de l'organisation.

## 📱 Vue d'ensemble

Application React/TypeScript avec Capacitor pour Android et iOS, utilisant Firebase pour le backend et les données en temps réel.

### ✨ Fonctionnalités principales

- **🗺️ Carte interactive** avec géolocalisation et marqueurs d'événements (Leaflet)
- **💬 Chat temps réel** avec notifications push (Firebase Cloud Messaging)
- **📅 Gestion d'événements** avec liste, filtres avancés
- **🔐 Mode administrateur** avec édition des contenus (venues, matchs, événements)
- **📋 Informations pratiques** (restauration, transport, lignes de bus, etc.)
- **⚠️ Signalements VSS** avec formulaire sécurisé et système anti-spam
- **📱 Application native** pour Android et iOS
- **🔒 Activation unique** par appareil (un bracelet = un seul téléphone)
- **🎰 Paris sur les matchs** avec système de points
- **📄 Planning files** avec gestion de fichiers PDF
- **🎨 Design System** avec tokens CSS et support Safe Areas

## 🏗️ Architecture du projet

### 📁 Structure des dossiers

L'application suit une architecture **Feature-First** et **Colocated** (code + style au même endroit). Voir **`CLAUDE.md`** pour les standards stricts (tokens CSS, contextes, pas de styles inline, etc.).

```
App_Cartel_Nancy/
├── 📱 android/                   # Configuration Android (Gradle)
├── 📱 ios/                       # Configuration iOS (Xcode)
├── 🌐 public/                    # Fichiers statiques
│   ├── privacy-policy.html       # Politique de confidentialité
│   ├── terms-of-service.html     # Conditions d'utilisation
│   ├── manifest.json             # Manifeste PWA
│   └── firebase-messaging-sw.js  # Service Worker pour notifications
├── 📦 src/                       # Code source
│   ├── 🧩 components/            # Composants UI partagés
│   ├── 📄 pages/                 # Pages principales (Home, Map, Info, Parie, PlanningFilesPage)
│   ├── 🎨 theme/                 # tokens.css, reset.css, platform/ (ios, android)
│   ├── ⚙️ config/                # capacitor, analytics, firebase-messaging, admin, theme-setup
│   ├── 🔧 services/              # Firebase, Logger, VenueService, MatchService, EditableDataService
│   ├── 🎣 hooks/                 # useMapState, useSafeAreas, useEventFilters, useHSECharter, etc.
│   ├── 📦 contexts/              # Navigation, Modal, Form, Editing
│   ├── 📝 types.ts + types/      # Types TypeScript globaux et venue
│   ├── AppContext.tsx            # État global app (panels, chat, etc.)
│   └── AppPanelsContext.tsx      # Contexte des panneaux
├── ⚙️ functions/                 # Firebase Cloud Functions 
└── ⚙️ Configuration              # Vite, TypeScript, ESLint, Capacitor
```

### 🧩 Composants principaux

| Composant | Rôle |
|-----------|------|
| **App.tsx** | Composant racine avec carte Leaflet et gestion des événements |
| **Layout.tsx** | Structure commune de l'app (Header + BottomNav + Safe Areas) |
| **Header.tsx** | Barre d'état avec informations contextuelles |
| **BottomNav.tsx** | Barre de navigation principale (Home, Map, Info) |
| **SettingsMenu.tsx** | Paramètres et choix des préférences |
| **CalendarPopup.tsx** | Calendrier des événements avec filtres |
| **PlanningFilesPage.tsx** | Répertoire de tous les fichiers PDF |
| **VSSForm.tsx** | Formulaire de signalement VSS sécurisé avec anti-spam |
| **BusLines.tsx** | Affichage des lignes de bus et horaires |
| **ChatPanel.tsx** | Chat temps réel avec Firebase |

## 🛠️ Technologies utilisées

### Frontend
- **React 18.2** avec TypeScript 5.9 (Strict Mode)
- **Vite 6.4** pour le build rapide
- **React Router 7.6** pour la navigation
- **Leaflet 1.9** + **React-Leaflet 4.2** pour les cartes interactives

### Backend & Services
- **Firebase 11.6** (Realtime Database, Cloud Messaging, Storage, Auth)
- **Firebase Cloud Functions** (TypeScript) pour la logique serveur
- **Telegram Bot API** pour les notifications de signalements VSS
- **Google Analytics** (react-ga, react-ga4) pour l'analytics

### Mobile
- **Capacitor** pour la compilation cross-platform
- **Plugins Capacitor** pour les fonctionnalités natives
- **Android Gradle** pour le build Android
- **Xcode** pour le build iOS

## 🔒 Conformité et légal

### RGPD
- **Politique de confidentialité** : `/privacy-policy.html`
- **Conditions d'utilisation** : `/terms-of-service.html`
- **Données collectées** : Géolocalisation (optionnelle), préférences locales
- **Conformité** : Totale avec le RGPD et la loi française

### Signalements VSS
- **Formulaire dédié** avec envoi sécurisé
- **Protection des victimes** avec validation d'identité
- **Système anti-abus** pour éviter les faux signalements
- **Conformité légale** pour les événements publics

### Charte HSE
- **Lecture obligatoire** au premier lancement de l'app
- **Case à cocher** pour valider l'acceptation
- **Engagement** sur les règles de sécurité et respect

### Système de Paris
- **Activation du bracelet** dans la section "Faites vos paris"
- **Un bracelet = un appareil** (activation irréversible)
- **Paris gratuits** sur les matchs pour gagner des points

## 📄 Licence

Projet développé pour le Cartel Nancy 2026. Tous droits réservés.

---

*Dernière mise à jour : Février 2026*
