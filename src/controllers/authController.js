const User = require('../models/User')
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/jwt');


// Registro de usuario
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            password
        });

        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Registro de administrador
exports.registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let admin = await Admin.findOne({ email });
        if (admin) {
            return res.status(400).json({ msg: 'Admin already exists' });
        }

        admin = new Admin({
            name,
            email,
            password
        });

        await admin.save();
        res.status(201).json({ msg: 'Admin registered successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Login unificado para usuarios y administradores
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Buscar usuario en ambas colecciones
        let user = await User.findOne({ email });
        let admin = await Admin.findOne({ email });

        const account = user || admin;
        
        if (!account) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: account.id,
                role: account.role
            }
        };

        jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: account.role });
        });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};