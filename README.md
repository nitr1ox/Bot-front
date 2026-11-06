# Botloc : frontend

Site statique (HTML/CSS/JS, aucune dépendance). Il parle au backend (`botloc-backend`) à l'adresse définie dans `config.js`.

## Déployer sur Render (Static Site)
1. Pousse ce dossier sur son propre dépôt GitHub.
2. Render > New > Static Site (ou Blueprint avec `render.yaml`).
   Build command : `echo "window.BOTLOC_API = '$API_URL';" > config.js` · Publish directory : `.`
3. Variable `API_URL` = URL du backend, sans slash final (ex. `https://botloc-api.onrender.com`).
4. Reporte l'URL du site dans `FRONTEND_URL` côté backend.

## En local
Modifie `config.js` si ton backend n'est pas sur `http://localhost:3000`, puis :
```
npm start      # http://localhost:5173
```
(`FRONTEND_URL=http://localhost:5173` côté backend.)

## Connexion
Le bouton envoie vers `API/auth/discord`. Au retour, le backend redirige vers `/#token=…` : le script range le jeton dans le `localStorage` et l'envoie dans le header `Authorization` à chaque appel. « Déconnexion » supprime simplement le jeton.
