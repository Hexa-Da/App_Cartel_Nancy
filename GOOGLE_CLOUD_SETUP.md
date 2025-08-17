# Configuration Google Cloud pour Cartel Nancy

## Vue d'ensemble

Ce document explique comment configurer Google Cloud Platform pour permettre l'authentification Google dans votre application Cartel Nancy.

## Étapes de Configuration

### 1. Accès à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet `cummap-7afee`
3. Naviguez vers **APIs & Services** > **OAuth consent screen**

### 2. Configuration du Branding

Dans la section **Branding**, vous devez configurer :

#### Page d'accueil de l'application
- **URL** : `https://cummap-7afee.firebaseapp.com/`
- **Description** : Page principale de l'application Cartel Nancy

#### Lien vers les règles de confidentialité
- **URL** : `https://cummap-7afee.firebaseapp.com/privacy`
- **Description** : Politique de confidentialité de l'application

#### Lien vers les conditions d'utilisation
- **URL** : `https://cummap-7afee.firebaseapp.com/terms`
- **Description** : Conditions d'utilisation de l'application

### 3. Domaines Autorisés

Ajoutez les domaines suivants dans la section **Domaines autorisés** :

1. `cummap-7afee.firebaseapp.com`
2. `cummap-7afee.web.app`

### 4. Déploiement des Pages

Avant de soumettre pour validation, assurez-vous que :

1. **Page d'accueil** (`/`) est accessible et fonctionnelle
2. **Page de confidentialité** (`/privacy`) est accessible
3. **Page des conditions** (`/terms`) est accessible

### 5. Test des URLs

Testez chaque URL pour vérifier qu'elles sont accessibles :

```bash
# Test de la page d'accueil
curl -I https://cummap-7afee.firebaseapp.com/

# Test de la page de confidentialité
curl -I https://cummap-7afee.firebaseapp.com/privacy

# Test de la page des conditions
curl -I https://cummap-7afee.firebaseapp.com/terms
```

### 6. Soumission pour Validation

Une fois toutes les pages accessibles :

1. Cliquez sur **Soumettre pour validation**
2. Remplissez le formulaire de validation
3. Attendez la réponse de Google (généralement 1-2 semaines)

## Structure des Pages Créées

### Page de Confidentialité (`/privacy`)
- Politique de collecte des données
- Utilisation des informations
- Partage des données
- Sécurité
- Droits des utilisateurs

### Page des Conditions (`/terms`)
- Acceptation des conditions
- Description du service
- Compte utilisateur
- Utilisation acceptable
- Propriété intellectuelle
- Limitation de responsabilité

## Déploiement

### Déploiement Local
```bash
npm run dev
```

### Déploiement Firebase
```bash
npm run build
firebase deploy
```

## Vérification

Après déploiement, vérifiez que :

1. ✅ La page d'accueil est accessible
2. ✅ La page de confidentialité est accessible
3. ✅ La page des conditions est accessible
4. ✅ Le footer contient les liens vers les pages légales
5. ✅ L'authentification Google fonctionne

## Support

En cas de problème :
- Email : contact@cartelnancy.fr
- Documentation Firebase : [Firebase Auth](https://firebase.google.com/docs/auth)
- Documentation Google Cloud : [Google Cloud Auth](https://cloud.google.com/identity-platform)

## Notes Importantes

- Les URLs doivent être exactement celles configurées dans Google Cloud
- Les pages doivent être accessibles publiquement (pas de restriction d'accès)
- Le contenu doit être en français (langue de l'application)
- Respectez les directives de Google concernant la confidentialité et les conditions d'utilisation




