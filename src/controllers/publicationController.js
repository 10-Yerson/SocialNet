const Publication = require('../models/Publication');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const NotificationController = require('./NotificationController');

exports.createPublication = async (req, res) => {
    try {
        const { description } = req.body;
        const user = req.user.id;  // Suponiendo que ya tienes autenticación
        let imageUrl = '';

        // Verifica si hay un archivo (imagen) en la solicitud
        if (req.file) {
            // Subir la imagen a Cloudinary usando streams
            const uploadStream = async (buffer) => {
                return new Promise((resolve, reject) => {
                    const upload = cloudinary.uploader.upload_stream(
                        {
                            folder: 'Publications',  // Especifica la carpeta en Cloudinary
                            allowed_formats: ['jpg', 'jpeg', 'png']  // Formatos permitidos
                        },
                        (error, result) => {
                            if (error) reject(error);
                            resolve(result);
                        });
                    streamifier.createReadStream(buffer).pipe(upload);
                });
            };

            const result = await uploadStream(req.file.buffer);  // Supone que estás usando multer para manejar el archivo
            imageUrl = result.secure_url;  // Obtén la URL de la imagen subida
        }

        const newPublication = new Publication({
            user,
            description,
            image: imageUrl || 'https://res.cloudinary.com/dbgj8dqup/image/upload/v1726063964/uploads/byklgfhlcameojyxkbpj.jpg'  // Imagen por defecto si no hay subida
        });

        await newPublication.save();
        res.status(201).json({ message: 'Publication created', publication: newPublication });
    } catch (error) {
        res.status(500).json({ message: 'Error creating publication', error: error.message });
    }
};

// Obtener todas las publicaciones
exports.getAllPublications = async (req, res) => {
    try {
        const userId = req.user.id;  // ID del usuario autenticado

        const publications = await Publication.find()
            .populate('user', 'name profilePicture')
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
            .populate('user', 'name profilePicture')
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
            .populate('user', 'name profilePicture')
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
            .populate('user', 'name profilePicture')
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

