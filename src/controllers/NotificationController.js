const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendRealTimeNotification } = require('../config/socket');

// Enviar una notificación a un usuario
exports.sendNotification = async (recipientId, senderId, message, type = 'other', reference = null, refModel = null) => {
    try {
        // Convertir IDs a strings para consistencia
        const recipientIdStr = recipientId.toString();
        const senderIdStr = senderId.toString();

        // Verificar que los usuarios existen
        const recipient = await User.findById(recipientIdStr);
        const sender = await User.findById(senderIdStr);

        if (!recipient || !sender) {
            return null;
        }

        // Crear la notificación
        const notificationData = {
            recipient: recipientIdStr,
            sender: senderIdStr,
            message,
            type,
            read: false
        };

        // Agregar referencias si están presentes
        if (reference) {
            notificationData.reference = reference.toString();
            notificationData.refModel = refModel;
        }

        // Guardar la notificación en la base de datos
        const notification = new Notification(notificationData);
        await notification.save();

        // Hacer un populate completo para obtener todos los datos necesarios
        const populatedNotification = await Notification.findById(notification._id)
            .populate('sender', '_id name apellido profilePicture');

        // Preparar la notificación para enviarla por socket
        const notificationForClient = {
            _id: populatedNotification._id,
            sender: {
                _id: populatedNotification.sender._id,
                name: populatedNotification.sender.name,
                apellido: populatedNotification.sender.apellido,
                profilePicture: populatedNotification.sender.profilePicture
            },
            message: populatedNotification.message,
            type: populatedNotification.type,
            read: populatedNotification.read,
            createdAt: populatedNotification.createdAt
        };

        // Agregar la referencia si existe
        if (reference) {
            notificationForClient.reference = reference.toString();
            notificationForClient.refModel = refModel;
        }

        // Enviar la notificación a través de socket.io
        const sent = sendRealTimeNotification(recipientIdStr, notificationForClient);

        return notification;
    } catch (err) {
        console.error('Error al enviar notificación:', err);
        return null;
    }
};

// Obtener notificaciones de un usuario
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id.toString();
        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'name apellido profilePicture')
            .sort({ createdAt: -1 });

        return res.json(notifications);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};
// Marcar una notificación como leída
exports.markAsRead = async (req, res) => {
    try {
        const notificationId = req.params.id;

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ msg: 'Notificación no encontrada' });
        }

        notification.read = true;
        await notification.save();

        return res.json({ msg: 'Notificación marcada como leída' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};

// Eliminar una notificación
exports.deleteNotification = async (req, res) => {
    try {
        const notificationId = req.params.id;

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ msg: 'Notificación no encontrada' });
        }

        await notification.remove();

        return res.json({ msg: 'Notificación eliminada' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};
