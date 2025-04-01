const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/jwt');

exports.registerUser = async (req, res) => {
    const { name, apellido, fechaNacimiento, genero, email, password } = req.body;

    try {
        // Verifica si el usuario ya existe
        const userExists = await User.exists({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Crear el nuevo usuario sin hacer el hash de la contraseña
        const newUser = new User({
            name,
            apellido,
            genero,
            email,
            password, // Guardamos la contraseña sin hash, el modelo se encarga de eso
            profile: {
                fechaNacimiento,
                genero
            }
        });

        await newUser.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

exports.registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Verifica si el administrador ya existe
        const adminExists = await Admin.exists({ email });
        if (adminExists) {
            return res.status(400).json({ msg: 'Admin already exists' });
        }

        // Crear el nuevo administrador sin hacer el hash de la contraseña
        const newAdmin = new Admin({
            name,
            email,
            password // Guardamos la contraseña sin hash, el modelo se encarga de eso
        });

        await newAdmin.save();
        res.status(201).json({ msg: 'Admin registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    try {
        const [admin, user] = await Promise.all([
            Admin.findOne({ email }).select('password _id').lean(),
            User.findOne({ email }).select('password _id').lean()
        ]);

        if (!admin && !user) {
            return res.status(404).json({ msg: "El correo no está registrado" });
        }

        const account = admin || user;
        const isAdmin = Boolean(admin);

        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "La contraseña es incorrecta" });
        }

        const payload = {
            user: {
                id: account._id,
                role: isAdmin ? 'admin' : 'user'
            }
        };

        jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire }, (err, token) => {
            if (err) {
                console.error('Error al firmar el token:', err);
                throw err;
            }

            // Verificar el entorno
            if (process.env.NODE_ENV === 'production') {
                // Configuración para producción
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true, // Habilita HTTPS en producción
                    sameSite: 'None', // Permite cross-origin en producción
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
                });
            } else {
                // Configuración para desarrollo local
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: false, // No es necesario HTTPS en desarrollo
                    sameSite: 'Lax', // Restricción moderada para mismo dominio
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
                });
            }

            // Enviar respuesta con el rol
            res.json({ msg: "Login exitoso", role: isAdmin ? 'admin' : 'user' });

        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// También actualiza el logout para eliminar solo la cookie auth_token
exports.logout = (req, res) => {
    res.clearCookie('auth_token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
       });
    res.json({ msg: 'Logout exitoso' });
};


// Ruta para verificar autenticación
exports.checkAuth = (req, res) => {
    // req.user ya está disponible gracias al middleware auth
    res.json({ role: req.user.role });
};

exports.getUserInfo = (req, res) => {
    res.json({ userId: req.user.id, role: req.user.role });
};


