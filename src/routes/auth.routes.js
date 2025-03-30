const express = require('express')
const router = express.Router();
const { registerUser, registerAdmin, login, logout, checkAuth} = require('../controllers/authController');
const { auth } = require('../middleware/authMiddleware');

// Rutas de registro
router.post('/register', registerUser);
router.post('/register/admin', registerAdmin);

// Ruta de login unificada para usuarios y administradores
router.post('/login', login);
router.post('/logout', logout);
router.get('/check-auth', auth, checkAuth); // Nueva ruta protegida


module.exports = router;
