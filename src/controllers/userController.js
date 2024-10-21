const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

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
    const { name, email, role, apellido, fechaNacimiento, genero } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Actualizar solo los campos que se reciban en la solicitud
        user.name = name || user.name;
        user.email = email || user.email;
        user.apellido = apellido || user.apellido;
        user.fechaNacimiento = fechaNacimiento || user.fechaNacimiento;
        user.genero = genero || user.genero;

        // Solo se actualiza el role si es válido y pertenece a los valores permitidos
        if (role && ['user'].includes(role)) {
            user.role = role;
        }

        await user.save();
        res.json({ msg: 'User updated successfully', user });
    } catch (err) {
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
            { folder: 'Profiles', allowed_formats: ['jpg', 'png'] },
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
            msg: 'Profile picture updated successfully',
            profilePicture: result.secure_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading profile picture' });
    }
};