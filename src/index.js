const express = require('express');
const connectDB = require('./config/db');
const routes = require('./routes');
const cors = require('cors');
const compression = require('./middleware/compression');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para CORS
app.use(cors());

// Middleware para compresión
app.use(compression); // Aplica el middleware de compresión después de cors y json

// Conexión a MongoDB
connectDB();

// Configuración de rutas
app.use(routes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
