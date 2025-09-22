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
VITE_ADMIN_CODE=cartel2025

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

| Composant | Rôle | Nécessaire car |
|-----------|------|----------------|
| **App.tsx** | Composant principal avec carte et chat | Interface centrale de l'application |
| **Layout.tsx** | Structure générale avec navigation | Définit l'architecture commune |
| **Header.tsx** | En-tête avec auth admin | Navigation et authentification |
| **VSSForm.tsx** | Formulaire signalements VSS | Obligation légale de signalement |
| **AdminLoginModal.tsx** | Authentification sécurisée | Sécurise l'accès admin |

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
```

### Mobile (iOS)
```bash
npm run sync-ios         # Synchronisation Capacitor
npm run ios-full-deploy  # Build complet iOS
```

### Nettoyage
```bash
npm run clean-android    # Nettoyage build Android
npm run clean-ios        # Nettoyage build iOS
npm run rebuild-android  # Nettoyage + rebuild Android
npm run rebuild-ios      # Nettoyage + rebuild iOS
```

## 🔐 Authentification et sécurité

### Mode Administrateur
- **Code d'accès** : Défini dans `VITE_ADMIN_CODE`
- **Fonctionnalités** : Édition des messages, gestion des événements
- **Stockage** : LocalStorage chiffré
- **Sécurité** : Code jamais exposé dans le code source

### Signalements VSS
- **Formulaire sécurisé** avec validation
- **Envoi direct** via EmailJS (pas de client email externe)
- **Option d'anonymat** pour protéger les victimes
- **Conformité légale** obligatoire

## 📱 Fonctionnalités détaillées

### 🗺️ Carte interactive
- Géolocalisation en temps réel
- Marqueurs pour événements et lieux
- Lignes de bus et arrêts
- Navigation vers les lieux

### 💬 Chat temps réel
- Messages instantanés via Firebase
- Traduction automatique des messages
- Mode édition pour les administrateurs
- Notifications push pour nouveaux messages

### 📅 Gestion des événements
- Affichage des matchs et événements
- Filtres par sport, date, lieu
- Détails complets des événements
- Planning intégré avec calendrier

### 🔐 Mode Administrateur
- Authentification par code sécurisé
- Édition des messages du chat
- Gestion des événements
- Accès aux fonctionnalités avancées

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

## 🆕 Dernières mises à jour

### Version actuelle
- ✅ **Système d'authentification sécurisé** avec variables d'environnement
- ✅ **Interface d'administration complète** avec mode édition
- ✅ **Chat temps réel** avec notifications push
- ✅ **Signalements VSS** conformes à la législation
- ✅ **Documentation complète** avec en-têtes explicatifs
- ✅ **Conformité RGPD** avec politique de confidentialité
- ✅ **Application native** Android et iOS

### 🚀 Optimisations récentes
- ✅ **Performance** : Chargement intelligent et virtualisation
- ✅ **Sécurité** : Code admin dans variables d'environnement
- ✅ **UX** : Interface responsive et intuitive
- ✅ **Légal** : Mentions légales et signalements VSS
- ✅ **Documentation** : En-têtes explicatifs sur tous les fichiers

---

**Cartel Nancy 2026** - Application officielle de l'événement sportif et culturel

*Dernière mise à jour : Septembre 2025*