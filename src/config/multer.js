const multer = require('multer');

// Configuración de multer para almacenar archivos en memoria (buffer)
const storage = multer.memoryStorage();  // Almacena la imagen en un buffer temporal en memoria

// Solo permitimos la subida de archivos de imagen
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);  // Acepta la imagen
    } else {
        cb(new Error('Invalid file type, only images are allowed!'), false);  // Rechaza el archivo si no es una imagen
    }
};

// Limita el tamaño del archivo a 5MB
const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }  // 5 MB
});

module.exports = upload;
