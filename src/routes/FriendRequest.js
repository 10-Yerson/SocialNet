const express = require('express')
const router = express.Router();
const FriendsController = require('../controllers/FriendRequestController')
const { auth, authorize } = require('../middleware/authMiddleware');

router.get('/no-amigos', auth, authorize('user'), FriendsController.verUsuariosNoAmigos); 
router.post('/solicitud/:id', auth, authorize('user'), FriendsController.enviarSolicitudAmistad);
router.get('/solicitudes', auth, authorize('user'), FriendsController.verSolicitudesAmistad);
router.post('/gestionar', auth, authorize('user'), FriendsController.gestionarSolicitudAmistad);
router.get('/amigos', auth, authorize('user'), FriendsController.verAmigos);

module.exports = router;