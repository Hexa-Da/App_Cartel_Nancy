# Système de Z-Index

Ce document décrit la hiérarchie des niveaux de z-index utilisés dans l'application Cartel Nancy.

## Vue d'ensemble

Le système de z-index est organisé en niveaux logiques pour éviter les conflits et faciliter la maintenance. Tous les z-index sont définis comme variables CSS dans `tokens.css`.

## Hiérarchie des niveaux

### Niveau Base (1-10)
**Variable : `--z-base` (1)**
- Contenu normal de la page
- Éléments de base du DOM

**Variable : `--z-content-overlay` (2)**
- Overlays légers au-dessus du contenu
- Éléments de transition

**Variable : `--z-content` (10)**
- Éléments de contenu importants
- Composants interactifs standards

**Variable : `--z-content-high` (100)**
- Éléments de contenu prioritaires
- Badges, tooltips, notifications légères

### Niveau Header (1000-1100)
**Variable : `--z-header` (1000)**
- Navigation fixe (Header et BottomNav)
- Éléments de navigation principaux

**Variable : `--z-header-overlay` (1100)**
- Éléments au-dessus du header
- Dropdowns de navigation, menus

### Niveau Modal (2000-2100)
**Variable : `--z-modal` (2000)**
- Modales et dialogs
- Fenêtres de dialogue principales

**Variable : `--z-modal-overlay` (2100)**
- Overlays de modales (backdrop)
- Fond sombre derrière les modales

### Niveau Popup (3000-3100)
**Variable : `--z-popup` (3000)**
- Popups et messages flottants
- Notifications toast, alertes

**Variable : `--z-popup-overlay` (3100)**
- Overlays de popups
- Fond derrière les popups

### Niveau Loader (9999)
**Variable : `--z-loader` (9999)**
- Écran de chargement
- Loader global de l'application

### Niveau Max (10000)
**Variable : `--z-max` (10000)**
- Niveau maximum
- Popups spéciales, form overlays critiques

### Niveau Below (-1)
**Variable : `--z-below` (-1)**
- En dessous du contenu
- Éléments de fond, arrière-plans

## Règles d'utilisation

1. **Toujours utiliser les variables CSS** : Ne jamais utiliser de valeurs hardcodées pour les z-index
2. **Respecter la hiérarchie** : Ne pas créer de nouveaux niveaux sans justification
3. **Documenter les exceptions** : Si un z-index personnalisé est nécessaire, documenter pourquoi
4. **Tester les superpositions** : Vérifier que les éléments s'affichent correctement sur tous les écrans

## Exemples d'utilisation

```css
/* Header fixe */
.header {
  z-index: var(--z-header);
}

/* Modal avec overlay */
.modal-overlay {
  z-index: var(--z-modal-overlay);
}

.modal {
  z-index: var(--z-modal);
}

/* Tooltip */
.tooltip {
  z-index: var(--z-content-high);
}

/* Loader global */
.loader {
  z-index: var(--z-loader);
}
```

## Maintenance

- Les valeurs sont définies dans `src/theme/tokens.css`
- Toute modification doit être documentée ici
- Tester sur mobile et desktop après modification

