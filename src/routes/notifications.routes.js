const express = require('express')
const router = express.Router();
const Notificaciones = require('../controllers/NotificationController')
const { auth, authorize } = require('../middleware/authMiddleware');

// Rutas para notificaciones
router.get('/', auth, authorize('user'), Notificaciones.getNotifications);
router.put('/:id', auth, authorize('user'), Notificaciones.markAsRead);
router.delete('/:id', auth, authorize('user'), Notificaciones.deleteNotification);

module.exports = router;
