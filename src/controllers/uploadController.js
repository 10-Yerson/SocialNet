const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const Image = require('../models/imageModel');

// Función para subir archivos a Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'uploads', allowed_formats: ['jpg', 'png'] },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(stream);
  });
};

// Controlador para manejar la subida de archivos
exports.uploadFile = async (req, res) => {
  try {
    const result = await uploadToCloudinary(req.file);

    // Guardar la URL de la imagen en la base de datos
    const newImage = new Image({
      url: result.secure_url,
    });
    await newImage.save();

    res.json({
      message: 'Imagen subida con éxito',
      imageUrl: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

