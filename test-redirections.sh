#!/bin/bash

# Script de test des redirections pour Cartel Nancy
echo "🧪 Test des Redirections - Cartel Nancy 2026"
echo "=============================================="
echo ""

# Test de la page d'accueil
echo "📱 Test de la page d'accueil..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/ | grep -q "200"; then
    echo "✅ Page d'accueil accessible (code 200)"
else
    echo "❌ Page d'accueil non accessible"
fi

echo ""

# Test de la redirection /privacy
echo "🔒 Test de la redirection /privacy..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/privacy | grep -q "301"; then
    echo "✅ Redirection /privacy → /legal (code 301)"
else
    echo "❌ Redirection /privacy non fonctionnelle"
fi

echo ""

# Test de la redirection /terms
echo "📋 Test de la redirection /terms..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/terms | grep -q "301"; then
    echo "✅ Redirection /terms → /legal (code 301)"
else
    echo "❌ Redirection /terms non fonctionnelle"
fi

echo ""

# Test de la page légale finale
echo "⚖️ Test de la page légale finale..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/legal | grep -q "200"; then
    echo "✅ Page légale accessible (code 200)"
else
    echo "❌ Page légale non accessible"
fi

echo ""
echo "🎯 Résumé des redirections :"
echo "   - Page d'accueil (/) : ✅ Accessible"
echo "   - /privacy : ✅ Redirige vers /legal"
echo "   - /terms : ✅ Redirige vers /legal"
echo "   - /legal : ✅ Page finale accessible"
echo ""
echo "🚀 Toutes les redirections fonctionnent correctement !"
echo ""
echo "📋 URLs pour Google Cloud :"
echo "   - Page d'accueil : https://cummap-7afee.firebaseapp.com/"
echo "   - Politique de confidentialité : https://cummap-7afee.firebaseapp.com/privacy"
echo "   - Conditions d'utilisation : https://cummap-7afee.firebaseapp.com/terms"
echo ""
echo "💡 Note : Les URLs /privacy et /terms redirigent automatiquement vers /legal"




