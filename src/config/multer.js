const multer = require('multer');

// Almacenar archivos en memoria (buffer)
const storage = multer.memoryStorage();

// Filtro para permitir imágenes y videos
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true); // Aceptar el archivo
    } else {
        cb(new Error('Tipo de archivo inválido: solo imágenes y videos permitidos.'), false);
    }
};

// Límite de tamaño: 5MB para imágenes y 50MB para videos
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB máximo
});

module.exports = upload;
