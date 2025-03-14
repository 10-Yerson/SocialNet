const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comentariosController');
const { auth, authorize } = require('../middleware/authMiddleware');

// Crear un comentario
router.post('/', auth, authorize('user'), commentController.createComment);

// Obtener comentarios de una publicación
router.get('/publication/:publicationId', auth, authorize('user'), commentController.getPublicationComments);

// Dar like a un comentario
router.post('/like/:commentId', auth, authorize('user'), commentController.likeComment);

// Quitar like a un comentario
router.delete('/like/:commentId', auth, authorize('user'), commentController.unlikeComment);

// Actualizar un comentario
router.put('/:commentId', auth, authorize('user'), commentController.updateComment);

// Eliminar un comentario
router.delete('/:commentId', auth, authorize('user'), commentController.deleteComment);

// Obtener likes de un comentario
router.get('/likes/:commentId', auth, commentController.getCommentLikes);

module.exports = router;