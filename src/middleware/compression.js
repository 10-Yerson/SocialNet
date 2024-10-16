// src/middleware/compression.js
const compression = require('compression');

const compress = compression({
    threshold: 1024, // Configuración para comprimir respuestas mayores a 1KB
});

module.exports = compress;
