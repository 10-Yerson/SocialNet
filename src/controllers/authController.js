const User = require('../models/User')
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/jwt');


// // Registro de usuario
// exports.registerUser = async (req, res) => {
//     const { name, apellido, fechaNacimiento, genero, email, password } = req.body;
//     try {
//         let user = await User.findOne({ email });
//         if (user) {
//             return res.status(400).json({ msg: 'User already exists' });
//         }

//         user = new User({
//             name,
//             apellido,
//             fechaNacimiento,
//             genero,
//             email,
//             password
//         });

//         await user.save();
//         res.status(201).json({ msg: 'User registered successfully' });
//     } catch (err) {
//         console.error(err);  // Muestra el error en la consola
//         res.status(500).json({ msg: 'Server error', error: err.message });
//     }
// };

// // Registro de administrador
// exports.registerAdmin = async (req, res) => {
//     const { name, email, password } = req.body;
//     try {
//         let admin = await Admin.findOne({ email });
//         if (admin) {
//             return res.status(400).json({ msg: 'Admin already exists' });
//         }

//         admin = new Admin({
//             name,
//             email,
//             password
//         });

//         await admin.save();
//         res.status(201).json({ msg: 'Admin registered successfully' });
//     } catch (err) {
//         res.status(500).json({ msg: 'Server error' });
//     }
// };

exports.registerUser = async (req, res) => {
    const { name, apellido, fechaNacimiento, genero, email, password } = req.body;
    
    try {
        // Verifica si el usuario ya existe
        const userExists = await User.exists({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hasheo de contraseña en paralelo
        const hashedPasswordPromise = bcrypt.hash(password, 8);

        // Crear el nuevo usuario mientras se hace el hasheo
        const newUser = new User({
            name,
            apellido,
            fechaNacimiento,
            genero,
            email,
            password: await hashedPasswordPromise
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

        // Hasheo de contraseña en paralelo
        const hashedPasswordPromise = bcrypt.hash(password, 8);

        // Crear el nuevo administrador mientras se hace el hasheo
        const newAdmin = new Admin({
            name,
            email,
            password: await hashedPasswordPromise
        });

        await newAdmin.save();
        res.status(201).json({ msg: 'Admin registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Login de usuario y administrador
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Ejecutar las consultas en paralelo
        const [admin, user] = await Promise.all([
            Admin.findOne({ email }).select('password _id').lean(),
            User.findOne({ email }).select('password _id').lean()
        ]);

        let account = admin || user; // Determina si es admin o user
        const isAdmin = Boolean(admin); // Si encontró admin, es true; de lo contrario, false

        if (!account) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        // Comparar la contraseña
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        // Crear el payload con el rol del usuario
        const payload = {
            user: {
                id: account._id,
                role: isAdmin ? 'admin' : 'user'
            }
        };

        // Generar el token
        jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: isAdmin ? 'admin' : 'user', userId: account._id });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};


// exports.login = async (req, res) => {
//     const { email, password } = req.body;
//     try {
//         // Primero, intenta encontrar el usuario como administrador
//         let user = await Admin.findOne({ email });
//         let isAdmin = true; // Flag para saber si el usuario es un administrador

//         // Si no se encuentra como administrador, intenta encontrar como usuario
//         if (!user) {
//             user = await User.findOne({ email });
//             isAdmin = false; // El usuario no es un administrador
//         }

//         if (!user) {
//             return res.status(400).json({ msg: 'Invalid credentials' });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ msg: 'Invalid credentials' });
//         }

//         const payload = {
//             user: {
//                 id: user._id,
//                 role: isAdmin ? 'admin' : 'user'
//             }
//         };

//         jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire }, (err, token) => {
//             if (err) throw err;
//             res.json({ token, role: isAdmin ? 'admin' : 'user', userId: user._id });
//         });
//     } catch (err) {
//         res.status(500).json({ msg: 'Server error' });
//     }
// }