const Admin = require('../models/Admin');

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
    const { name, email, role } = req.body;
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.role = role || admin.role;

        await admin.save();
        res.json({ msg: 'Admin updated successfully' });
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
