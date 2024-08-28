const express = require('express');
const publicationController = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/authMiddleware');  // Importa correctamente auth y authorize

const router = express.Router();

// Crear publicación (disponible solo para usuarios con rol 'user' o 'admin')
router.post('/create', auth, authorize('user', 'admin'), publicationController.createPublication);

// Obtener todas las publicaciones (disponible solo para usuarios con rol 'user' o 'admin')
router.get('/', auth, authorize('user', 'admin'), publicationController.getAllPublications);

module.exports = router;
