const { Server } = require("socket.io");
const pendingMessages = new Map(); // Store unread messages for offline users

let io;
const activeUsers = new Map(); // Mapa para rastrear usuarios activos con múltiples conexiones

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {

        // Manejar usuario en línea
        socket.on("join", (userId) => {
            if (!userId) return; // Evita agregar usuarios inválidos

            if (!activeUsers.has(userId)) {
                activeUsers.set(userId, new Set()); // Iniciar un conjunto de sockets
            }

            activeUsers.get(userId).add(socket.id); // Agregar el socketId al conjunto

            // Send any pending messages to the user
            if (pendingMessages.has(userId) && pendingMessages.get(userId).length > 0) {
                const messages = pendingMessages.get(userId);
                messages.forEach(msg => {
                    socket.emit("pendingMessages", msg);
                });
                // Clear pending messages after delivery
                pendingMessages.delete(userId);
            }

            io.emit("activeUsers", Array.from(activeUsers.keys()));
            io.emit("userOnline", userId);
        });

        // Escuchar mensajes en tiempo real
        socket.on("sendMessage", ({ sender, receiver, message }) => {
            const receiverSockets = activeUsers.get(receiver);

            if (receiverSockets && receiverSockets.size > 0) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("receiveMessage", { sender, message });
                });
            } else {
                // Aquí podrías guardar el mensaje en la DB para que lo reciba cuando se conecte
                if (!pendingMessages.has(receiver)) {
                    pendingMessages.set(receiver, []);
                }
                pendingMessages.get(receiver).push({ sender, message });
            }
        });

        // Manejar desconexión del usuario
        socket.on("disconnect", () => {
            let disconnectedUser = null;

            for (const [userId, sockets] of activeUsers.entries()) {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) { // Si no quedan conexiones activas, eliminar al usuario
                        activeUsers.delete(userId);
                        disconnectedUser = userId;
                    }
                    break;
                }
            }

            io.emit("activeUsers", Array.from(activeUsers.keys()));

            if (disconnectedUser) {
                io.emit("userOffline", disconnectedUser); // Notificar que un usuario se desconectó
            }
        });
    });
};

const getIO = () => io;

module.exports = { initSocket, getIO };
