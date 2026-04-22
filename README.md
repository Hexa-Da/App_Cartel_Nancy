# Cartel Nancy - Application mobile

## Description

Cartel Nancy est une application mobile et web développée pour l'evenement sportif et culturel Cartel 2026 a Nancy. Elle permet de consulter les evenements, localiser les lieux importants et acceder aux informations pratiques de l'organisation.

## Vue d'ensemble

Application React/TypeScript avec Capacitor pour Android et iOS, utilisant Firebase pour le backend.

### Fonctionnalites principales

- Carte interactive avec geolocalisation et marqueurs d'evenements (Leaflet)
- Chat temps reel avec notifications push (Firebase Cloud Messaging)
- Gestion d'evenements avec liste, calendrier et filtres avances
- Mode administrateur avec edition des contenus (venues, matchs, evenements)
- Informations pratiques (restauration, transport, lignes de bus)
- Signalements VSS avec formulaire securise et systeme anti-spam
- Application native Android et iOS via Capacitor
- Activation unique par appareil (un bracelet = un seul telephone)
- Paris sur les matchs avec systeme de points
- Planning files avec consultation de fichiers PDF
- Design system base sur des tokens CSS 

## Architecture du projet

### Structure des dossiers

L'application suit une architecture Feature-First et Colocated (code + style au meme endroit). Voir `CLAUDE.md` pour les standards stricts (tokens CSS, contextes, pas de styles inline, etc.).

```text
App_Cartel_Nancy/
├── android/                     # Configuration Android (Gradle)
├── ios/                         # Configuration iOS (Xcode)
├── public/                      # Fichiers statiques
│   ├── privacy-policy.html      # Politique de confidentialite
│   ├── terms-of-service.html    # Conditions d'utilisation
│   ├── manifest.json            # Manifeste PWA
│   └── firebase-messaging-sw.js # Service Worker pour notifications
├── src/                         # Code source
│   ├── components/              # Composants UI partages
│   ├── pages/                   # Pages principales (Home, Map, Info, Parie, PlanningFilesPage)
│   ├── theme/                   # tokens.css, reset.css, platform/ (ios, android)
│   ├── config/                  # capacitor, analytics, firebase-messaging, admin, theme-setup
│   ├── services/                # Firebase, Logger, VenueService, MatchService, EditableDataService
│   ├── hooks/                   # useMapState, useSafeAreas, useEventFilters, useHSECharter, etc.
│   ├── contexts/                # Navigation, Modal, Form, Editing
│   ├── types.ts + types/        # Types TypeScript globaux et venue
│   ├── AppContext.tsx           # Etat global app (panels, chat, etc.)
│   └── AppPanelsContext.tsx     # Contexte des panneaux
├── functions/                   # Firebase Cloud Functions
└── Configuration                # Vite, TypeScript, ESLint, Capacitor
```

### Composants principaux

| Composant | Role |
|-----------|------|
| `App.tsx` | Composant racine avec carte Leaflet et gestion des evenements |
| `Layout.tsx` | Structure commune de l'app (Header + BottomNav + Safe Areas) |
| `Header.tsx` | Barre d'etat avec informations contextuelles |
| `BottomNav.tsx` | Barre de navigation principale (Home, Map, Info) |
| `SettingsMenu.tsx` | Parametres et choix des preferences |
| `CalendarPopup.tsx` | Calendrier des evenements avec filtres |
| `PlanningFilesPage.tsx` | Repertoire de tous les fichiers PDF |
| `VSSForm.tsx` | Formulaire de signalement VSS securise avec anti-spam |
| `BusLines.tsx` | Affichage des lignes de bus et horaires |
| `ChatPanel.tsx` | Chat temps reel avec Firebase |
| `LaunchPopup.tsx` | Popup affichée au démarrage |

## Technologies utilisees

### Frontend
- React 18.2 avec TypeScript 5.9 (Strict Mode)
- Vite 6.4 pour le build rapide
- React Router 7.6 pour la navigation
- Leaflet 1.9 + React-Leaflet 4.2 pour les cartes interactives

### Backend et services
- Firebase 11.6 (Realtime Database, Cloud Messaging, Storage, Auth)
- Firebase Cloud Functions (TypeScript) pour la logique serveur
- Telegram Bot API pour les notifications de signalements VSS
- Google Analytics (react-ga, react-ga4) pour l'analytics

### Mobile
- Capacitor pour la compilation cross-platform
- Plugins Capacitor pour les fonctionnalites natives
- Android Gradle pour le build Android
- Xcode pour le build iOS

## Conformite et legal

### RGPD
- Politique de confidentialite : `/privacy-policy.html`
- Conditions d'utilisation : `/terms-of-service.html`
- Donnees collectees : geolocalisation (optionnelle), preferences locales
- Conformite : RGPD et loi francaise

### Signalements VSS
- Formulaire dedie avec envoi securise
- Protection des victimes avec validation d'identite
- Systeme anti-abus pour eviter les faux signalements
- Conformite legale pour les evenements publics

### Charte HSE
- Lecture obligatoire au premier lancement de l'app
- Case a cocher pour valider l'acceptation
- Engagement sur les regles de securite et respect

### Systeme de paris
- Activation du bracelet dans la section "Faites vos paris"
- Un bracelet = un appareil (activation irreversible)
- Paris gratuits sur les matchs pour gagner des points

## Licence

Projet developpe pour le Cartel Nancy 2026. Tous droits reserves.

---

Derniere mise a jour : Avril 2026
