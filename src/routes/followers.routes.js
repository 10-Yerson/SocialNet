const express = require('express')
const router = express.Router();
const FriendsController = require('../controllers/FriendRequestController')
const { auth, authorize } = require('../middleware/authMiddleware');

// Seguir a un usuario
router.post('/seguir/:id', auth, authorize('user'), FriendsController.followUser);

// Dejar de seguir a un usuario
router.post('/dejar-seguir/:id', auth, authorize('user'), FriendsController.unfollowUser);

// Verificar estado de seguimiento entre dos usuarios
router.get('/estado/:id', auth, authorize('user'), FriendsController.checkFollowStatus);

// Listar usuarios que el usuario autenticado aún no sigue
router.get('/sugerencias', auth, authorize('user'), FriendsController.listUsersToFollow);

router.get('/search', auth, authorize('user'), FriendsController.searchUsers);

// Listar seguidores de un usuario
router.get('/seguidores/:id', auth, authorize('user'), FriendsController.listFollowers);

// Listar usuarios seguidos por un usuario
router.get('/seguidos/:id', auth, authorize('user'), FriendsController.listFollowing);



module.exports = router;