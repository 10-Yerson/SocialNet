const { Server } = require("socket.io");
const pendingMessages = new Map(); // Store unread messages for offline users
const pendingNotifications = new Map(); // Store unread notifications for offline users

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

            // Convertir a string para asegurar formato consistente
            const userIdStr = userId.toString();

            console.log(`Usuario ${userIdStr} conectándose con socket ${socket.id}`);

            if (!activeUsers.has(userIdStr)) {
                activeUsers.set(userIdStr, new Set()); // Iniciar un conjunto de sockets
            }

            activeUsers.get(userIdStr).add(socket.id); // Agregar el socketId al conjunto

            // Send any pending messages to the user
            if (pendingMessages.has(userIdStr) && pendingMessages.get(userIdStr).length > 0) {
                const messages = pendingMessages.get(userIdStr);
                messages.forEach(msg => {
                    socket.emit("pendingMessages", msg);
                });
                // Clear pending messages after delivery
                pendingMessages.delete(userIdStr);
            }

            // Send any pending notifications to the user
            if (pendingNotifications.has(userIdStr) && pendingNotifications.get(userIdStr).length > 0) {
                const notifications = pendingNotifications.get(userIdStr);
                console.log(`Entregando ${notifications.length} notificaciones pendientes a usuario ${userIdStr}`);
                notifications.forEach(notification => {
                    socket.emit("newNotification", notification);
                });
                // Clear pending notifications after delivery
                pendingNotifications.delete(userIdStr);
            }

            // Log active users after connection
            console.log('Active users after connection:', Array.from(activeUsers.keys()));

            io.emit("activeUsers", Array.from(activeUsers.keys()));
            io.emit("userOnline", userIdStr);

            // Confirm to the client that join was successful
            socket.emit("joinConfirmed", userIdStr);
        });

        // Endpoint de depuración para verificar conexiones activas
        socket.on("debug", () => {
            console.log("Debug request received");
            console.log("Active users:", Array.from(activeUsers.keys()));
            console.log("Pending notifications:", Array.from(pendingNotifications.keys()));

            // Enviar información de depuración al cliente
            socket.emit("debugInfo", {
                activeUsers: Array.from(activeUsers.keys()),
                pendingNotifications: Array.from(pendingNotifications.keys())
            });
        });

        // Escuchar mensajes en tiempo real
        socket.on("sendMessage", ({ sender, receiver, message }) => {
            // Convertir a string para asegurar formato consistente
            const receiverStr = receiver.toString();
            const receiverSockets = activeUsers.get(receiverStr);

            if (receiverSockets && receiverSockets.size > 0) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("receiveMessage", { sender, message });
                });
            } else {
                // Aquí podrías guardar el mensaje en la DB para que lo reciba cuando se conecte
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
                    console.log(`Socket ${socket.id} desconectado de usuario ${userId}`);

                    if (sockets.size === 0) { // Si no quedan conexiones activas, eliminar al usuario
                        activeUsers.delete(userId);
                        disconnectedUser = userId;
                        console.log(`Usuario ${userId} completamente desconectado`);
                    } else {
                        console.log(`Usuario ${userId} aún tiene ${sockets.size} conexiones activas`);
                    }
                    break;
                }
            }

            io.emit("activeUsers", Array.from(activeUsers.keys()));

            if (disconnectedUser) {
                io.emit("userOffline", disconnectedUser); // Notificar que un usuario se desconectó
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
        console.log("Limpiando conexiones inactivas...");
        for (const [userId, sockets] of activeUsers.entries()) {
            const validSockets = new Set();

            for (const socketId of sockets) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket && socket.connected) {
                    validSockets.add(socketId);
                }
            }

            if (validSockets.size === 0) {
                console.log(`Eliminando usuario ${userId} sin conexiones válidas`);
                activeUsers.delete(userId);
            } else if (validSockets.size !== sockets.size) {
                console.log(`Actualizando sockets para usuario ${userId}: ${sockets.size} -> ${validSockets.size}`);
                activeUsers.set(userId, validSockets);
            }
        }

        console.log(`Usuarios activos después de limpieza: ${activeUsers.size}`);
    }, 60000); // Ejecutar cada minuto
};

// Método para enviar notificaciones en tiempo real
const sendRealTimeNotification = (recipientId, notification) => {
    // Verificar que recipientId es válido
    if (!recipientId) {
        console.error('ID de receptor inválido');
        return false;
    }

    // Convertir a string para asegurar formato consistente
    const recipientIdStr = recipientId.toString();

    // Obtener sockets del usuario
    const receiverSockets = activeUsers.get(recipientIdStr);

    // Log para depuración con más detalles
    console.log(`Enviando notificación de tipo ${notification.type} a usuario ${recipientIdStr}`);
    console.log(`Estado de conexión del usuario: ${receiverSockets ? 'Conectado' : 'Desconectado'}`);

    // Log adicional - imprimir todos los usuarios activos
    console.log('Usuarios activos:', Array.from(activeUsers.keys()));

    // Logs específicos para notificaciones de tipo "like"
    if (notification.type === 'like') {
        console.log('Detalles completos de la notificación de like:');
        console.log(JSON.stringify(notification, null, 2));
    }

    if (receiverSockets && receiverSockets.size > 0) {
        // El usuario está conectado, enviar la notificación a todos sus sockets
        let successCount = 0;

        receiverSockets.forEach((socketId) => {
            console.log(`Enviando notificación de tipo ${notification.type} a socket ${socketId}`);

            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
                io.to(socketId).emit("newNotification", notification);
                console.log(`Socket ${socketId} activo y válido`);
                successCount++;
            } else {
                console.warn(`Socket ${socketId} no encontrado o no válido`);
                receiverSockets.delete(socketId); // Eliminar socket inválido
            }
        });

        // Si no se envió a ningún socket válido, guardar para más tarde
        if (successCount === 0) {
            console.log(`No se encontraron sockets válidos para ${recipientIdStr}. Guardando notificación.`);
            if (!pendingNotifications.has(recipientIdStr)) {
                pendingNotifications.set(recipientIdStr, []);
            }
            pendingNotifications.get(recipientIdStr).push(notification);
            return false;
        }

        return true;
    } else {
        // El usuario no está conectado, guardar la notificación para entrega posterior
        console.log(`Usuario ${recipientIdStr} no está conectado. Guardando notificación para entrega posterior`);
        console.log(`Tipo de notificación guardada: ${notification.type}`);

        if (!pendingNotifications.has(recipientIdStr)) {
            pendingNotifications.set(recipientIdStr, []);
        }
        pendingNotifications.get(recipientIdStr).push(notification);
        return false;
    }
};

const getIO = () => io;

module.exports = { initSocket, getIO, sendRealTimeNotification };