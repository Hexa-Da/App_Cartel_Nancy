# Configuration du Code Administrateur

## 🔐 Code d'accès par défaut
Le code d'accès administrateur par défaut est : **984929**

## 📁 Configuration

### 1. Fichier de configuration
Le code admin est stocké dans `src/config/admin.ts` qui est **ignoré par Git** pour des raisons de sécurité.

### 2. Modification du code
Pour changer le code admin :
1. Ouvrez `src/config/admin.ts`
2. Modifiez la valeur de `ADMIN_CODE`
3. Redémarrez l'application

### 3. Fichier d'exemple
Un fichier `src/config/admin.example.ts` est fourni comme modèle.

## ⚠️ Sécurité
- **NE COMMITEZ JAMAIS** le fichier `admin.ts` sur GitHub
- Le fichier est déjà dans `.gitignore`
- Changez le code par défaut en production

## 🚀 Utilisation
1. Cliquez sur l'icône admin dans le header
2. Saisissez le code : **984929**
3. Accédez aux fonctionnalités d'administration

## 🔧 Développement
Pour les développeurs :
```bash
# Copier le fichier d'exemple
cp src/config/admin.example.ts src/config/admin.ts

# Modifier le code dans admin.ts
# Redémarrer l'application
npm run dev
```
