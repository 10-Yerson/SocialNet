const express = require('express');
const connectDB = require('./config/db');
const routes = require('./routes')
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { initializeSocket } = require('./config/socketConfig');

const app = express();
const port = process.env.PORT || 5000;

// Crear el servidor HTTP con Express
const server = http.createServer(app);
// Inicializar Socket.io
initializeSocket(server);


// Middleware para parsear JSON
app.use(express.json());

// Middleware para CORS
app.use(cors());

// Conexión a MongoDB
connectDB();

app.use(routes)

app.listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
});
