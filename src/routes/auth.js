const express = require('express')
const router = express.Router();
const { registerUser, registerAdmin, login} = require('../controllers/authController');


// Rutas de registro
router.post('/register', registerUser);
router.post('/register/admin', registerAdmin);

// Ruta de login unificada para usuarios y administradores
router.post('/login', login);


module.exports = router;
