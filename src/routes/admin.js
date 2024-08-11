const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/authMiddleware');

// Rutas para administradores
router.get('/', auth, authorize('admin'), adminController.getAdmin); // Solo accesible para administradores
router.get('/:id', auth, authorize('admin'), adminController.getAdminById); // Solo accesible para administradores
router.put('/:id', auth, authorize('admin'), adminController.updateAdmin); // Solo accesible para administradores
router.delete('/:id', auth, authorize('admin'), adminController.deleteAdmin); // Solo accesible para administradores

module.exports = router;
