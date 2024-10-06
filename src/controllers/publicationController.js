const Publication = require('../models/Publication');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier'); 
const User = require('../models/User'); 

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
                    const upload = cloudinary.uploader.upload_stream((error, result) => {
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
        const publications = await Publication.find()
            .populate('user', 'name profilePicture')
            .sort({ createdAt: -1 });
        res.json(publications);
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



