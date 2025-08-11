#!/bin/bash

# 🔐 Script de Test Google Auth - Cartel Nancy
# Ce script vérifie automatiquement la configuration de l'authentification Google

echo "🔐 === TEST CONFIGURATION GOOGLE AUTH - CARTEL NANCY ==="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté depuis la racine du projet Cartel Nancy${NC}"
    exit 1
fi

print_info "Vérification de la configuration Google Auth..."

# 1. Vérifier la configuration Capacitor
echo ""
echo "📱 === VÉRIFICATION CONFIGURATION CAPACITOR ==="

if grep -q "androidClientId.*402641775282-i2ejmla43c02r1t45u1ar4btm717bq6t" capacitor.config.ts; then
    print_result 0 "Client ID Android correct dans capacitor.config.ts"
else
    print_result 1 "Client ID Android incorrect dans capacitor.config.ts"
fi

if grep -q "iosClientId.*402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp" capacitor.config.ts; then
    print_result 0 "Client ID iOS correct dans capacitor.config.ts"
else
    print_result 1 "Client ID iOS incorrect dans capacitor.config.ts"
fi

if grep -q "webClientId.*402641775282-flmj306kcpqct1hmrific149uhthiqcq" capacitor.config.ts; then
    print_result 0 "Client ID Web correct dans capacitor.config.ts"
else
    print_result 1 "Client ID Web incorrect dans capacitor.config.ts"
fi

# 2. Vérifier la configuration Android
echo ""
echo "🤖 === VÉRIFICATION CONFIGURATION ANDROID ==="

if [ -f "android/app/google-services.json" ]; then
    print_result 0 "Fichier google-services.json présent"
    
    # Vérifier le package name
    if grep -q '"package_name": "com.cartelnancy.app"' android/app/google-services.json; then
        print_result 0 "Package name Android correct"
    else
        print_result 1 "Package name Android incorrect"
    fi
    
    # Vérifier le client ID Android
    if grep -q "402641775282-i2ejmla43c02r1t45u1ar4btm717bq6t" android/app/google-services.json; then
        print_result 0 "Client ID Android présent dans google-services.json"
    else
        print_result 1 "Client ID Android manquant dans google-services.json"
    fi
    
    # Vérifier le client ID Web
    if grep -q "402641775282-flmj306kcpqct1hmrific149uhthiqcq" android/app/google-services.json; then
        print_result 0 "Client ID Web présent dans google-services.json"
    else
        print_result 1 "Client ID Web manquant dans google-services.json"
    fi
else
    print_result 1 "Fichier google-services.json manquant"
fi

# Vérifier le manifest Android
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    print_result 0 "AndroidManifest.xml présent"
    
    # Vérifier le deep link
    if grep -q 'android:scheme="cartelnancy"' android/app/src/main/AndroidManifest.xml; then
        print_result 0 "Deep link configuré dans AndroidManifest.xml"
    else
        print_result 1 "Deep link manquant dans AndroidManifest.xml"
    fi
else
    print_result 1 "AndroidManifest.xml manquant"
fi

# 3. Vérifier la configuration iOS
echo ""
echo "🍎 === VÉRIFICATION CONFIGURATION IOS ==="

if [ -f "ios/App/App/GoogleService-Info.plist" ]; then
    print_result 0 "Fichier GoogleService-Info.plist présent"
    
    # Vérifier le bundle ID
    if grep -q "com.cartelnancy.app" ios/App/App/GoogleService-Info.plist; then
        print_result 0 "Bundle ID iOS correct"
    else
        print_result 1 "Bundle ID iOS incorrect"
    fi
    
    # Vérifier le client ID iOS
    if grep -q "402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp" ios/App/App/GoogleService-Info.plist; then
        print_result 0 "Client ID iOS présent dans GoogleService-Info.plist"
    else
        print_result 1 "Client ID iOS manquant dans GoogleService-Info.plist"
    fi
else
    print_result 1 "Fichier GoogleService-Info.plist manquant"
fi

# Vérifier le Info.plist iOS
if [ -f "ios/App/App/Info.plist" ]; then
    print_result 0 "Info.plist présent"
    
    # Vérifier le deep link
    if grep -q "cartelnancy" ios/App/App/Info.plist; then
        print_result 0 "Deep link configuré dans Info.plist"
    else
        print_result 1 "Deep link manquant dans Info.plist"
    fi
else
    print_result 1 "Info.plist manquant"
fi

# 4. Vérifier les dépendances
echo ""
echo "📦 === VÉRIFICATION DÉPENDANCES ==="

if grep -q "@codetrix-studio/capacitor-google-auth" package.json; then
    print_result 0 "Plugin Google Auth présent dans package.json"
else
    print_result 1 "Plugin Google Auth manquant dans package.json"
fi

if grep -q "firebase" package.json; then
    print_result 0 "Firebase présent dans package.json"
else
    print_result 1 "Firebase manquant dans package.json"
fi

# 5. Vérifier la configuration Firebase
echo ""
echo "🔥 === VÉRIFICATION CONFIGURATION FIREBASE ==="

if [ -f "src/firebase.ts" ]; then
    print_result 0 "Fichier firebase.ts présent"
    
    # Vérifier l'import du plugin Google Auth
    if grep -q "import.*GoogleAuth.*@codetrix-studio/capacitor-google-auth" src/firebase.ts; then
        print_result 0 "Import Google Auth présent dans firebase.ts"
    else
        print_result 1 "Import Google Auth manquant dans firebase.ts"
    fi
    
    # Vérifier la fonction loginWithGoogle
    if grep -q "export async function loginWithGoogle" src/firebase.ts; then
        print_result 0 "Fonction loginWithGoogle présente"
    else
        print_result 1 "Fonction loginWithGoogle manquante"
    fi
else
    print_result 1 "Fichier firebase.ts manquant"
fi

# 6. Résumé et recommandations
echo ""
echo "📋 === RÉSUMÉ ET RECOMMANDATIONS ==="

print_info "Configuration vérifiée. Voici les prochaines étapes :"
echo ""

echo "1. 🔧 Si des erreurs ont été détectées, corrigez-les d'abord"
echo "2. 📱 Synchronisez la configuration :"
echo "   npm run build && npx cap sync android && npx cap sync ios"
echo "3. 🧪 Testez sur appareils physiques :"
echo "   - Android : ./gradlew assembleDebug"
echo "   - iOS : Ouvrir dans Xcode et tester"
echo "4. 🔍 Vérifiez les logs pour diagnostiquer les problèmes"
echo "5. 🌐 Utilisez les fichiers de test HTML créés pour le débogage"

echo ""
echo "🔐 === FIN DU TEST ==="
echo ""

# Retourner le code de sortie approprié
if [ $? -eq 0 ]; then
    print_info "Tous les tests sont passés avec succès !"
    exit 0
else
    print_warning "Certains tests ont échoué. Vérifiez la configuration."
    exit 1
fi
