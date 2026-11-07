# Botloc : frontend (https://bot.ak-47.fr)

Site statique (HTML/CSS/JS, aucune dépendance). Le backend est un projet à part (`botloc-backend`), mais il est atteint par le même domaine : le site renvoie `/api/*` et `/auth/*` vers lui (règles Rewrite de Render).

## Déployer sur Render (Static Site)
1. Pousse ce dossier sur son propre dépôt GitHub.
2. Render > New > Static Site. Build Command : `echo "pas de build"` · Publish Directory : `.`
3. Onglet **Redirects/Rewrites**, ajoute dans cet ordre (Action = Rewrite) :
   - `/api/*` → `https://TON-BACKEND.onrender.com/api/*`
   - `/auth/*` → `https://TON-BACKEND.onrender.com/auth/*`
4. **Settings > Custom Domains** : ajoute `bot.ak-47.fr`, puis chez ton hébergeur DNS crée un CNAME `bot` vers l'adresse `xxx.onrender.com` de ce site.

(Avec un Blueprint, `render.yaml` contient déjà ces règles : remplace seulement `botloc-api.onrender.com`.)

## En local
Dans `config.js`, mets `window.BOTLOC_API = 'http://localhost:3000';` puis `npm start` (http://localhost:5173), avec `FRONTEND_URL=http://localhost:5173` côté backend.

## Connexion
Le bouton envoie vers `/auth/discord`. Au retour, le backend redirige vers `/#token=…` : le script range le jeton dans le `localStorage` et l'envoie dans le header `Authorization`. « Déconnexion » supprime le jeton.
