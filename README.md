# Cartel Nancy - Application Mobile


## Description
Cartel Nancy est une application mobile et web développée pour l'événement sportif et culturel "Cartel 2026" à Nancy. L'application permet aux utilisateurs de consulter les événements, localiser les lieux d'hébergement et restaurants, et accéder aux informations pratiques de l'organisation.

## 📱 Vue d'ensemble

Application React/TypeScript avec Capacitor pour Android et iOS, utilisant Firebase pour le backend et les données en temps réel.

### ✨ Fonctionnalités principales

- **🗺️ Carte interactive** avec géolocalisation et marqueurs d'événements
- **💬 Chat temps réel** avec notifications push
- **📅 Gestion d'événements** avec filtres avancés
- **🔐 Mode administrateur** avec édition des contenus
- **📋 Informations pratiques** (restauration, transport, etc.)
- **⚠️ Signalements VSS** avec formulaire sécurisé
- **📱 Application native** pour Android et iOS

## 🚀 Démarrage rapide

### Prérequis
- Node.js >= 18.0.0
- npm ou yarn
- Android Studio (pour Android)
- Xcode (pour iOS)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-repo/App_Cartel_Nancy.git
cd App_Cartel_Nancy

# 2. Installer les dépendances
npm install

# 3. Créer le fichier de configuration
cp .env.example .env
# Éditer .env avec vos clés Firebase et EmailJS

# 4. Démarrer en développement
npm run dev
```

### Configuration requise

Créez un fichier `.env` à la racine :

```env
# 🔐 Code administrateur
VITE_ADMIN_CODE=cartelnancy2026

# 🔥 Firebase Configuration
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_domain
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
VITE_FIREBASE_DATABASE_URL=votre_database_url

# 📧 EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=votre_public_key
VITE_EMAILJS_SERVICE_ID=votre_service_id
VITE_EMAILJS_TEMPLATE_ID=votre_template_id
```

## 🏗️ Architecture du projet

### 📁 Structure des dossiers

```
App_Cartel_Nancy/
├── 📱 android/                   # Configuration Android
├── 📱 ios/                       # Configuration iOS
├── 🌐 public/                    # Fichiers statiques
│   ├── privacy-policy.html       # Politique de confidentialité
│   ├── terms-of-service.html     # Conditions d'utilisation
│   └── manifest.json             # Manifeste PWA
├── 📦 src/                       # Code source
│   ├── 🧩 components/            # Composants réutilisables
│   ├── 📄 pages/                 # Pages principales
│   ├── ⚙️ config/                # Configuration
│   ├── 🔧 services/              # Services métier
│   ├── 🎣 hooks/                 # Hooks personnalisés
│   └── 📝 types.ts               # Types TypeScript
└── ⚙️ Configuration Files        # Fichiers de config
```

### 🧩 Composants principaux

| Composant | Rôle |
|-----------|------|
| **App.tsx** | Composant racine avec routage |
| **Layout.tsx** | Structure commune de l'app |
| **Header.tsx** | Barre d'état |
| **BottomNav.tsx** | Barre de navigation principale |
| **EventList.tsx** | Liste et filtres des événements |
| **CalendarPopup.tsx** | Calendrier des événements |
| **PlanningFilesPage.tsx** | Répertoire de tous les fichiers |

### 📄 Pages principales

| Page | Fonctionnalité | Accès |
|------|----------------|-------|
| **Home** | Événements récents avec filtres | `/` |
| **Map** | Carte interactive avec géolocalisation | `/map` |
| **Info** | Menu informations pratiques | `/info` |
| **InfoSection** | Sections détaillées (dynamique) | `/info/:section` |

## 🛠️ Technologies utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build rapide
- **React Router** pour la navigation
- **Leaflet** pour les cartes interactives
- **React Icons** pour les icônes

### Backend & Services
- **Firebase Realtime Database** pour les données temps réel
- **Firebase Cloud Messaging** pour les notifications
- **Firebase Storage** pour les fichier pdf
- **EmailJS** pour l'envoi d'emails depuis le frontend

### Mobile
- **Capacitor** pour la compilation cross-platform
- **Plugins Capacitor** pour les fonctionnalités natives
- **Android Gradle** pour le build Android
- **Xcode** pour le build iOS

## 🚀 Scripts de développement

### Développement
```bash
npm run dev              # Serveur de développement
npm run build            # Build de production
npm run preview          # Prévisualisation du build
npm run lint             # Vérification ESLint
```

### Mobile (Android)
```bash
npm run sync-android           # Synchronisation Capacitor
npm run android-full-deploy    # Build complet avec installation
npm run build-android-apk      # Build APK de release
npm run build-android-release  # Build App Bundle pour Play Store
npm run clean-android          # Nettoyage build Android
npm run rebuild-android        # Nettoyage + rebuild Android
```

### Mobile (iOS)
```bash
npm run sync-ios         # Synchronisation Capacitor
npm run ios-full-deploy  # Build complet iOS
npm run clean-ios        # Nettoyage build iOS
npm run rebuild-ios      # Nettoyage + rebuild iOS
```

## 🚀 Déploiement

### Web
```bash
npm run build && npm run deploy  # GitHub Pages
```

### Google Play Store
1. Build : `npm run build-android-release`
2. Télécharger le `.aab` depuis `android/app/build/outputs/bundle/release/`
3. Uploader sur Google Play Console

### App Store
1. Build : `npm run ios-full-deploy`
2. Ouvrir dans Xcode
3. Archiver et uploader vers App Store Connect

## 🔒 Conformité et légal

### RGPD
- **Politique de confidentialité** : `/privacy-policy.html`
- **Conditions d'utilisation** : `/terms-of-service.html`
- **Données collectées** : Géolocalisation (optionnelle), préférences locales
- **Conformité** : Totale avec le RGPD et la loi française

### Signalements VSS
- **Formulaire dédié** avec envoi sécurisé
- **Protection des victimes** avec option d'anonymat
- **Conformité légale** pour les événements publics

## 📞 Support et contact

- **Email** : pap71530@outlook.com
- **Téléphone** : 07 67 78 63 30
- **Signalements VSS** : pap71@hotmail.fr

## 📄 Licence

Projet développé pour le Cartel  Nancy 2026. Tous droits réservés.

---

**Cartel Nancy 2026** - Application officielle de l'événement sportif et culturel

*Dernière mise à jour : Octobre 2025*