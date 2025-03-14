const { Server } = require("socket.io");
const pendingMessages = new Map(); 
const pendingNotifications = new Map(); 

let io;
const activeUsers = new Map(); 

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {

        // Manejar usuario en línea
        socket.on("join", (userId) => {
            if (!userId) return; 

            const userIdStr = userId.toString();

            if (!activeUsers.has(userIdStr)) {
                activeUsers.set(userIdStr, new Set()); 
            }

            activeUsers.get(userIdStr).add(socket.id); 

            // Send any pending messages to the user
            if (pendingMessages.has(userIdStr) && pendingMessages.get(userIdStr).length > 0) {
                const messages = pendingMessages.get(userIdStr);
                messages.forEach(msg => {
                    socket.emit("pendingMessages", msg);
                });
                pendingMessages.delete(userIdStr);
            }

            // Send any pending notifications to the user
            if (pendingNotifications.has(userIdStr) && pendingNotifications.get(userIdStr).length > 0) {
                const notifications = pendingNotifications.get(userIdStr);
                notifications.forEach(notification => {
                    socket.emit("newNotification", notification);
                });
                pendingNotifications.delete(userIdStr);
            }

            io.emit("activeUsers", Array.from(activeUsers.keys()));
            io.emit("userOnline", userIdStr);

            socket.emit("joinConfirmed", userIdStr);
        });

        // Endpoint de depuración para verificar conexiones activas
        socket.on("debug", () => {
            socket.emit("debugInfo", {
                activeUsers: Array.from(activeUsers.keys()),
                pendingNotifications: Array.from(pendingNotifications.keys())
            });
        });

        // Escuchar mensajes en tiempo real
        socket.on("sendMessage", ({ sender, receiver, message }) => {
            const receiverStr = receiver.toString();
            const receiverSockets = activeUsers.get(receiverStr);

            if (receiverSockets && receiverSockets.size > 0) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("receiveMessage", { sender, message });
                });
            } else {
                if (!pendingMessages.has(receiverStr)) {
                    pendingMessages.set(receiverStr, []);
                }
                pendingMessages.get(receiverStr).push({ sender, message });
            }
        });

        // Manejar desconexión del usuario
        socket.on("disconnect", () => {
            let disconnectedUser = null;

            for (const [userId, sockets] of activeUsers.entries()) {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);

                    if (sockets.size === 0) {
                        activeUsers.delete(userId);
                        disconnectedUser = userId;
                    }
                    break;
                }
            }

            io.emit("activeUsers", Array.from(activeUsers.keys()));

            if (disconnectedUser) {
                io.emit("userOffline", disconnectedUser);
            }
        });

        // Verificar si un usuario está conectado
        socket.on("checkStatus", (userId) => {
            if (!userId) return;

            const userIdStr = userId.toString();
            const isActive = activeUsers.has(userIdStr);

            socket.emit("statusConfirmed", {
                userId: userIdStr,
                active: isActive,
                socketCount: isActive ? activeUsers.get(userIdStr).size : 0
            });
        });
    });

    // Añadir limpieza periódica de conexiones inactivas
    setInterval(() => {
        for (const [userId, sockets] of activeUsers.entries()) {
            const validSockets = new Set();

            for (const socketId of sockets) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket && socket.connected) {
                    validSockets.add(socketId);
                }
            }

            if (validSockets.size === 0) {
                activeUsers.delete(userId);
            } else if (validSockets.size !== sockets.size) {
                activeUsers.set(userId, validSockets);
            }
        }
    }, 60000); 
};

// Método para enviar notificaciones en tiempo real
const sendRealTimeNotification = (recipientId, notification) => {
    if (!recipientId) {
        return false;
    }
    const recipientIdStr = recipientId.toString();

    // Obtener sockets del usuario
    const receiverSockets = activeUsers.get(recipientIdStr);

    if (receiverSockets && receiverSockets.size > 0) {
        let successCount = 0;

        receiverSockets.forEach((socketId) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
                io.to(socketId).emit("newNotification", notification);
                successCount++;
            } else {
                receiverSockets.delete(socketId); // Eliminar socket inválido
            }
        });

        if (successCount === 0) {
            if (!pendingNotifications.has(recipientIdStr)) {
                pendingNotifications.set(recipientIdStr, []);
            }
            pendingNotifications.get(recipientIdStr).push(notification);
            return false;
        }

        return true;
    } else {
        if (!pendingNotifications.has(recipientIdStr)) {
            pendingNotifications.set(recipientIdStr, []);
        }
        pendingNotifications.get(recipientIdStr).push(notification);
        return false;
    }
};

const getIO = () => io;

module.exports = { initSocket, getIO, sendRealTimeNotification };