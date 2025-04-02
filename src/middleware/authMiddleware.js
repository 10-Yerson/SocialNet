const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/jwt');

// Middleware para verificar el token y agregar el usuario al request
const auth = (req, res, next) => {

    const token = req.cookies.auth_token; // 👈 Directamente de la cookie

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware para verificar el rol del usuario
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied' });
    }
    next();
};

module.exports = { auth, authorize };