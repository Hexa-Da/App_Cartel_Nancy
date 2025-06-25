# Checklist Google Cloud Console - Erreur 12500

## Erreur détectée : code 12500
**"Sign in failed. The app is misconfigured for Google Sign-In."**

## Configuration actuelle ✅
- **Package name** : `com.cartelnancy.app`
- **SHA-1 fingerprint** : `B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C`
- **Client ID Android** : `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`
- **Client ID Web** : `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`

## À vérifier dans Google Cloud Console

### 1. APIs activées
Aller dans **APIs & Services > Library** et activer :
- ✅ **Google Sign-In API**
- ✅ **Google Identity Services API** 
- ✅ **Google People API** (optionnel mais recommandé)

### 2. OAuth Consent Screen
Aller dans **APIs & Services > OAuth consent screen** :
- **App name** : Cartel Nancy
- **User support email** : [votre email]
- **Developer contact information** : [votre email]
- **Scopes** : 
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
- **Test users** : Ajouter votre email Google

### 3. Credentials - Client ID Android
Aller dans **APIs & Services > Credentials > OAuth 2.0 Client IDs** :
- **Type** : Android
- **Package name** : `com.cartelnancy.app`
- **SHA-1 certificate fingerprint** : `B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C`
- **Client ID** : `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`

### 4. Firebase Console
Aller dans **Firebase Console > Authentication > Sign-in method** :
- **Google** : Activé
- **Project support email** : Configuré
- **Web SDK configuration** : Client ID web correct

## Problèmes courants avec l'erreur 12500

### 1. SHA-1 incorrect
- Vérifier que le SHA-1 dans Google Cloud Console correspond exactement à celui généré
- Pour debug : `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`

### 2. Package name incorrect
- Vérifier que le package name dans Google Cloud Console est exactement `com.cartelnancy.app`

### 3. APIs non activées
- Vérifier que Google Sign-In API est activée
- Vérifier que Google Identity Services API est activée

### 4. OAuth Consent Screen non configuré
- Vérifier que l'application est configurée dans OAuth consent screen
- Vérifier que votre email est dans les test users

### 5. Client ID Android manquant
- Vérifier qu'il y a bien un client ID de type Android
- Vérifier que le client ID correspond à celui dans `google-services.json`

## Étapes de résolution

1. **Vérifier toutes les APIs** sont activées
2. **Vérifier OAuth Consent Screen** est configuré
3. **Vérifier le client ID Android** existe et est correct
4. **Télécharger le nouveau google-services.json** si nécessaire
5. **Rebuild l'application** :
   ```bash
   npm run clean-android
   npm run sync-android
   npm run android-full-deploy
   ```

## Test après correction

1. Ouvrir l'application sur Android
2. Cliquer sur le bouton Admin
3. Vérifier que l'erreur 12500 a disparu
4. Si nouvelle erreur, copier les logs pour diagnostic

## Commandes utiles

```bash
# Vérifier le SHA-1 actuel
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Nettoyer et reconstruire
npm run clean-android
npm run sync-android
npm run android-full-deploy
``` 