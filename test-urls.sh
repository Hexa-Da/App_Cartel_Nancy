#!/bin/bash

# Script de test des URLs pour Cartel Nancy
echo "🧪 Test des URLs de Cartel Nancy"
echo "=================================="
echo ""

# Test de la page d'accueil
echo "📱 Test de la page d'accueil..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.web.app/ | grep -q "200"; then
    echo "✅ Page d'accueil accessible"
else
    echo "❌ Page d'accueil non accessible"
fi

echo ""

# Test de la page légale
echo "📋 Test de la page légale..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.web.app/legal | grep -q "200"; then
    echo "✅ Page légale accessible"
else
    echo "❌ Page légale non accessible"
fi

echo ""

# Test du domaine alternatif
echo "🌐 Test du domaine alternatif..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/ | grep -q "200"; then
    echo "✅ Domaine alternatif accessible"
else
    echo "❌ Domaine alternatif non accessible"
fi

echo ""
echo "🎯 URLs à configurer dans Google Cloud :"
echo "   - Page d'accueil : https://cummap-7afee.web.app/"
echo "   - Pages légales (confidentialité + conditions) : https://cummap-7afee.web.app/legal"
echo ""
echo "🚀 Votre application est prête pour la validation Google Cloud !"
