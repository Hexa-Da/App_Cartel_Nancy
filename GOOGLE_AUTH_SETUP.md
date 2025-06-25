# Configuration Google Auth pour iOS et Android

## Problèmes résolus

### 1. iOS - AppDelegate.swift
- ✅ Ajout de l'import `GoogleSignIn`
- ✅ Gestion des URL schemes dans `application(_:open:options:)`

### 2. iOS - Info.plist
- ✅ Ajout des URL schemes pour Google Auth
- ✅ Configuration du `REVERSED_CLIENT_ID`

### 3. Configuration Capacitor
- ✅ Correction des client IDs dans `capacitor.config.ts`
- ✅ Ajout du `iosClientId` spécifique

### 4. Gestion d'erreur améliorée
- ✅ Logs détaillés pour le diagnostic
- ✅ Gestion spécifique des erreurs courantes

## Étapes de reconstruction

### Pour Android :
```bash
npm run rebuild-android
```

### Pour iOS :
```bash
npm run rebuild-ios
```

## Vérifications à faire

### 1. Google Cloud Console
Vérifiez que vous avez configuré :
- ✅ OAuth 2.0 Client IDs pour Android et iOS
- ✅ Package name Android : `com.cartelnancy.app`
- ✅ Bundle ID iOS : `com.cartelnancy.app`
- ✅ SHA-1 fingerprint Android configuré

### 2. Firebase Console
Vérifiez que :
- ✅ Le projet Firebase est correctement configuré
- ✅ Les fichiers `google-services.json` et `GoogleService-Info.plist` sont à jour
- ✅ L'authentification Google est activée

### 3. Variables d'environnement
Vérifiez que `.env` contient :
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.europe-west1.firebasedatabase.app
```

## Dépannage

### Erreur "Network error"
- Vérifiez la connexion internet
- Redémarrez l'application

### Erreur "Popup blocked"
- Sur iOS : Vérifiez les paramètres de confidentialité
- Sur Android : Vérifiez les permissions de l'application

### Erreur "Invalid client"
- Vérifiez que les client IDs correspondent dans `capacitor.config.ts`
- Vérifiez la configuration Google Cloud Console

### Erreur "Sign in failed"
- Vérifiez que l'utilisateur a un compte Google valide
- Vérifiez que l'application est autorisée dans Google Cloud Console

## Logs de diagnostic

Les logs détaillés sont maintenant affichés dans la console :
- `Tentative de connexion Google Auth native...`
- `Google Auth initialisé avec succès`
- `Connexion Google réussie`
- `Credentials Firebase créés`
- `Connexion Firebase réussie`

## Commandes utiles

```bash
# Synchroniser les changements
npm run sync-android
npm run sync-ios

# Nettoyer et reconstruire
npm run rebuild-android
npm run rebuild-ios

# Voir les logs en temps réel (Android)
adb logcat | grep -E "(Google|Firebase|Auth)"

# Voir les logs en temps réel (iOS)
xcrun simctl spawn booted log stream --predicate 'process == "App"'
``` 