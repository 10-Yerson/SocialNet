const express = require('express')
const router = express.Router();
const { registerUser, registerAdmin, login, logout, checkAuth, getUserInfo} = require('../controllers/authController');
const { auth } = require('../middleware/authMiddleware');

// Rutas de registro
router.get('/check-auth', auth, checkAuth); 
router.get('/user-info', auth, getUserInfo);

router.post('/register', registerUser);
router.post('/register/admin', registerAdmin);

// Ruta de login unificada para usuarios y administradores
router.post('/login', login);
router.post('/logout', logout);


module.exports = router;
