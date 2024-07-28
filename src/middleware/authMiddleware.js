const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/jwt');

module.exports = function (req, res, next) {
    // Obtener el token del encabezado
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
