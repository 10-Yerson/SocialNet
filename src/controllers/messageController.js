const Message = require("../models/Message");
const { getIO } = require("../config/socket");

// 📩 Enviar un mensaje
exports.sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;
        const sender = req.user.id;
        

        // Validar entrada
        if (!receiver || !message?.trim()) {
            return res.status(400).json({ error: "Receiver y message son obligatorios" });
        }

        // Guardar el mensaje en la base de datos
        const newMessage = await Message.create({ sender, receiver, message });

        // Emitir mensaje en tiempo real solo si el receptor está en línea
        const io = getIO();
        const receiverSockets = io.sockets.adapter.rooms.get(receiver);
        if (receiverSockets) {
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("receiveMessage", newMessage);
            });
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// 📬 Obtener mensajes entre dos usuarios
exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "No autorizado" });
        }

        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: userId },
                { sender: userId, receiver: req.user.id }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error("Error al obtener mensajes:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// ✅ Marcar mensaje como visto
exports.markAsSeen = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        if (message.receiver.toString() !== req.user.id) {
            return res.status(403).json({ error: "No puedes marcar como visto este mensaje" });
        }

        message.seen = true;
        await message.save();

        // Emitir actualización en tiempo real solo al remitente
        const io = getIO();
        const senderSockets = io.sockets.adapter.rooms.get(message.sender.toString());
        if (senderSockets) {
            senderSockets.forEach(socketId => {
                io.to(socketId).emit("messageSeen", { messageId: message._id });
            });
        }

        res.json({ message: "Mensaje marcado como visto" });
    } catch (error) {
        console.error("Error al marcar mensaje como visto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// 🗑️ Eliminar mensaje (solo el remitente o el receptor pueden eliminarlo)
exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        if (message.sender.toString() !== req.user.id && message.receiver.toString() !== req.user.id) {
            return res.status(403).json({ error: "No tienes permiso para eliminar este mensaje" });
        }

        await message.deleteOne();

        // Emitir evento de eliminación en tiempo real al otro usuario
        const io = getIO();
        const recipientSockets = io.sockets.adapter.rooms.get(message.receiver.toString());
        if (recipientSockets) {
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit("messageDeleted", { messageId: message._id });
            });
        }

        res.json({ message: "Mensaje eliminado" });
    } catch (error) {
        console.error("Error al eliminar mensaje:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
