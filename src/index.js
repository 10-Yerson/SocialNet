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

console.log(process.env.FRONTEND_URL); // Verificar la URL permitida en CORS
// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear cookies
app.use(cookieParser());

// Middleware de CORS (Debe ir antes de las rutas)
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware de CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  

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