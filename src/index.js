const express = require('express');
const { createServer } = require('http');
const connectDB = require('./config/db');
const routes = require('./routes');
const cors = require('cors');
const compression = require('./middleware/compression');
const { initSocket } = require('./config/socket'); // Importa la configuración de sockets
require('dotenv').config();

const app = express();
const server = createServer(app); // Crea el servidor HTTP
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

// Inicializar Socket.io
initSocket(server); 

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

