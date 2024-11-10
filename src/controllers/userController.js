const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const bcrypt = require('bcryptjs');

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
    const { name, email, apellido, fechaNacimiento, genero, descripcion, hobbies, socialLinks, ciudad, password } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Actualizar solo los campos que se reciban en la solicitud
        user.name = name || user.name;
        user.apellido = apellido || user.apellido;
        user.email = email || user.email;
        user.fechaNacimiento = fechaNacimiento || user.fechaNacimiento;
        user.genero = genero || user.genero;
    
        // Actualizar los campos opcionales del perfil
        if (descripcion) user.profile.descripcion = descripcion;
        if (hobbies && Array.isArray(hobbies)) user.profile.hobbies = hobbies; // Verifica que sea un array
        if (socialLinks) {
            if (socialLinks.tiktok) user.profile.socialLinks.tiktok = socialLinks.tiktok;
            if (socialLinks.facebook) user.profile.socialLinks.facebook = socialLinks.facebook;
            if (socialLinks.instagram) user.profile.socialLinks.instagram = socialLinks.instagram;
        }
        if (ciudad) user.profile.ciudad = ciudad;

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
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await user.remove();
        res.json({ msg: 'User removed successfully' });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }
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