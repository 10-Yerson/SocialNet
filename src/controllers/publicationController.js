const Publication = require('../models/Publication');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier'); 

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

// Obtener publicaciones con el perfil del usuario
exports.getAllPublications = async (req, res) => {
    try {
        const publications = await Publication.find()
            .populate('user', 'name profilePicture')  // Supongamos que el usuario tiene un nombre y una imagen de perfil
            .sort({ createdAt: -1 });
        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};


// Obtener publicaciones del usuario autenticado
exports.getUserPublications = async (req, res) => {
    try {
        const userId = req.user.id;  // Asegúrate de que req.user contiene el ID del usuario autenticado
        const publications = await Publication.find({ user: userId })
            .populate('user', 'name profilePicture')  // Si el usuario tiene un nombre y una imagen de perfil
            .sort({ createdAt: -1 });
        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};

