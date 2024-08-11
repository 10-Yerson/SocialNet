const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/authMiddleware');

// Rutas para usuarios
router.get('/', auth, authorize('admin'), userController.getUsers); // Solo accesible para administradores
router.get('/:id', auth, authorize('user', 'admin'), userController.getUserById); // Accesible para usuarios y administradores
router.put('/:id', auth, authorize('user', 'admin'), userController.updateUser); // Accesible para usuarios y administradores
router.delete('/:id', auth, authorize('admin'), userController.deleteUser); // Solo accesible para administradores

module.exports = router;
