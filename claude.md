# 📘 CARTEL NANCY - ARCHITECTURE & DOCUMENTATION

Ce fichier documente les standards architecturaux stricts du projet.
**Toute modification de code doit respecter ces directives.**

## 1. 📂 STRUCTURE DU PROJET

L'application suit une structure **Colocated** (Code + Style au même endroit) et **Feature-First**.

src/
├── components/           # Composants UI partagés
│   ├── forms/            # Formulaires spécifiques (Venue, Match, etc.)
│   ├── map/              # Sous-composants de la carte Leaflet
│   └── [Feature]/        # Chaque composant a son dossier si complexe
│       ├── Feature.tsx
│       └── Feature.css   # ⚠️ CSS TOUJOURS colocalisé
├── pages/                # Vues principales (Home, Info, Map...)
├── theme/                # 🎨 SOURCE DE VÉRITÉ DU DESIGN
│   ├── tokens.css        # Variables globales (Couleurs, Spacing, Z-Index)
│   ├── reset.css         # Reset CSS moderne
│   └── platform/         # Hacks spécifiques (ios.css, android.css)
├── contexts/             # États globaux séparés par domaine (Nav, Modal, Form)
├── services/             # Logique métier pure (Firebase, Logger, Calculations)
├── hooks/                # Logique React réutilisable (useSafeAreas, useMapState)
└── config/               # Configuration statique (Capacitor, Analytics)


## 2. 🎨 SYSTÈME DE DESIGN (CSS)

**RÈGLE D'OR :** Aucune "Valeur Magique" (Magic Number) n'est tolérée. Utilisez les tokens.

### A. Variables (Tokens)

Toutes les valeurs doivent provenir de `src/theme/tokens.css`.

* **Spacing :** `var(--spacing-sm)`, `var(--spacing-md)`, `var(--spacing-lg)`
* **Radius :** `var(--radius-sm)` (8px), `var(--radius-md)` (12px)
* **Shadows :** `var(--shadow-sm)`, `var(--shadow-md)`
* **Couleurs :** `var(--primary-color)`, `var(--bg-color)`, `var(--text-color)`

### B. Z-Index (Système de Couches)

Ne jamais mettre de valeur arbitraire (ex: `z-index: 999`).

* `var(--z-base)` : 1 (Contenu standard)
* `var(--z-header)` : 1000 (Barres fixes)
* `var(--z-modal)` : 2000 (Popups, Modales)
* `var(--z-popup)` : 3000 (Alertes critiques)

### C. Safe Areas & Mobile

Pour gérer l'encoche et la barre de navigation :

* Utiliser `padding-top: var(--safe-top)` (qui inclut `env()`).
* Utiliser `padding-bottom: var(--safe-bottom)`.
* **Jamais** de `height: 100vh` sur mobile (ça casse avec le clavier). Utiliser `min-height: 100%` ou `dvh`.

## 3. 🧠 GESTION DE L'ÉTAT & LOGIQUE

### A. Séparation des Responsabilités

* **Composant (.tsx) :** Uniquement le rendu (UI) et l'appel aux hooks. < 150 lignes.
* **Hooks (use...) :** Toute la logique d'état (`useState`, `useEffect`).
* **Services (.ts) :** Appels API, Firebase, calculs complexes.

### B. Contextes

Ne plus jamais utiliser un contexte monolithique.

* **NavigationContext :** Onglets, Routing interne.
* **ModalContext :** Gestion des ouvertures de popups.
* **FormContext :** Données volatiles des formulaires.

## 4. 📱 CAPACITOR & NATIF

* **Points d'entrée :** `src/config/capacitor.ts` centralise la config.
* **Platform Specific :** Utiliser les classes `.ios` ou `.md` (Material Design) injectées dans le body uniquement via `src/theme/platform/`.
* **Clavier :** Le layout ne doit pas se casser quand le clavier s'ouvre. Utiliser le mode `overlay` ou `resize` configuré globalement.

## 5. 🧹 QUALITÉ DU CODE

* Pas de `console.log` en production. Utiliser `Logger.log()`.
* Pas de code mort. Si c'est commenté, c'est supprimé.
* Pas de styles inline. `style={{ marginTop: 20 }}` est **INTERDIT**. Extraire dans le fichier `.css`.
