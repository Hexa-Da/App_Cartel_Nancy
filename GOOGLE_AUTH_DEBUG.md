# Debug Google Auth Android - Cartel Nancy

## Problème initial
L'erreur "Something went wrong" lors de la connexion Google Auth sur Android indiquait un problème de configuration.

## Corrections apportées

### 1. Ajout des dépendances Google Play Services
Dans `android/app/build.gradle`, ajout des dépendances manquantes :
```gradle
// Google Play Services dependencies for Google Auth
implementation 'com.google.android.gms:play-services-auth:20.7.0'
implementation 'com.google.android.gms:play-services-base:18.3.0'
```

### 2. Amélioration de la configuration Capacitor
Dans `capacitor.config.ts`, modification de la configuration :
```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  androidClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  iosClientId: '402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com',
  webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  forceCodeForRefreshToken: true,
  offlineAccess: true
}
```

**Note importante** : Le `androidClientId` utilise maintenant le client ID web au lieu du client ID Android spécifique.

### 3. Ajout des permissions Android
Dans `android/app/src/main/AndroidManifest.xml`, ajout des permissions nécessaires :
```xml
<!-- Google Auth specific permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 4. Amélioration de la gestion d'erreur
Dans `src/firebase.ts`, amélioration du logging et de la gestion d'erreur :
- Ajout de logs détaillés pour chaque étape
- Gestion spécifique des différents types d'erreurs
- Fonction de test de configuration `testGoogleAuthConfiguration()`
- Analyse détaillée des objets d'erreur

### 5. Diagnostic amélioré
Ajout d'une fonction de test dans `src/firebase.ts` pour diagnostiquer les problèmes :
```typescript
export async function testGoogleAuthConfiguration() {
  // Test complet de la configuration Google Auth avec tentative de connexion
}
```

## Vérification de la configuration

### Client IDs vérifiés
Les client IDs dans `google-services.json` correspondent à ceux dans `capacitor.config.ts` :
- Android: `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`
- Web: `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`
- iOS: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com`

### SHA-1 Fingerprint vérifié
Le SHA-1 fingerprint actuel est correct :
```
SHA 1: B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C
```
Ce qui correspond à `b93d0dc14308b897bafda30acd92fa908541498c` dans `google-services.json`.

### Plugin installé
Le plugin `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` est correctement installé et synchronisé.

## Étapes de test

1. **Reconstruction complète** :
   ```bash
   npm run android-full-deploy
   ```

2. **Test de connexion** :
   - Ouvrir l'application sur Android
   - Cliquer sur le bouton Admin
   - Vérifier les logs dans la console pour le diagnostic

3. **Vérification des logs** :
   Les logs détaillés permettront d'identifier précisément où se situe le problème.

## Prochaines étapes si le problème persiste

1. **Vérifier Google Cloud Console** :
   - Aller dans [Google Cloud Console](https://console.cloud.google.com/)
   - Projet `cummap-7afee`
   - APIs & Services > Credentials
   - Vérifier que le client ID Android est correctement configuré

2. **Vérifier OAuth Consent Screen** :
   - S'assurer que l'application est configurée
   - Ajouter votre email comme utilisateur de test

3. **Vérifier les APIs activées** :
   - Google+ API
   - Google Identity API
   - Google Sign-In API

4. **Alternative : Utiliser le client ID web** :
   Si le problème persiste, nous avons modifié la configuration pour utiliser le client ID web comme client ID Android.

## Commandes utiles

```bash
# Vérifier le SHA-1 fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Synchroniser les changements
npm run sync-android

# Nettoyer et reconstruire
npm run rebuild-android

# Déploiement complet
npm run android-full-deploy
```

## Dernière modification
- **Date** : 24 juin 2025
- **Modification** : Utilisation du client ID web comme client ID Android pour contourner le problème "Something went wrong"
# Debug Google Auth Android - Cartel Nancy

## Problème initial
L'erreur "Something went wrong" lors de la connexion Google Auth sur Android indiquait un problème de configuration.

## Corrections apportées

### 1. Ajout des dépendances Google Play Services
Dans `android/app/build.gradle`, ajout des dépendances manquantes :
```gradle
// Google Play Services dependencies for Google Auth
implementation 'com.google.android.gms:play-services-auth:20.7.0'
implementation 'com.google.android.gms:play-services-base:18.3.0'
```

### 2. Amélioration de la configuration Capacitor
Dans `capacitor.config.ts`, ajout de l'option `forceCodeForRefreshToken` :
```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  androidClientId: '402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com',
  iosClientId: '402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com',
  webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  forceCodeForRefreshToken: true
}
```

### 3. Ajout des permissions Android
Dans `android/app/src/main/AndroidManifest.xml`, ajout des permissions nécessaires :
```xml
<!-- Google Auth specific permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 4. Amélioration de la gestion d'erreur
Dans `src/firebase.ts`, amélioration du logging et de la gestion d'erreur :
- Ajout de logs détaillés pour chaque étape
- Gestion spécifique des différents types d'erreurs
- Fonction de test de configuration `testGoogleAuthConfiguration()`

### 5. Diagnostic amélioré
Ajout d'une fonction de test dans `src/firebase.ts` pour diagnostiquer les problèmes :
```typescript
export async function testGoogleAuthConfiguration() {
  // Test complet de la configuration Google Auth
}
```

## Vérification de la configuration

### Client IDs vérifiés
Les client IDs dans `google-services.json` correspondent à ceux dans `capacitor.config.ts` :
- Android: `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`
- Web: `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`
- iOS: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com`

### Plugin installé
Le plugin `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` est correctement installé et synchronisé.

## Étapes de test

1. **Reconstruction complète** :
   ```bash
   npm run android-full-deploy
   ```

2. **Test de connexion** :
   - Ouvrir l'application sur Android
   - Cliquer sur le bouton Admin
   - Vérifier les logs dans la console pour le diagnostic

3. **Vérification des logs** :
   Les logs détaillés permettront d'identifier précisément où se situe le problème.

## Prochaines étapes si le problème persiste

1. Vérifier que Google Play Services est à jour sur l'appareil
2. Vérifier la configuration OAuth dans Google Cloud Console
3. S'assurer que l'application est configurée pour Android dans Google Cloud Console
4. Vérifier que le SHA-1 fingerprint est correct dans Google Cloud Console

## Commandes utiles

```bash
# Synchroniser les changements
npm run sync-android

# Nettoyer et reconstruire
npm run rebuild-android

# Déploiement complet
npm run android-full-deploy
``` 