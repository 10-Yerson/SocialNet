const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// Rutas para usuarios
router.get('/', auth, authorize('admin'), userController.getUsers); // Solo accesible para administradores
// Ruta para actualizar la imagen de perfil
router.put('/profile/:id', auth, authorize('user'), upload.single('profilePicture'), userController.uploadProfilePicture);
router.get('/:id', auth, authorize('user', 'admin'), userController.getUserById); // Accesible para usuarios y administradores
router.put('/:id', auth, authorize('user', 'admin'), userController.updateUser); // Accesible para usuarios y administradores
router.delete('/:id', auth, authorize('user', 'admin'), userController.deleteUser); // Solo accesible para administradores
router.delete('/picture/:id', auth, authorize('user', 'admin'), userController.deleteProfilePicture);


module.exports = router;
