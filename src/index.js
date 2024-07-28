const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');


const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);

app.listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
});
