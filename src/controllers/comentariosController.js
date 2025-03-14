const Comment = require('../models/Comentarios');
const Publication = require('../models/Publication');
const User = require('../models/User');
const NotificationController = require('./NotificationController');

// Crear un comentario en una publicación
exports.createComment = async (req, res) => {
    try {
        const { publicationId, text, parentCommentId } = req.body;
        const userId = req.user.id;

        // Verificar si la publicación existe
        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publicación no encontrada' });
        }

        let parentComment = null;
        // Si es una respuesta a otro comentario, verificar si existe
        if (parentCommentId) {
            parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({ message: 'Comentario padre no encontrado' });
            }
        }

        // Crear el nuevo comentario
        const newComment = new Comment({
            publication: publicationId,
            user: userId,
            text,
            parentComment: parentCommentId || null
        });

        await newComment.save();

        // Si es una respuesta a otro comentario, agregar a la lista de respuestas
        if (parentComment) {
            parentComment.replies.push(newComment._id);
            await parentComment.save();
        }

        // Agregar el comentario a la publicación
        publication.comments.push(newComment._id);
        await publication.save();

        // Obtener datos del usuario para incluir en la respuesta
        const commentWithUser = await Comment.findById(newComment._id).populate('user', 'name profilePicture');

        // Enviar notificación al dueño de la publicación (si el comentario es de otro usuario)
        const commentUser = await User.findById(userId);
        
        if (userId !== publication.user.toString()) {
            await NotificationController.sendNotification(
                publication.user,
                userId,
                `${commentUser.name} ha comentado tu publicación.`,
                'comment',
                publication._id,
                'Publication'
            );
        }
        
        // Si es respuesta a un comentario, notificar también al autor del comentario
        if (parentComment && userId !== parentComment.user.toString()) {
            await NotificationController.sendNotification(
                parentComment.user,
                userId,
                `${commentUser.name} ha respondido a tu comentario.`,
                'comment', // Usando 'comment' en lugar de 'reply' para mantener compatibilidad con el esquema
                parentComment._id,
                'Comment'
            );
        }

        res.status(201).json({ 
            message: 'Comentario creado exitosamente', 
            comment: commentWithUser 
        });
    } catch (error) {
        console.error('Error al crear comentario:', error);
        res.status(500).json({ message: 'Error al crear comentario', error: error.message });
    }
};

// Obtener todos los comentarios de una publicación
exports.getPublicationComments = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const userId = req.user.id;

        // Obtener comentarios principales (no respuestas)
        const mainComments = await Comment.find({ 
            publication: publicationId,
            parentComment: null
        })
        .populate('user', 'name profilePicture')
        .populate({
            path: 'replies',
            populate: {
                path: 'user',                select: 'name profilePicture'
            }
        })
        .sort({ createdAt: -1 });

        // Agregar campo likedByUser a cada comentario y sus respuestas
        const commentsWithLikes = mainComments.map(comment => {
            const commentObj = comment._doc;
            
            // Verificar si el usuario dio like al comentario principal
            commentObj.likedByUser = comment.likes.some(like => like.toString() === userId);
            
            // Procesar respuestas
            if (commentObj.replies && commentObj.replies.length > 0) {
                commentObj.replies = commentObj.replies.map(reply => {
                    const replyObj = reply._doc;
                    replyObj.likedByUser = reply.likes.some(like => like.toString() === userId);
                    return replyObj;
                });
            }
            
            return commentObj;
        });

        res.json(commentsWithLikes);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({ message: 'Error al obtener comentarios', error: error.message });
    }
};

// Dar like a un comentario
exports.likeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        // Verificar si el usuario ya dio like
        if (comment.likes.includes(userId)) {
            return res.status(400).json({ message: 'Ya has dado like a este comentario' });
        }

        // Agregar like
        comment.likes.push(userId);
        await comment.save();

        // Enviar notificación al autor del comentario
        if (userId !== comment.user.toString()) {
            const likeUser = await User.findById(userId);
            await NotificationController.sendNotification(
                comment.user,
                userId,
                `A ${likeUser.name} le ha gustado tu comentario.`,
                'like',
                comment._id,
                'Comment'
            );
        }

        res.json({ 
            message: 'Like agregado exitosamente',
            likes: comment.likes.length
        });
    } catch (error) {
        console.error('Error al dar like:', error);
        res.status(500).json({ message: 'Error al dar like al comentario', error: error.message });
    }
};

// Quitar like a un comentario
exports.unlikeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        // Verificar si el usuario dio like previamente
        if (!comment.likes.includes(userId)) {
            return res.status(400).json({ message: 'No has dado like a este comentario' });
        }

        // Quitar like
        comment.likes = comment.likes.filter(
            like => like.toString() !== userId
        );
        await comment.save();

        res.json({ 
            message: 'Like eliminado exitosamente',
            likes: comment.likes.length
        });
    } catch (error) {
        console.error('Error al quitar like:', error);
        res.status(500).json({ message: 'Error al quitar like del comentario', error: error.message });
    }
};

// Editar un comentario
exports.updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        // Verificar que el usuario sea el autor del comentario
        if (comment.user.toString() !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para editar este comentario' });
        }

        // Actualizar el texto
        comment.text = text;
        await comment.save();

        // Obtener comentario actualizado con datos del usuario
        const updatedComment = await Comment.findById(commentId).populate('user', 'name profilePicture');

        res.json({ 
            message: 'Comentario actualizado exitosamente', 
            comment: updatedComment 
        });
    } catch (error) {
        console.error('Error al actualizar comentario:', error);
        res.status(500).json({ message: 'Error al actualizar comentario', error: error.message });
    }
};

// Eliminar un comentario
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        // Verificar que el usuario sea el autor del comentario o el dueño de la publicación
        const publication = await Publication.findById(comment.publication);
        
        if (comment.user.toString() !== userId && publication.user.toString() !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
        }

        // Si es un comentario principal, eliminar todas sus respuestas
        if (!comment.parentComment) {
            // Eliminar respuestas
            await Comment.deleteMany({ parentComment: commentId });
            
            // Eliminar referencia del comentario en la publicación
            publication.comments = publication.comments.filter(
                c => c.toString() !== commentId
            );
            await publication.save();
        } else {
            // Si es una respuesta, eliminarla de la lista de respuestas del comentario padre
            const parentComment = await Comment.findById(comment.parentComment);
            if (parentComment) {
                parentComment.replies = parentComment.replies.filter(
                    reply => reply.toString() !== commentId
                );
                await parentComment.save();
            }
        }

        // Eliminar el comentario
        await Comment.findByIdAndDelete(commentId);

        res.json({ message: 'Comentario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({ message: 'Error al eliminar comentario', error: error.message });
    }
};

// Obtener las personas que dieron like a un comentario
exports.getCommentLikes = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId).populate('likes', 'name profilePicture');
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado' });
        }

        res.json({ 
            message: 'Usuarios que dieron like al comentario', 
            likes: comment.likes 
        });
    } catch (error) {
        console.error('Error al obtener likes:', error);
        res.status(500).json({ message: 'Error al obtener likes del comentario', error: error.message });
    }
};