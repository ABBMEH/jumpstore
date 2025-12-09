# Projet Site Vitrine

Ce projet est un site vitrine permettant à un commerce de montrer à ses clients les produits qu'il a de disponibles en magasin. L'objectif à terme (v2) est d'évoluer vers une solution e-commerce complète.

## Prérequis
- Node.js
- PostgreSQL
- Live Server (pour le frontend)

## Installation
1. Clonez le dépôt. 
   ```
   git clone https://github.com/ABBMEH/jumpstore.git
   cd jumpstore
   ```
2. Depuis le dossier server, installez les dépendances :  
   ```
   cd server
   npm install
   ```
3. Créez un fichier `.env` dans le dossier server basé sur le modèle de .env.exemple.

## Configuration
Créez un fichier `.env` avec les variables suivantes dans le dossier server :

```
SECRET_KEY=jwt_1234567891234567891234567891

NODE_ENV=dev

COOKIE_SAMESITE=Strict

STORE_DB_USER=user_postgres
STORE_DB_PASSWORD=motdepasse_postgres
STORE_DB_HOST=localhost
STORE_DB_PORT=5432
STORE_DB_NAME=nom_db_postgres

SERVER_PORT=3000

CLIENT_URL=http://localhost:5500

GMAIL_USER=adresse@email.fr
GMAIL_PASS=motdepasse_email
```

## Lancement
- **Backend (dossier Serveur)** :  
  ```
  npm run dev
  ```
  Le serveur démarre en écoute sur le port 3000.
- **Frontend (dossier client)** : Utilisez Live Server pour ouvrir les fichiers HTML (ex. via extension VS Code) sur `http://127.0.0.1:5500`.

## Base de Données
- Utilise PostgreSQL

## Roadmap
- V1 : Site vitrine fonctionnel.
- V2 : Évolution vers un e-commerce complet (panier, paiement, gestion produits).

## Site
```
https://jumpstore.duckdns.org/
```