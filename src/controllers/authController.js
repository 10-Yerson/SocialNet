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
            fechaNacimiento,
            genero,
            email,
            password // Guardamos la contraseña sin hash, el modelo se encarga de eso
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

    try {
        console.log(`Intento de login con el correo: ${email}`);
        
        const [admin, user] = await Promise.all([
            Admin.findOne({ email }).select('password _id').lean(),
            User.findOne({ email }).select('password _id').lean()
        ]);

        const account = admin || user;
        const isAdmin = Boolean(admin);

        if (!account) {
            console.log('Cuenta no encontrada');
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        console.log('Cuenta encontrada:', account);

        const isMatch = await bcrypt.compare(password, account.password);
        console.log('Resultado de la comparación de contraseña:', isMatch);

        if (!isMatch) {
            console.log('Contraseña incorrecta');
            return res.status(400).json({ msg: 'Credenciales inválidas' });
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
            console.log(`Token generado para ${isAdmin ? 'admin' : 'user'} con ID: ${account._id}`);
            res.json({ token, role: isAdmin ? 'admin' : 'user', userId: account._id });
        });
    } catch (err) {
        console.error('Error en el login:', err.message);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};
