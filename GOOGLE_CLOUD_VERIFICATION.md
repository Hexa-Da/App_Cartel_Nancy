# Vérification Google Cloud Console - Erreur 12500

## Erreur actuelle
- **Code** : 12500
- **Message** : "Sign in failed. The app is misconfigured for Google Sign-In"
- **SHA-1 actuel** : `B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C`

## Étapes de vérification obligatoires

### 1. Accéder à Google Cloud Console
1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionne le projet **`cummap-7afee`**
3. Assure-toi d'être connecté avec le bon compte Google

### 2. Vérifier les APIs activées
**APIs & Services > Library**
Recherche et active ces APIs :
- ✅ **Google Sign-In API** (obligatoire)
- ✅ **Google Identity Services API** (obligatoire)
- ✅ **Google People API** (recommandé)

### 3. Vérifier OAuth Consent Screen
**APIs & Services > OAuth consent screen**
- **App name** : Cartel Nancy
- **User support email** : [ton email]
- **Developer contact information** : [ton email]
- **Scopes** : 
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
- **Test users** : **AJOUTE TON EMAIL GOOGLE ICI** (obligatoire si en mode test)

### 4. Vérifier les Credentials
**APIs & Services > Credentials > OAuth 2.0 Client IDs**

#### Client Android (OBLIGATOIRE)
- **Type** : Android
- **Package name** : `com.cartelnancy.app`
- **SHA-1 certificate fingerprint** : `B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C`
- **Client ID** : `402641775282-t7ehsmbbq39hc08v47tsq19hjfjkr1p6.apps.googleusercontent.com`

#### Client Web
- **Type** : Web application
- **Authorized JavaScript origins** : 
  - `https://localhost:8100`
  - `https://localhost:3000`
  - `https://localhost`
- **Client ID** : `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`

### 5. Vérifier Firebase Console
**Firebase Console > Authentication > Sign-in method**
- **Google** : Activé
- **Project support email** : Configuré

## Problèmes courants avec l'erreur 12500

### ❌ Problème 1 : Client Android manquant
**Symptôme** : Pas de client de type "Android" dans les credentials
**Solution** : Créer un nouveau client Android avec les bonnes informations

### ❌ Problème 2 : SHA-1 incorrect
**Symptôme** : Le SHA-1 dans Google Cloud Console ne correspond pas
**Solution** : Mettre à jour le SHA-1 avec `B9:3D:0D:C1:43:08:B8:97:BA:FD:A3:0A:CD:92:FA:90:85:41:49:8C`

### ❌ Problème 3 : Package name incorrect
**Symptôme** : Le package name n'est pas `com.cartelnancy.app`
**Solution** : Corriger le package name

### ❌ Problème 4 : APIs non activées
**Symptôme** : Google Sign-In API ou Google Identity Services API non activées
**Solution** : Activer les APIs manquantes

### ❌ Problème 5 : OAuth Consent Screen non configuré
**Symptôme** : Pas d'email dans les test users ou configuration incomplète
**Solution** : Configurer OAuth Consent Screen et ajouter ton email

## Étapes de résolution

### Étape 1 : Vérifier et corriger
1. Suivre toutes les vérifications ci-dessus
2. Corriger les problèmes trouvés
3. Attendre 5-10 minutes pour la propagation

### Étape 2 : Télécharger le nouveau google-services.json
1. **Firebase Console > Project Settings**
2. **General tab**
3. **Your apps > App Android**
4. **Download google-services.json**
5. Remplacer le fichier dans `android/app/google-services.json`

### Étape 3 : Rebuild l'application
```bash
npm run clean-android
npm run sync-android
npm run android-full-deploy
```

### Étape 4 : Test
1. Ouvrir l'application sur Android
2. Cliquer sur le bouton Admin
3. Vérifier que l'erreur 12500 a disparu

## Vérification finale

Après avoir suivi toutes les étapes, l'erreur 12500 devrait disparaître. Si elle persiste :

1. **Vérifier que tu utilises le bon compte Google** sur ton téléphone
2. **Vérifier que Google Play Services est à jour**
3. **Essayer sur un autre appareil ou émulateur**
4. **Attendre 24h** pour la propagation complète des changements

## Contact pour diagnostic

Si l'erreur persiste après toutes ces vérifications, fournis :
1. Une capture d'écran de la page Credentials (masquer les infos sensibles)
2. Une capture d'écran de OAuth Consent Screen
3. La liste des APIs activées 