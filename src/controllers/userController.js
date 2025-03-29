const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const bcrypt = require('bcryptjs');
const Publication = require('../models/Publication');
const FriendRequest = require('../models/FriendRequest');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        if (!users.length) {
            return res.status(404).json({ msg: 'No users found' });
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }
        res.status(500).json({ msg: 'Server error' });
    }
};

// Actualizar un usuario
exports.updateUser = async (req, res) => {
    const { name, email, apellido, fechaNacimiento, genero, estadoCivil, descripcion, hobbies, socialLinks, origen, password } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Actualizar solo los campos que se reciban en la solicitud
        user.name = name || user.name;
        user.apellido = apellido || user.apellido;
        user.email = email || user.email;
        user.profile.fechaNacimiento = fechaNacimiento || user.profile.fechaNacimiento;
        user.profile.genero = genero || user.profile.genero;
        user.profile.estadoCivil = estadoCivil || user.profile.estadoCivil;

        // Actualizar los campos opcionales del perfil
        if (descripcion) user.profile.descripcion = descripcion;
        if (hobbies && Array.isArray(hobbies)) user.profile.hobbies = hobbies; // Verifica que sea un array
        if (socialLinks) {
            if (socialLinks.facebook) user.profile.socialLinks.facebook = socialLinks.facebook;
            if (socialLinks.instagram) user.profile.socialLinks.instagram = socialLinks.instagram;
        }
        if (origen) user.profile.origen = origen;

        // En caso de que se actualice la contraseña, encriptarla antes de guardar
        if (password) {
            const salt = await bcrypt.genSalt(8);
            user.password = await bcrypt.hash(password, salt);
        }
        // Guardar los cambios en la base de datos
        await user.save();
        res.json({ msg: 'User updated successfully', user });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ msg: 'Server error' });
    }
};


// Eliminar un usuario
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Buscar usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 1️⃣ Eliminar imagen de perfil si no es la predeterminada
        if (user.profilePicture && !user.profilePicture.includes("default")) {
            const publicId = extractPublicId(user.profilePicture, 'Profiles');
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }

        // 2️⃣ Buscar publicaciones del usuario
        const publications = await Publication.find({ user: userId });

        // 3️⃣ Eliminar imágenes y videos de Cloudinary
        for (let pub of publications) {
            if (pub.image) {
                const imgPublicId = extractPublicId(pub.image, 'Publications/image');
                if (imgPublicId) await cloudinary.uploader.destroy(imgPublicId);
            }
            if (pub.video) {
                const vidPublicId = extractPublicId(pub.video, 'Publications/video');
                if (vidPublicId) await cloudinary.uploader.destroy(vidPublicId, { resource_type: "video" });
            }
        }
        
        // 4️⃣ Eliminar publicaciones del usuario
        await Publication.deleteMany({ user: userId });

        // 5️⃣ Eliminar likes del usuario en otras publicaciones
        await Publication.updateMany(
            { likes: userId },
            { $pull: { likes: userId } }
        );

        // 6️⃣ Eliminar solicitudes de amistad (enviadas y recibidas)
        await FriendRequest.deleteMany({
            $or: [{ sender: userId }, { receiver: userId }]
        });

        // 7️⃣ Eliminar mensajes (enviados y recibidos)
        await Message.deleteMany({
            $or: [{ sender: userId }, { receiver: userId }]
        });

        // 8️⃣ Eliminar notificaciones (enviadas y recibidas)
        await Notification.deleteMany({
            $or: [{ sender: userId }, { recipient: userId }]
        });

        // 9️⃣ Finalmente, eliminar el usuario
        await user.deleteOne();

        res.json({ msg: 'User and all related data removed successfully' });

    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Función para subir archivos a Cloudinary
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'Profiles', allowed_formats: ['jpg', 'jpeg', 'png'] },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(stream);
    });
};

// Controlador para manejar la subida de archivos y actualización del perfil del usuario
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // Subir archivo a Cloudinary
        const result = await uploadToCloudinary(req.file);

        // Actualizar la URL de la imagen en el perfil del usuario
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.profilePicture = result.secure_url;
        await user.save();

        res.json({
            msg: 'Imagen de perfil actualizada con éxito',
            profilePicture: result.secure_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading profile picture' });
    }
};

// Función auxiliar para extraer el public_id de Cloudinary
function extractPublicId(url, folder) {
    try {
        // Extraer la parte final de la URL (después del último '/')
        const segments = url.split('/');
        const filename = segments[segments.length - 1];
        
        // Extraer el nombre del archivo sin la extensión
        const filenameWithoutExt = filename.split('.')[0];
        
        // Devolver el public_id completo incluyendo la carpeta
        return `${folder}/${filenameWithoutExt}`;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
}