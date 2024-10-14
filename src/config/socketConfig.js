// socketConfig.js
const socketIo = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: 'http://localhost:3000', // Cambia esto a la URL de tu frontend
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('Nuevo cliente conectado');

        // Evento para registrar un usuario y unirse a su sala personal
        socket.on('registerUser', (userId) => {
            socket.join(userId); // Crear una sala para el usuario basado en su ID
            console.log(`Usuario ${userId} registrado para notificaciones y chat`);
        });

        // Evento para enviar un mensaje de chat
        socket.on('sendMessage', (data) => {
            const { recipientId, message } = data;
            io.to(recipientId).emit('receiveMessage', { message });
            console.log(`Mensaje enviado a usuario ${recipientId}`);
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado');
        });
    });
};

const getIoInstance = () => io;

module.exports = { initializeSocket, getIoInstance };
