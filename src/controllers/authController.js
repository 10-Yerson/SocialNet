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


// Login de usuario y administrador
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Primero, intenta encontrar el usuario como administrador
        let user = await Admin.findOne({ email });
        let isAdmin = true; // Flag para saber si el usuario es un administrador

        // Si no se encuentra como administrador, intenta encontrar como usuario
        if (!user) {
            user = await User.findOne({ email });
            isAdmin = false; // El usuario no es un administrador
        }

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: isAdmin ? 'admin' : 'user'
            }
        };

        jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: isAdmin ? 'admin' : 'user' });
        });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};