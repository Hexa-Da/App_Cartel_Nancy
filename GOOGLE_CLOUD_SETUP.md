# Configuration Google Cloud Console - Cartel Nancy

## Vérification de la configuration OAuth

### 1. Accéder à Google Cloud Console
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionner le projet `cummap-7afee`
3. Aller dans "APIs & Services" > "Credentials"

### 2. Vérifier les OAuth 2.0 Client IDs

#### Client ID Android
- **Type**: Android
- **Package name**: `com.cartelnancy.app`
- **SHA-1 fingerprint**: `b93d0dc14308b897bafda30acd92fa908541498c`
- **Client ID**: `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`

#### Client ID Web
- **Type**: Web application
- **Authorized JavaScript origins**: 
  - `https://localhost:8100`
  - `https://localhost:3000`
  - `https://localhost`
- **Authorized redirect URIs**:
  - `https://localhost:8100`
  - `https://localhost:3000`
  - `https://localhost`
- **Client ID**: `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`

#### Client ID iOS
- **Type**: iOS
- **Bundle ID**: `com.cartelnancy.app`
- **Client ID**: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com`

### 3. Vérifier les APIs activées

Assurez-vous que les APIs suivantes sont activées :
- Google+ API
- Google Identity API
- Google Sign-In API

### 4. Vérifier la configuration OAuth consent screen

1. Aller dans "OAuth consent screen"
2. Vérifier que l'application est configurée
3. Ajouter les scopes nécessaires :
   - `profile`
   - `email`

### 5. Générer un nouveau SHA-1 fingerprint (si nécessaire)

Si le SHA-1 fingerprint est incorrect, générez-en un nouveau :

```bash
# Pour le debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Pour le release (si vous avez un keystore)
keytool -list -v -keystore cartel-nancy.keystore -alias your-alias
```

### 6. Mettre à jour le SHA-1 fingerprint

1. Copier le nouveau SHA-1 fingerprint
2. Aller dans "Credentials" > "OAuth 2.0 Client IDs"
3. Modifier le client ID Android
4. Mettre à jour le SHA-1 fingerprint
5. Télécharger le nouveau `google-services.json`

### 7. Vérifier les domaines autorisés

Dans "OAuth consent screen" > "Authorized domains", ajouter :
- `localhost`
- Votre domaine de production (si applicable)

## Test de la configuration

### 1. Test avec l'application
1. Reconstruire l'application : `npm run android-full-deploy`
2. Tester la connexion Google Auth
3. Vérifier les logs pour les erreurs détaillées

### 2. Test avec Google OAuth Playground
1. Aller sur [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Configurer avec votre client ID
3. Tester l'authentification

## Problèmes courants

### "Something went wrong"
- Vérifier que le SHA-1 fingerprint est correct
- Vérifier que le package name correspond
- Vérifier que Google Play Services est à jour
- Vérifier que l'application est configurée pour Android

### "Invalid client"
- Vérifier que le client ID est correct
- Vérifier que le client ID correspond à la plateforme

### "Access blocked"
- Vérifier que l'application est publiée dans OAuth consent screen
- Vérifier que les domaines sont autorisés

## Commandes utiles

```bash
# Vérifier le SHA-1 fingerprint actuel
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Reconstruire l'application
npm run android-full-deploy

# Synchroniser les changements
npm run sync-android
``` 