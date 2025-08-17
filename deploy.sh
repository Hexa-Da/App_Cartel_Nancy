#!/bin/bash

# Script de déploiement pour Cartel Nancy
# Ce script construit et déploie l'application sur Firebase

echo "🚀 Déploiement de Cartel Nancy..."

# Vérifier que Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI n'est pas installé. Installez-le avec : npm install -g firebase-tools"
    exit 1
fi

# Vérifier que l'utilisateur est connecté à Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Firebase. Connectez-vous avec : firebase login"
    exit 1
fi

echo "✅ Firebase CLI vérifié"

# Nettoyer le build précédent
echo "🧹 Nettoyage du build précédent..."
rm -rf dist/

# Installer les dépendances si nécessaire
echo "📦 Installation des dépendances..."
npm install

# Construire l'application
echo "🔨 Construction de l'application..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "dist" ]; then
    echo "❌ La construction a échoué. Vérifiez les erreurs ci-dessus."
    exit 1
fi

echo "✅ Application construite avec succès"

# Déployer sur Firebase
echo "🚀 Déploiement sur Firebase..."
firebase deploy

# Vérifier le déploiement
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Déploiement réussi !"
    echo ""
    echo "📱 Votre application est maintenant accessible sur :"
    echo "   - https://cummap-7afee.firebaseapp.com/"
    echo "   - https://cummap-7afee.web.app/"
    echo ""
    echo "📋 Pages légales disponibles :"
    echo "   - Politique de confidentialité : https://cummap-7afee.firebaseapp.com/privacy (redirige vers /legal)"
    echo "   - Conditions d'utilisation : https://cummap-7afee.firebaseapp.com/terms (redirige vers /legal)"
    echo "   - Page légale complète : https://cummap-7afee.firebaseapp.com/legal"
    echo ""
    echo "🔗 Vous pouvez maintenant configurer Google Cloud avec ces URLs"
else
    echo "❌ Le déploiement a échoué. Vérifiez les erreurs ci-dessus."
    exit 1
fi
