const express = require('express');
const publicationController = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/authMiddleware');  // Importa correctamente auth y authorize
const upload = require('../config/multer'); 
const router = express.Router();

// Crear publicación (disponible solo para usuarios con rol 'user' o 'admin')
router.post('/create', auth, authorize('user', 'admin'),  upload.single('image'), publicationController.createPublication);

// Obtener todas las publicaciones (disponible solo para usuarios con rol 'user' o 'admin')
router.get('/all', auth, authorize('user', 'admin'), publicationController.getAllPublications);

// Obtener las publicaciones del usuario autenticado
router.get('/user', auth, authorize('user', 'admin'), publicationController.getUserPublications);

// Obtener  publicaciones por id
router.get('/:id', auth, authorize('user', 'admin'), publicationController.getPublicationById);

// Obtener las publicaciones de los usuarios seguidos
router.get('/following', auth, authorize('user', 'admin'), publicationController.getFollowedUsersPublications);

// Obtener las publicaciones de un usuario específico
router.get('/user/:id', auth, authorize('user', 'admin'), publicationController.getUserPublicationsById);

// Actualizar una publicación
router.put('/update/:id', auth, authorize('user', 'admin'), publicationController.updatePublication);

// Eliminar una publicación
router.delete('/delete/:id', auth, authorize('user', 'admin'), publicationController.deletePublication);

router.post('/:id/like', auth, authorize('user', 'admin'), publicationController.likePublication);  // Dar "me gusta" a una publicación
router.post('/:id/unlike', auth, authorize('user', 'admin'), publicationController.unlikePublication);  // Eliminar "me gusta" de una publicación
router.get('/:id/likes',auth, authorize('user', 'admin'), publicationController.getPublicationLikes);  // Obtener los usuarios que dieron "me gusta"


module.exports = router;
