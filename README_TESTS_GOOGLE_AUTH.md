# 🔐 Guide d'Utilisation des Tests Google Auth - Cartel Nancy

## 📋 Vue d'Ensemble

Ce guide explique comment utiliser tous les outils de test créés pour vérifier l'authentification Google sur Android et iOS.

## 🛠️ Outils Disponibles

### 1. **Script de Vérification Automatique**
```bash
./test-google-auth-setup.sh
```
**Fonction** : Vérifie automatiquement toute la configuration
**Utilisation** : Exécuter depuis la racine du projet
**Résultat** : Rapport détaillé de l'état de la configuration

### 2. **Page de Test Générale**
```bash
# Ouvrir dans le navigateur
open test-google-auth.html
```
**Fonction** : Test basique de l'authentification Google
**Utilisation** : Ouvrir dans un navigateur web
**Fonctionnalités** :
- Test de configuration Firebase
- Test d'authentification Google
- Vérification des variables d'environnement

### 3. **Page de Test Capacitor Spécifique**
```bash
# Ouvrir dans le navigateur
open test-capacitor-google-auth.html
```
**Fonction** : Test complet du plugin Capacitor Google Auth
**Utilisation** : Ouvrir dans un navigateur web
**Fonctionnalités** :
- Test des plugins Capacitor
- Test d'initialisation Google Auth
- Test de connexion/déconnexion
- Test des deep links
- Test de l'authentification navigateur

### 4. **Page de Test Finale**
```bash
# Ouvrir dans le navigateur
open test-final-config.html
```
**Fonction** : Vérification de la configuration finale
**Utilisation** : Ouvrir dans un navigateur web
**Fonctionnalités** :
- Résumé de la configuration
- Tests automatiques au chargement
- Validation des composants

## 🚀 Processus de Test Complet

### Phase 1 : Vérification de la Configuration
```bash
# 1. Vérifier la configuration
./test-google-auth-setup.sh

# 2. Si tout est OK, continuer
npm run build
npx cap sync android
npx cap sync ios
```

### Phase 2 : Tests Web
```bash
# 3. Tester la configuration web
open test-google-auth.html
open test-capacitor-google-auth.html
open test-final-config.html
```

### Phase 3 : Tests Natifs
```bash
# 4. Test Android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 5. Test iOS
npx cap open ios
# Tester dans Xcode
```

## 📱 Tests sur Appareils Physiques

### Android
1. **Activer le mode développeur** sur l'appareil
2. **Activer le débogage USB**
3. **Installer l'APK** :
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. **Tester le bouton admin** et vérifier l'authentification

### iOS
1. **Ouvrir le projet dans Xcode** :
   ```bash
   npx cap open ios
   ```
2. **Configurer le certificat** de développement
3. **Sélectionner un appareil** ou simulateur
4. **Tester le bouton admin** et vérifier l'authentification

## 🔍 Diagnostic des Problèmes

### Utiliser les Logs
```bash
# Android
adb logcat | grep -E "(CartelNancy|GoogleAuth|Firebase)"

# iOS
# Utiliser la console Xcode
```

### Utiliser les Pages de Test
1. **Ouvrir les pages de test** dans le navigateur
2. **Exécuter tous les tests** disponibles
3. **Vérifier les erreurs** dans la console
4. **Consulter les logs** affichés

### Problèmes Communs
- **"Something went wrong"** → Vérifier Google Cloud Console
- **"Network error"** → Vérifier connectivité et permissions
- **"Invalid client"** → Client IDs déjà synchronisés ✅
- **Popup ne s'affiche pas** → Vérifier initialisation du plugin

## 📊 Interprétation des Résultats

### ✅ Tests Réussis
- Configuration Capacitor correcte
- Client IDs synchronisés
- Deep links configurés
- Builds réussis

### ⚠️ Tests Partiels
- Configuration correcte mais tests natifs échouent
- Vérifier les appareils et les certificats
- Consulter les logs d'erreur

### ❌ Tests Échoués
- Configuration incorrecte détectée
- Suivre les recommandations du script de vérification
- Corriger les problèmes avant de continuer

## 🎯 Objectifs de Test

### Fonctionnalité
- [ ] Bouton admin fonctionne sur Android
- [ ] Bouton admin fonctionne sur iOS
- [ ] Authentification Google réussie
- [ ] Redirection après connexion
- [ ] Déconnexion fonctionne

### Stabilité
- [ ] Pas d'erreurs lors de la connexion
- [ ] Pas d'erreurs lors de la déconnexion
- [ ] Gestion des erreurs appropriée
- [ ] Logs de débogage disponibles

### Sécurité
- [ ] Tokens gérés correctement
- [ ] Sessions sécurisées
- [ ] Permissions appropriées

## 📞 Support et Ressources

### Documentation
- **Guide de Test** : `GUIDE_TEST_GOOGLE_AUTH.md`
- **Vérification Configuration** : `check-google-auth-config.md`
- **Résumé de Vérification** : `RESUME_VERIFICATION_GOOGLE_AUTH.md`

### Outils de Débogage
- **Google Cloud Console** : https://console.cloud.google.com/
- **Firebase Console** : https://console.firebase.google.com/
- **Capacitor Documentation** : https://capacitorjs.com/docs/

### Logs et Diagnostics
- **Console Capacitor** : Logs de l'application
- **Console système** : Logs du système d'exploitation
- **Console Firebase** : Logs d'authentification

## 🔄 Maintenance

### Mise à Jour Régulière
1. **Vérifier la configuration** après chaque modification
2. **Tester sur appareils** après chaque build
3. **Mettre à jour les outils** de test si nécessaire
4. **Documenter les changements** et les problèmes

### Sauvegarde
- **Sauvegarder la configuration** avant les modifications
- **Documenter les changements** effectués
- **Tester la régression** après les modifications

---

## 🎉 Conclusion

Avec ces outils de test, vous pouvez maintenant :

1. **Vérifier automatiquement** la configuration
2. **Tester la fonctionnalité** sur le web
3. **Valider l'authentification** sur appareils physiques
4. **Diagnostiquer les problèmes** rapidement
5. **Maintenir la qualité** de l'authentification Google

**L'authentification Google via le bouton admin est maintenant prête pour les tests complets sur Android et iOS !**
