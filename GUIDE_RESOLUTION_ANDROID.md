# 🚨 Guide de Résolution - Erreur Google Auth Android

## ⚠️ **PROBLÈME DÉTECTÉ**
**Erreur lors de la connexion. Veuillez réessayer.** sur l'application Android

## 🔍 **DIAGNOSTIC RAPIDE**

### 1. **Vérifier les Logs Android**
```bash
# Suivre les logs en temps réel
adb logcat | grep -E "(CartelNancy|GoogleAuth|Firebase|ERROR)"

# Filtrer par tag spécifique
adb logcat -s CartelNancy:V GoogleAuth:V Firebase:V
```

### 2. **Utiliser le Test de Diagnostic**
Ouvrir `test-android-google-auth.html` dans le navigateur pour un diagnostic complet.

## 🛠️ **SOLUTIONS IMMÉDIATES**

### **Solution 1 : Reconstruire et Synchroniser**
```bash
# 1. Build de l'application
npm run build

# 2. Synchronisation Capacitor
npx cap sync android

# 3. Clean et rebuild
cd android
./gradlew clean
./gradlew assembleDebug
cd ..

# 4. Réinstaller l'APK
adb uninstall com.cartelnancy.app
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### **Solution 2 : Vérifier la Configuration**
```bash
./test-google-auth-setup.sh
```

## 🚨 **PROBLÈMES COURANTS ET SOLUTIONS**

### **Problème 1 : Plugin Non Initialisé**
**Symptôme** : Erreur "Google Sign-In not configured"
**Solution** : Vérifier l'initialisation dans le code

### **Problème 2 : Permissions Manquantes**
**Symptôme** : Erreur de permission ou d'accès
**Solution** : Vérifier `AndroidManifest.xml`

### **Problème 3 : Configuration Google Services**
**Symptôme** : Erreur "Invalid client" ou "Network error"
**Solution** : Vérifier `google-services.json`

### **Problème 4 : Google Play Services**
**Symptôme** : Erreur "Sign in failed"
**Solution** : Vérifier que Google Play Services est à jour

## 🔧 **VÉRIFICATIONS TECHNIQUES**

### 1. **Vérifier la Configuration Capacitor**
```typescript
// Dans capacitor.config.ts
GoogleAuth: {
  androidClientId: '402641775282-i2ejmla43c02r1t45u1ar4btm717bq6t.apps.googleusercontent.com',
  // ... autres configurations
}
```

### 2. **Vérifier le Code d'Authentification**
```typescript
// Dans firebase.ts
export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Vérifier que le plugin est disponible
      if (!GoogleAuth) {
        throw new Error('Plugin Google Auth non disponible');
      }
      
      // Initialiser le plugin Google Auth
      await GoogleAuth.initialize();
      console.log('✅ Plugin Google Auth initialisé');
      
      // Authentification native
      const user = await GoogleAuth.signIn();
      // ... reste du code
    } catch (error) {
      console.error('Erreur Google Auth native:', error);
      throw error;
    }
  }
}
```

### 3. **Vérifier les Permissions Android**
```xml
<!-- Dans AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.GET_ACCOUNTS" />
<uses-permission android:name="android.permission.USE_CREDENTIALS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 📱 **TEST SUR APPAREIL PHYSIQUE**

### 1. **Préparer l'Appareil**
- Activer le **mode développeur**
- Activer le **débogage USB**
- Autoriser l'**installation d'applications** depuis des sources inconnues

### 2. **Installer et Tester**
```bash
# Installer l'APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Suivre les logs
adb logcat | grep -E "(CartelNancy|GoogleAuth|Firebase)"
```

### 3. **Tester l'Authentification**
1. Ouvrir l'application
2. Taper sur le bouton admin (🔑)
3. Observer le comportement et les erreurs
4. Vérifier les logs en temps réel

## 🔍 **DIAGNOSTIC AVANCÉ**

### **Utiliser le Test de Diagnostic**
1. Ouvrir `test-android-google-auth.html` dans le navigateur
2. Exécuter tous les tests disponibles
3. Analyser les résultats et les erreurs
4. Suivre les recommandations affichées

### **Vérifier Google Cloud Console**
1. Aller sur https://console.cloud.google.com/
2. Vérifier que l'application est configurée pour Android
3. Confirmer les URIs de redirection autorisés
4. Vérifier les quotas et les limites

## 📊 **CHECKLIST DE RÉSOLUTION**

- [ ] **Logs vérifiés** avec `adb logcat`
- [ ] **Configuration validée** avec `./test-google-auth-setup.sh`
- [ ] **Application reconstruite** et synchronisée
- [ ] **APK réinstallé** sur l'appareil
- [ ] **Test de diagnostic** exécuté
- [ ] **Erreurs spécifiques** identifiées
- [ ] **Solutions appliquées** selon le diagnostic

## 🚀 **PROCHAINES ÉTAPES**

1. **Exécuter le diagnostic** avec `test-android-google-auth.html`
2. **Vérifier les logs** avec `adb logcat`
3. **Reconstruire l'application** si nécessaire
4. **Tester sur appareil physique**
5. **Analyser les erreurs** et appliquer les solutions

## 📞 **SUPPORT**

### **Outils de Diagnostic**
- `test-android-google-auth.html` - Test de diagnostic complet
- `./test-google-auth-setup.sh` - Vérification de la configuration
- `adb logcat` - Logs Android en temps réel

### **Documentation**
- **Guide de Test** : `GUIDE_TEST_GOOGLE_AUTH.md`
- **État de la Configuration** : `ETAT_FINAL_CONFIGURATION.md`

---

## 🎯 **OBJECTIF**

**Résoudre l'erreur de connexion Google sur Android pour permettre une authentification native fluide et professionnelle.**

**Suivez ce guide étape par étape pour identifier et résoudre le problème !** 🚀
