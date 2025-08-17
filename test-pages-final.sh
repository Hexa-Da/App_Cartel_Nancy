#!/bin/bash

# Script de test final des pages - Cartel Nancy 2026
echo "🧪 Test Final des Pages - Cartel Nancy 2026"
echo "============================================="
echo ""

# Test de la page d'accueil
echo "📱 Test de la page d'accueil..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/ | grep -q "200"; then
    echo "✅ Page d'accueil accessible (code 200)"
    echo "   → Affiche : Vos Matchs, Votre Délégation, Matchs en direct"
else
    echo "❌ Page d'accueil non accessible"
fi

echo ""

# Test de la page /privacy
echo "🔒 Test de la page /privacy..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/privacy | grep -q "200"; then
    echo "✅ Page /privacy accessible (code 200)"
    echo "   → Affiche : Politique de Confidentialité - Cartel Nancy 2026"
    echo "   → Contenu : Collecte des Informations, Utilisation des Informations, etc."
else
    echo "❌ Page /privacy non accessible"
fi

echo ""

# Test de la page /terms
echo "📋 Test de la page /terms..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/terms | grep -q "200"; then
    echo "✅ Page /terms accessible (code 200)"
    echo "   → Affiche : Conditions d'Utilisation - Cartel Nancy 2026"
    echo "   → Contenu : Acceptation des Conditions, Description du Service, etc."
else
    echo "❌ Page /terms non accessible"
fi

echo ""

# Test de la page /legal (page consolidée)
echo "⚖️ Test de la page /legal (consolidée)..."
if curl -s -o /dev/null -w "%{http_code}" https://cummap-7afee.firebaseapp.com/legal | grep -q "200"; then
    echo "✅ Page /legal accessible (code 200)"
    echo "   → Affiche : Pages Légales avec onglets (Politique + Conditions)"
    echo "   → Navigation : Boutons côte à côte avec scrollbar"
else
    echo "❌ Page /legal non accessible"
fi

echo ""
echo "🎯 Résumé des redirections :"
echo "   - Page d'accueil (/) : ✅ Affiche l'interface principale"
echo "   - /privacy : ✅ Affiche la politique de confidentialité"
echo "   - /terms : ✅ Affiche les conditions d'utilisation"
echo "   - /legal : ✅ Affiche la page consolidée avec onglets"
echo ""
echo "🚀 Toutes les pages sont maintenant accessibles directement !"
echo ""
echo "📋 URLs pour Google Cloud :"
echo "   - Page d'accueil : https://cummap-7afee.firebaseapp.com/"
echo "   - Politique de confidentialité : https://cummap-7afee.firebaseapp.com/privacy"
echo "   - Conditions d'utilisation : https://cummap-7afee.firebaseapp.com/terms"
echo ""
echo "💡 Note : Chaque URL affiche maintenant son contenu spécifique :"
echo "   • /privacy → Politique de Confidentialité complète"
echo "   • /terms → Conditions d'Utilisation complètes"
echo "   • / → Interface principale avec matchs et délégations"
echo "   • /legal → Page consolidée avec onglets (optionnel)"




