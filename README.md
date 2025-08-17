# Cartel Nancy 2026

## Description
Cartel Nancy est une application mobile et web développée pour l'événement sportif et culturel "Cartel 2026" à Nancy. L'application permet aux utilisateurs de consulter les événements, localiser les lieux d'hébergement et restaurants, et accéder aux informations pratiques de l'organisation.

## 🚀 Fonctionnalités principales

### 📍 Carte interactive
- **Carte Leaflet** avec marqueurs pour tous les lieux d'événements
- **Géolocalisation** automatique de l'utilisateur
- **Filtres avancés** par sport, délégation, lieu et genre
- **Marqueurs colorés** selon la temporalité des événements
- **Intégration Google Maps** pour la navigation

### 🏆 Gestion des événements
- **Matchs sportifs** : Football, Basketball, Handball, Rugby, Ultimate, Natation, Badminton, Tennis, Cross, Volleyball, Ping-pong, Boxe, Athlétisme, Pétanque, Escalade, Jeux de société
- **Soirées spéciales** : Défilé, Show Pompom, DJ Contest, Soirée de clôture
- **Système de résultats** en temps réel pour les compétitions
- **Calendrier interactif** avec vue d'ensemble des événements

### 🏨 Hébergement et restauration
- **Hôtels partenaires** avec descriptions détaillées
- **Restaurants** avec informations sur les repas (midi/soir)
- **Préférences utilisateur** pour personnaliser l'affichage
- **Informations pratiques** (téléphone, adresse)

### 💬 Communication en temps réel
- **Chat de l'organisation** avec notifications push
- **Messages éditables** par les administrateurs
- **Historique des communications** avec horodatage

### ⚙️ Administration
- **Système d'authentification** par code d'accès sécurisé
- **Mode édition** pour modifier les événements et lieux
- **Gestion des matchs** : ajout, modification, suppression
- **Édition des descriptions** des hôtels, restaurants et soirées
- **Système d'historique** avec annulation/rétablissement (Ctrl+Z/Ctrl+Shift+Z)

## 🛠️ Technologies utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **Leaflet** pour la cartographie interactive
- **CSS personnalisé** avec variables CSS pour le thème

### Mobile
- **Capacitor** pour le développement cross-platform
- **Géolocalisation native** iOS/Android
- **Orientation portrait** forcée pour une meilleure UX
- **Notifications push** natives

### Backend
- **Firebase Realtime Database** pour la synchronisation en temps réel
- **Firebase Storage** pour les fichiers
- **Système d'authentification local** sécurisé

### Outils
- **Google Analytics 4** pour le suivi des utilisateurs
- **Nominatim OpenStreetMap** pour le géocodage des adresses

## 📱 Installation et développement

### Prérequis
- Node.js 18+ et npm
- Git

### Installation
```bash
# Cloner le repository
git clone https://github.com/Hexa-Da/App_Cartel_Nancy.git
cd App_Cartel_Nancy

# Installer les dépendances
npm install

# Créer le fichier de configuration admin
cp src/config/admin.example.ts src/config/admin.ts
# Modifier le code d'accès dans src/config/admin.ts
```

### Configuration admin
```bash
# Éditer le fichier src/config/admin.ts
export const ADMIN_CODE = 'VOTRE_CODE_ADMIN_ICI';
```

### Développement
```bash
# Lancer en mode développement
npm run dev

# Build de production
npm run build

# Déploiement Android
npm run deploy-android
```

## 🔐 Système d'authentification

### Pour les administrateurs
- **Code d'accès** : 6 chiffres configuré dans `src/config/admin.ts`
- **Mode édition** : Bouton "Editer" à gauche du bouton retour
- **Fonctionnalités** : Ajout/modification/suppression d'événements et lieux
- **Sécurité** : Code stocké localement, jamais commité sur Git

### Pour les utilisateurs
- **Aucune authentification** requise pour consulter les informations
- **Géolocalisation** optionnelle pour la localisation sur la carte
- **Préférences** sauvegardées localement

## 🎯 Fonctionnalités avancées

### Filtres intelligents
- **Filtre étoile** : Applique automatiquement vos préférences sport/délégation/genre
- **Filtres combinés** : Sport + Délégation + Lieu + Genre
- **Préférences persistantes** : Sauvegardées dans le localStorage

### Navigation intuitive
- **Bouton retour** contextuel selon l'onglet actuel
- **Navigation par onglets** : Carte, Événements, Chat, Planning, Calendrier
- **Historique de navigation** géré automatiquement
- **Prévention du retour** sur les pages principales

### Interface responsive
- **Design mobile-first** optimisé pour tous les écrans
- **Thème sombre/clair** adaptatif
- **Animations fluides** et transitions CSS
- **Accessibilité** avec titres et descriptions appropriés

## 📊 Structure des données

### Événements
```typescript
interface Match {
  id: string;
  date: string;
  teams: string;
  description: string;
  endTime?: string;
  result?: string;
  sport: string;
  venueId: string;
}
```

### Lieux
```typescript
interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  position: [number, number];
  sport: string;
  matches: Match[];
}
```

## 🚀 Déploiement

### Web
```bash
npm run build
# Les fichiers sont générés dans le dossier dist/
```

### Android
```bash
npm run deploy-android
# Génère l'APK dans android/app/build/outputs/apk/
```

### iOS
```bash
# Ouvrir ios/App/App.xcworkspace dans Xcode
# Configurer les certificats et déployer
```

## 🔧 Maintenance et mises à jour

### Ajout d'un nouvel événement
1. Se connecter en tant qu'admin
2. Activer le mode édition
3. Cliquer sur "+" sur la carte
4. Remplir le formulaire et valider

### Modification d'un lieu existant
1. Se connecter en tant qu'admin
2. Activer le mode édition
3. Cliquer sur le marqueur du lieu
4. Cliquer sur "Modifier ce lieu"

### Gestion des résultats
1. Se connecter en tant qu'admin
2. Activer le mode édition
3. Cliquer sur le marqueur de la soirée
4. Cliquer sur "Modifier le résultat"

## 📈 Analytics et suivi

### Google Analytics 4
- **Page views** automatiques
- **Événements personnalisés** pour les interactions
- **Mode test** en développement
- **Suivi des filtres** et de la navigation

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Ouvrir une issue pour signaler un bug
- Proposer une pull request pour ajouter une fonctionnalité
- Améliorer la documentation
- Optimiser les performances

## 📄 Licence

Ce projet est sous licence MIT.

## 🆕 Dernières mises à jour

### Version actuelle
- ✅ **Système d'authentification local** remplaçant Google Auth
- ✅ **Interface d'administration** complète avec mode édition
- ✅ **Gestion des événements** en temps réel
- ✅ **Système de filtres** avancé et intelligent
- ✅ **Chat de l'organisation** avec notifications
- ✅ **Géolocalisation native** iOS/Android
- ✅ **Interface responsive** et accessible
- ✅ **Système d'historique** avec annulation/rétablissement
- ✅ **Notifications push** natives
- ✅ **Intégration Google Analytics 4**
- ✅ **Optimisations de performance** et nettoyage du code

---

**Cartel Nancy 2026** - Application officielle de l'événement sportif et culturel

