const express = require('express');
const router = express.Router();
const verificacion = require('../controllers/verificacionController');
const { auth, authorize } = require('../middleware/authMiddleware');  // Importa correctamente auth y authorize
const upload = require('../config/multer');


// Rutas para usuarios normales - Incluir middleware de subida para una sola imagen
router.post('/request', auth, authorize('user'), upload.single('document'), verificacion.requestVerification);
router.get('/status', auth, authorize('user'), verificacion.getVerificationStatus);

// Rutas para administradores
router.get('/pending', auth, authorize('admin'), verificacion.getPendingVerifications);
router.post('/process', auth, authorize('admin'), verificacion.processVerification);

module.exports = router;