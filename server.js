const express = require('express');
const path = require('path');
const app = express();

// Servir les fichiers statiques du dossier build (créé après npm run build)
app.use(express.static(path.join(__dirname, 'build')));

// Pour toutes les autres routes, renvoyer index.html (gestion du routage React)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
