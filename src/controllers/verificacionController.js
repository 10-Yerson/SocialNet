// controllers/verificationController.js
const User = require('../models/User');
const cloudinary = require('../config/cloudinary'); // Asumiendo que tienes esta configuración
const streamifier = require('streamifier');

// Función para subir desde buffer (memoria) a Cloudinary
function uploadFromBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'verification',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(stream);
    });
}

exports.requestVerification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;
        const verificationImage = req.file;

        // Validaciones
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere una razón para solicitar la verificación'
            });
        }

        if (!verificationImage) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere una imagen del documento para la verificación'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Tu cuenta ya está verificada'
            });
        }

        if (user.verificationRequest.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Ya tienes una solicitud de verificación pendiente'
            });
        }

        // Subida desde buffer (no se usa .path)
        const cloudinaryResult = await uploadFromBuffer(verificationImage.buffer);

        // Guardar en base de datos
        user.verificationRequest = {
            status: 'pending',
            requestDate: new Date(),
            reason,
            documents: [cloudinaryResult.secure_url]
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Solicitud de verificación enviada correctamente',
            data: {
                status: user.verificationRequest.status,
                requestDate: user.verificationRequest.requestDate,
                documentUrl: cloudinaryResult.secure_url
            }
        });
    } catch (error) {
        console.error('Error al solicitar verificación:', error);

        return res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud de verificación',
            error: error.message
        });
    }
};

// Admin procesa la solicitud de verificación
exports.processVerification = async (req, res) => {
    try {
        // Verificar que el usuario es admin (se verifica en el middleware)
        const { userId, status, rejectionReason } = req.body;

        // Validación de datos
        if (!userId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere ID de usuario y estado para procesar la verificación' 
            });
        }

        if (status !== 'approved' && status !== 'rejected') {
            return res.status(400).json({ 
                success: false, 
                message: 'El estado debe ser "approved" o "rejected"' 
            });
        }

        if (status === 'rejected' && !rejectionReason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere una razón para rechazar la solicitud' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        if (user.verificationRequest.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'No hay solicitud de verificación pendiente para este usuario' 
            });
        }

        // Actualizar el estado de verificación
        user.verificationRequest.status = status;
        user.verificationRequest.responseDate = new Date();
        
        if (status === 'approved') {
            user.isVerified = true;
        } else if (status === 'rejected') {
            user.verificationRequest.rejectionReason = rejectionReason;
        }

        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: `Solicitud de verificación ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`,
            data: {
                userId: user._id,
                status: user.verificationRequest.status,
                isVerified: user.isVerified,
                responseDate: user.verificationRequest.responseDate
            }
        });
    } catch (error) {
        console.error('Error al procesar verificación:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la solicitud de verificación',
            error: error.message 
        });
    }
};

// Obtener todas las solicitudes pendientes (para admin)
exports.getPendingVerifications = async (req, res) => {
    try {
        // La verificación de admin se hace en el middleware
        const pendingVerifications = await User.find({
            'verificationRequest.status': 'pending'
        }).select('name apellido email profilePicture verificationRequest');

        return res.status(200).json({ 
            success: true, 
            count: pendingVerifications.length,
            data: pendingVerifications 
        });
    } catch (error) {
        console.error('Error al obtener verificaciones pendientes:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las solicitudes de verificación pendientes',
            error: error.message 
        });
    }
};

// Obtener el estado de verificación del usuario actual
exports.getVerificationStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId).select('isVerified verificationRequest');
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        return res.status(200).json({ 
            success: true, 
            data: {
                isVerified: user.isVerified,
                verificationStatus: user.verificationRequest.status,
                requestDate: user.verificationRequest.requestDate,
                responseDate: user.verificationRequest.responseDate,
                rejectionReason: user.verificationRequest.rejectionReason,
                documents: user.verificationRequest.documents,
                reason: user.verificationRequest.reason
            }
        });
    } catch (error) {
        console.error('Error al obtener estado de verificación:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el estado de verificación',
            error: error.message 
        });
    }
};

