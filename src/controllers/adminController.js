const Admin = require('../models/Admin');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Obtener todos los Administradores
exports.getAdmin = async (req, res) => {
    try {
        const admin = await Admin.find();
        res.json(admin);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Obtener un Administrador por ID
exports.getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }
        res.json(admin);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Actualizar un Administrador
exports.updateAdmin = async (req, res) => {
    const { name, email, apellido, fechaNacimiento, genero } = req.body;
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        // Actualizar solo los campos que se reciban en la solicitud
        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.apellido = apellido || admin.apellido;
        admin.fechaNacimiento = fechaNacimiento || admin.fechaNacimiento;
        admin.genero = genero || admin.genero;

        await admin.save();
        res.json({ msg: 'Admin updated successfully', admin });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Eliminar un Administrador
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        await admin.remove();
        res.json({ msg: 'Admin removed successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};


// Función para subir archivos a Cloudinary
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'uploads', allowed_formats: ['jpg', 'png'] },
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

// Controlador para manejar la subida de archivos y actualización del perfil del administrador
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // Subir archivo a Cloudinary
        const result = await uploadToCloudinary(req.file);

        // Actualizar la URL de la imagen en el perfil del administrador
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        admin.profileUrl = result.secure_url;
        await admin.save();

        res.json({
            msg: 'Profile picture updated successfully',
            profilePicture: result.secure_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading profile picture' });
    }
};