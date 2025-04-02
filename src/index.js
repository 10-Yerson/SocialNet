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
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  preflightContinue: true, 
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));  
app.options("*", cors(corsOptions)); // Manejar preflight correctamente
 

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