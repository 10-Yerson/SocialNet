const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Directorio donde están los archivos de rutas
const routesPath = path.join(__dirname);

// Carga dinámica de las rutas
fs.readdirSync(routesPath).forEach((file) => {
  if (file !== 'index.js') {
    const route = require(path.join(routesPath, file)); // Importa el archivo de ruta
    const routeName = file.split('.')[0]; // Usa el nombre del archivo como la ruta
    router.use(`/api/${routeName}`, route); // Asocia el nombre del archivo a la ruta
  }
});

module.exports = router;
