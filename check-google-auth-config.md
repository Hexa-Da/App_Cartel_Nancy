# 🔐 Vérification de la Configuration Google Auth - Cartel Nancy

## 📋 Résumé de la Configuration Actuelle

### ✅ Configuration Capacitor (`capacitor.config.ts`)
```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: '402641775282-1dd873jdnaq0j1o48sgfk8f8kelltblt.apps.googleusercontent.com',
  androidClientId: '402641775282-i2ejmla43c02r1t45u1ar4btm717bq6t.apps.googleusercontent.com',
  iosClientId: '402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com',
  webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
  forceCodeForRefreshToken: true
}
```

### ✅ Configuration Android (`google-services.json`)
- **Package Name**: `com.cartelnancy.app`
- **Android Client ID**: `402641775282-2g2kh1vb785nj0c6o10kqfbeor951lpu.apps.googleusercontent.com`
- **Web Client ID**: `402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com`
- **SHA-1 Fingerprint**: `b93d0dc14308b897bafda30acd92fa908541498c`
- **SHA-256 Fingerprint**: `278f1c0d6e89901235f411e14ff42154692a935dd45b8f15ccd20fc0c1c3bbef`

### ✅ Configuration iOS (`GoogleService-Info.plist`)
- **Bundle ID**: `com.cartelnancy.app`
- **iOS Client ID**: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com`
- **Reversed Client ID**: `com.googleusercontent.apps.402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp`

## 🚨 Problèmes Identifiés

### 1. **Incohérence des Client IDs**
- **Capacitor Config Android**: `402641775282-i2ejmla43c02r1t45u1ar4btm717bq6t.apps.googleusercontent.com`
- **Google Services Android**: `402641775282-2g2kh1vb785nj0c6o10kqfbeor951lpu.apps.googleusercontent.com`
- **Capacitor Config iOS**: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com`
- **Google Services iOS**: `402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com` ✅

### 2. **Configuration Android Manquante**
- Le `google-services.json` contient un client ID différent de celui configuré dans Capacitor
- Risque de conflit d'authentification

### 3. **Deep Link Configuration**
- **Android**: ✅ Configuré dans `AndroidManifest.xml`
- **iOS**: ✅ Configuré dans `Info.plist`

## 🔧 Actions Correctives Requises

### 1. **Synchroniser les Client IDs Android**
```typescript
// Dans capacitor.config.ts, remplacer :
androidClientId: '402641775282-2g2kh1vb785nj0c6o10kqfbeor951lpu.apps.googleusercontent.com'
```

### 2. **Vérifier Google Cloud Console**
- S'assurer que tous les client IDs sont configurés
- Vérifier les URIs de redirection autorisés
- Confirmer les domaines autorisés

### 3. **Tester la Configuration**
Utiliser les fichiers de test créés :
- `test-google-auth.html` - Test général
- `test-capacitor-google-auth.html` - Test spécifique Capacitor

## 📱 Tests à Effectuer

### Android
1. **Build et Installation**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

2. **Test sur Appareil**
   - Installer l'APK
   - Tester le bouton admin
   - Vérifier les logs dans Android Studio

### iOS
1. **Build et Installation**
   ```bash
   npm run build
   npx cap sync ios
   cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App
   ```

2. **Test sur Simulateur/Appareil**
   - Ouvrir dans Xcode
   - Tester le bouton admin
   - Vérifier les logs dans Xcode

## 🐛 Diagnostic des Erreurs Communes

### Erreur "Something went wrong"
- **Cause**: Configuration OAuth incorrecte
- **Solution**: Vérifier les client IDs et URIs de redirection

### Erreur "Network error"
- **Cause**: Problème de connectivité ou configuration
- **Solution**: Vérifier la connectivité et les permissions

### Erreur "Invalid client"
- **Cause**: Client ID incorrect ou non configuré
- **Solution**: Synchroniser les client IDs

## 📞 Support et Ressources

- **Google Cloud Console**: https://console.cloud.google.com/
- **Firebase Console**: https://console.firebase.google.com/
- **Capacitor Documentation**: https://capacitorjs.com/docs/
- **Google Auth Plugin**: https://github.com/CodetrixStudio/CapacitorGoogleAuth

## 🔍 Prochaines Étapes

1. **Corriger les Client IDs** dans `capacitor.config.ts`
2. **Synchroniser** les configurations Android et iOS
3. **Tester** sur appareils physiques
4. **Vérifier** les logs d'erreur
5. **Valider** l'authentification complète
