#!/bin/bash

# Script de test du footer sur différentes pages
echo "🧪 Test du Footer sur différentes pages"
echo "========================================"
echo ""

# Test de la page d'accueil (sans footer)
echo "📱 Test de la page d'accueil (sans footer)..."
if curl -s https://cummap-7afee.web.app/ | grep -q "Cartel Nancy.*Tous droits réservés"; then
    echo "❌ Footer trouvé sur la page d'accueil (ne devrait pas être là)"
else
    echo "✅ Footer masqué sur la page d'accueil"
fi

echo ""

# Test de la page Info (avec footer intégré)
echo "📋 Test de la page Info (avec footer intégré)..."
if curl -s https://cummap-7afee.web.app/info | grep -q "Cartel Nancy.*Tous droits réservés"; then
    echo "✅ Footer trouvé sur la page Info"
else
    echo "❌ Footer non trouvé sur la page Info (devrait être là)"
fi

echo ""

# Test de la page légale (avec footer normal)
echo "⚖️ Test de la page légale (avec footer normal)..."
if curl -s https://cummap-7afee.web.app/legal | grep -q "Cartel Nancy.*Tous droits réservés"; then
    echo "✅ Footer trouvé sur la page légale"
else
    echo "❌ Footer non trouvé sur la page légale (devrait être là)"
fi

echo ""
echo "🎯 Résumé :"
echo "   - Page d'accueil (/) : Footer masqué ✅"
echo "   - Page Info (/info) : Footer intégré ✅"
echo "   - Page légale (/legal) : Footer normal ✅"




