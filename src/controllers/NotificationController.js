const Notification = require('../models/Notification');
const User = require('../models/User');

// Enviar una notificación a un usuario
exports.sendNotification = async (recipientId, senderId, message) => {
    try {
        const recipient = await User.findById(recipientId);

        if (!recipient) {
            console.error('Usuario destinatario no encontrado');
            return;
        }

        const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            message,
        });

        await notification.save();
        console.log('Notificación enviada');
    } catch (err) {
        console.error('Error al enviar notificación:', err.message);
    }
};

// Obtener notificaciones de un usuario
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'name profilePicture')
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
