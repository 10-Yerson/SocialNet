const express = require('express');
const { createServer } = require('http');
const connectDB = require('./config/db');
const routes = require('./routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('./middleware/compression');
const { initSocket } = require('./config/socket');
require('dotenv').config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear cookies
app.use(cookieParser());

// Middleware de CORS (Debe ir antes de las rutas)
app.use(cors({
  origin: process.env.FRONTEND_URL, // Permitir solicitudes desde el frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],// Permitir estos métodos
  allowedHeaders: ["Content-Type", "Authorization"], // Permitir estos headers
  credentials: true // Permitir cookies y autenticación
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // Asegurar que incluya OPTIONS
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).send(); // Responder 204 (sin contenido) en lugar de 200
  }

  next();
});


// Middleware para compresión
app.use(compression);

// Conexión a MongoDB
connectDB();

// Configuración de rutas
app.use(routes);

// Inicializar Socket.io
initSocket(server);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});