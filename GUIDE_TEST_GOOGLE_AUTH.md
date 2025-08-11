# 🔐 Guide de Test - Authentification Google Cartel Nancy

## 📋 Prérequis

### ✅ Configuration Vérifiée
- [x] Client IDs synchronisés entre Capacitor et Google Services
- [x] Deep links configurés pour Android et iOS
- [x] Plugin Capacitor Google Auth installé et configuré
- [x] Configuration Firebase correcte

### 📱 Appareils Requis
- **Android** : Appareil physique avec Google Play Services à jour
- **iOS** : Appareil physique ou simulateur iOS 14+

## 🧪 Tests à Effectuer

### 1. **Test de Configuration (Déjà Fait)**
```bash
./test-google-auth-setup.sh
```
**Résultat attendu** : ✅ Tous les tests passent

### 2. **Test sur Android**

#### A. Build et Installation
```bash
# Build de l'application
npm run build

# Synchronisation Capacitor
npx cap sync android

# Build APK Debug
cd android
./gradlew assembleDebug
cd ..
```

#### B. Installation sur Appareil
```bash
# Vérifier les appareils connectés
adb devices

# Installer l'APK (remplacer par le chemin de votre APK)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

#### C. Test de l'Authentification
1. **Ouvrir l'application** sur l'appareil Android
2. **Taper sur le bouton admin** (🔑) en haut à droite
3. **Observer le comportement** :
   - Popup de sélection de compte Google
   - Redirection vers l'application
   - Connexion réussie ou erreur

#### D. Vérification des Logs
```bash
# Suivre les logs en temps réel
adb logcat | grep -E "(CartelNancy|GoogleAuth|Firebase)"

# Filtrer par tag spécifique
adb logcat -s CartelNancy:V GoogleAuth:V Firebase:V
```

### 3. **Test sur iOS**

#### A. Build et Installation
```bash
# Build de l'application
npm run build

# Synchronisation Capacitor
npx cap sync ios

# Ouvrir dans Xcode
npx cap open ios
```

#### B. Configuration Xcode
1. **Sélectionner le bon équipe de développement**
2. **Vérifier le Bundle Identifier** : `com.cartelnancy.app`
3. **Configurer les certificats de signature**

#### C. Test sur Simulateur/Appareil
1. **Sélectionner un simulateur ou appareil cible**
2. **Lancer l'application** (⌘+R)
3. **Tester le bouton admin** :
   - Popup de connexion Google
   - Redirection et authentification

#### D. Vérification des Logs
- **Console Xcode** : Afficher les logs de l'application
- **Console système** : Vérifier les erreurs système

## 🔍 Diagnostic des Problèmes

### Problème : "Something went wrong"
**Cause** : Configuration OAuth incorrecte
**Solution** :
1. Vérifier les Client IDs dans Google Cloud Console
2. Confirmer les URIs de redirection autorisés
3. Vérifier que l'application est configurée pour Android/iOS

### Problème : "Network error"
**Cause** : Problème de connectivité ou configuration
**Solution** :
1. Vérifier la connectivité internet
2. Confirmer les permissions réseau dans le manifest
3. Vérifier la configuration Firebase

### Problème : "Invalid client"
**Cause** : Client ID incorrect ou non configuré
**Solution** :
1. Synchroniser les Client IDs entre Capacitor et Google Services
2. Vérifier la configuration dans `capacitor.config.ts`
3. Confirmer la configuration dans Google Cloud Console

### Problème : Popup ne s'affiche pas
**Cause** : Plugin non initialisé ou configuration manquante
**Solution** :
1. Vérifier l'initialisation du plugin Google Auth
2. Confirmer la configuration des scopes
3. Vérifier les permissions dans le manifest

## 📊 Tests de Validation

### ✅ Test Réussi
- [ ] Popup de sélection de compte Google s'affiche
- [ ] Connexion réussie avec un compte Google
- [ ] Redirection vers l'application
- [ ] Utilisateur connecté affiché dans l'interface
- [ ] Déconnexion fonctionne correctement

### ❌ Test Échoué
- [ ] Erreur lors de l'ouverture du popup
- [ ] Échec de l'authentification
- [ ] Pas de redirection après connexion
- [ ] Utilisateur non connecté après authentification
- [ ] Erreur lors de la déconnexion

## 🛠️ Outils de Débogage

### 1. **Fichiers de Test HTML**
- `test-google-auth.html` - Test général de l'authentification
- `test-capacitor-google-auth.html` - Test spécifique Capacitor

### 2. **Script de Vérification**
- `test-google-auth-setup.sh` - Vérification automatique de la configuration

### 3. **Logs de Débogage**
- **Android** : `adb logcat`
- **iOS** : Console Xcode
- **Web** : Console du navigateur

## 📱 Test sur Appareils Physiques

### Android
1. **Activer le mode développeur** sur l'appareil
2. **Activer le débogage USB**
3. **Autoriser l'installation d'applications** depuis des sources inconnues
4. **Installer l'APK** via ADB ou transfert de fichier

### iOS
1. **Ajouter l'appareil** au compte de développement Apple
2. **Faire confiance au certificat** de développeur
3. **Autoriser l'application** dans les paramètres de confidentialité

## 🔄 Processus de Test Complet

### Phase 1 : Vérification de la Configuration
```bash
./test-google-auth-setup.sh
npm run build
npx cap sync android
npx cap sync ios
```

### Phase 2 : Test Android
```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
cd ..
```

### Phase 3 : Test iOS
```bash
npx cap open ios
# Tester dans Xcode
```

### Phase 4 : Validation
- [ ] Authentification Google fonctionne sur Android
- [ ] Authentification Google fonctionne sur iOS
- [ ] Connexion/déconnexion stable
- [ ] Gestion des erreurs appropriée

## 📞 Support et Ressources

### Documentation Officielle
- **Capacitor** : https://capacitorjs.com/docs/
- **Google Auth Plugin** : https://github.com/CodetrixStudio/CapacitorGoogleAuth
- **Firebase Auth** : https://firebase.google.com/docs/auth

### Outils de Débogage
- **Google Cloud Console** : https://console.cloud.google.com/
- **Firebase Console** : https://console.firebase.google.com/
- **Android Studio** : Pour le débogage Android
- **Xcode** : Pour le débogage iOS

### Logs et Diagnostics
- **Console Capacitor** : Logs de l'application
- **Console système** : Logs du système d'exploitation
- **Console Firebase** : Logs d'authentification

## 🎯 Objectifs de Test

1. **Fonctionnalité** : L'authentification Google fonctionne sur Android et iOS
2. **Stabilité** : Connexion/déconnexion sans erreur
3. **Sécurité** : Gestion appropriée des tokens et des sessions
4. **UX** : Expérience utilisateur fluide et intuitive
5. **Robustesse** : Gestion des erreurs et des cas limites

---

**⚠️ Important** : Testez toujours sur des appareils physiques pour une validation complète. Les simulateurs peuvent ne pas reproduire tous les comportements de l'authentification Google.
