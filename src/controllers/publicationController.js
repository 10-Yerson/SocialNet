const Publication = require('../models/Publication');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const NotificationController = require('./NotificationController');

exports.createPublication = async (req, res) => {
    try {
        const { description } = req.body;
        const user = req.user.id;
        let imageUrl = '';
        let videoUrl = '';

        // Función para subir archivos a Cloudinary
        const uploadStream = async (buffer, folder, resource_type) => {
            return new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream(
                    { folder, resource_type },
                    (error, result) => {
                        if (error) reject(error);
                        resolve(result);
                    }
                );
                streamifier.createReadStream(buffer).pipe(upload);
            });
        };

        // Verifica si el usuario subió una imagen
        if (req.file && req.file.mimetype.startsWith('image/')) {
            const result = await uploadStream(req.file.buffer, 'Publications/image', 'image');
            imageUrl = result.secure_url;
        }

        // Verifica si el usuario subió un video
        if (req.file && req.file.mimetype.startsWith('video/')) {
            const result = await uploadStream(req.file.buffer, 'Publications/video', 'video');
            videoUrl = result.secure_url;
        }

        // Guardar la publicación en la base de datos
        const newPublication = new Publication({
            user,
            description,
            image: imageUrl || '',
            video: videoUrl || ''
        });

        await newPublication.save();
        res.status(201).json({ message: 'Publicación creada', publication: newPublication });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear publicación', error: error.message });
    }
};
                
// Obtener todas las publicaciones
exports.getAllPublications = async (req, res) => {
    try {
        const userId = req.user.id;  // ID del usuario autenticado

        const publications   = await Publication.find()
            .populate('user', 'name  apellido profilePicture')
            .sort({ createdAt: -1 });

        // Añadir un campo 'likedByUser' para cada publicación
        const publicationsWithLikes = publications.map(pub => ({
            ...pub._doc,  // Usamos '_doc' para acceder al objeto de mongoose
            likedByUser: pub.likes.includes(userId)  // Comprobar si el usuario actual le ha dado "me gusta"
        }));

        res.json(publicationsWithLikes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};


// Obtener publicaciones del usuario autenticado
exports.getUserPublications = async (req, res) => {
    try {
        const userId = req.user.id;
        const publications = await Publication.find({ user: userId })
            .populate('user', 'name  apellido profilePicture')
            .sort({ createdAt: -1 });
        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};

// Obtener publicaciones de usuarios seguidos
exports.getFollowedUsersPublications = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).populate('following');
        const followedUserIds = user.following.map(followedUser => followedUser._id);

        const publications = await Publication.find({ user: { $in: followedUserIds } })
            .populate('user', 'name apellido profilePicture')
            .sort({ createdAt: -1 });

        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};

// Obtener publicaciones de un usuario específico
exports.getUserPublicationsById = async (req, res) => {
    try {
        const userId = req.user.id; // ID del usuario autenticado
        const targetUserId = req.params.id; // ID del usuario cuyas publicaciones se desean obtener

        // Validación de IDs
        if (!userId || !targetUserId) {
            return res.status(400).json({ msg: 'ID de usuario inválido' });
        }

        // Obtener el usuario que está revisando
        const user = await User.findById(userId).lean();

        // Verifica si el usuario sigue al usuario objetivo
        const isFollowing = user.following.map(String).includes(String(targetUserId));

        // Si no sigue, responde con un mensaje indicando que no está siguiendo
        if (!isFollowing) {
            return res.json({ msg: 'Las publicaciones de este usuario son privadas. Síguelo para acceder a ellas', publications: [] });
        }

        // Si sigue, obtener las publicaciones del usuario objetivo
        const publications = await Publication.find({ user: targetUserId })
            .populate('user', 'name apellido profilePicture')
            .sort({ createdAt: -1 });

        return res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};

// Actualizar una publicación
exports.updatePublication = async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        const publication = await Publication.findById(id);
        if (publication.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized action' });
        }

        publication.description = description || publication.description;
        await publication.save();

        res.json({ message: 'Publication updated', publication });
    } catch (error) {
        res.status(500).json({ message: 'Error updating publication', error: error.message });
    }
};

// Eliminar una publicación
exports.deletePublication = async (req, res) => {
    try {
        const { id } = req.params;

        const publication = await Publication.findById(id);
        if (publication.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized action' });
        }

        await publication.remove();
        res.json({ message: 'Publication deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting publication', error: error.message });
    }
};


// Controlador para dar like a una publicación
exports.likePublication = async (req, res) => {
    try {
        const publication = await Publication.findById(req.params.id);

        // Si no se encuentra la publicación, envía un error
        if (!publication) {
            return res.status(404).json({ msg: 'Publicación no encontrada' });
        }

        if (publication.likes.includes(req.user.id)) {
            return res.status(400).json({ msg: 'Ya le has dado like a esta publicación' });
        }

        publication.likes.push(req.user.id);
        await publication.save();

        const likeUser = await User.findById(req.user.id);

        if (req.user.id !== publication.user.toString()) {
            await NotificationController.sendNotification(
                publication.user, 
                req.user.id,     
                `${likeUser.name} ha dado like a tu publicación.`,
                'like',           
                publication._id,  
                'Publication'     
            );
        }

        res.json(publication.likes);
    } catch (err) {
        console.error('Error en likePublication:', err.message);
        res.status(500).send('Error en el servidor');
    }
};


// Controlador para unlikePublication
exports.unlikePublication = async (req, res) => {
    try {
        const publication = await Publication.findById(req.params.id);
        if (!publication) {
            return res.status(404).json({ msg: 'Publicación no encontrada' });
        }

        // Verifica si el usuario ha dado like previamente
        if (!publication.likes.includes(req.body.userId)) {
            return res.status(400).json({ msg: 'No has dado like a esta publicación' });
        }

        // Elimina el like del usuario
        publication.likes = publication.likes.filter(
            (like) => like.toString() !== req.body.userId
        );

        await publication.save();
        res.status(200).json({ msg: 'Like eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// Obtener los usuarios que dieron "me gusta" a una publicación

exports.getPublicationLikes = async (req, res) => {
    try {
        const publicationId = req.params.id;

        const publication = await Publication.findById(publicationId).populate('likes', 'name profilePicture');

        res.json({ message: 'Usuarios que dieron "me gusta"', likes: publication.likes });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los "me gusta"', error: error.message });
    }
};

// Obtener una publicación por su ID
exports.getPublicationById = async (req, res) => {
    try {
        const publicationId = req.params.id;
        const userId = req.user.id; // ID del usuario autenticado

        // Validar que el ID de la publicación sea válido
        if (!publicationId) {
            return res.status(400).json({ message: 'Publication ID is required' });
        }

        // Buscar la publicación en la base de datos
        const publication = await Publication.findById(publicationId)
            .populate('user', 'name apellido profilePicture');

        // Si no se encuentra la publicación
        if (!publication) {
            return res.status(404).json({ message: 'Publication not found' });
        }

        // Añadir campo para verificar si el usuario ha dado like
        const publicationWithLikeStatus = {
            ...publication._doc,
            likedByUser: publication.likes.includes(userId)
        };

        res.json(publicationWithLikeStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publication', error: error.message });
    }
};