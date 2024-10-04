const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');


// Controller para ver usuarios que no son amigos
exports.verUsuariosNoAmigos = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Encuentra las solicitudes de amistad enviadas por este usuario
        const solicitudesEnviadas = await FriendRequest.find({
            sender: userId,
            status: 'pending'  // Solo las solicitudes pendientes
        }).select('receiver');

        // Extrae los IDs de los usuarios que han recibido solicitudes
        const solicitudesEnviadasIds = solicitudesEnviadas.map(solicitud => solicitud.receiver);

        const amigos = user.friends;
        const solicitudes = user.friendRequests;

        // Encuentra los usuarios que no son amigos ni tienen solicitudes pendientes
        const usuarios = await User.find({
            _id: { $ne: userId, $nin: [...amigos, ...solicitudes, ...solicitudesEnviadasIds] }
        });

        res.json(usuarios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};


// Enviar una solicitud de amistad
exports.enviarSolicitudAmistad = async (req, res) => {
    const senderId = req.user.id;
    const receiverId = req.params.id;

    if (senderId === receiverId) {
        return res.status(400).json({ msg: 'No puedes enviarte una solicitud de amistad a ti mismo' });
    }

    try {
        const friendRequest = new FriendRequest({
            sender: senderId,
            receiver: receiverId
        });

        await friendRequest.save();

        res.json({ msg: 'Solicitud de amistad enviada' });
    } catch (err) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// Ver las solicitudes de amistad recibidas (pendientes)
exports.verSolicitudesAmistad = async (req, res) => {
    try {
        const userId = req.user.id;

        const solicitudes = await FriendRequest.find({
            receiver: userId,
            status: 'pending'
        }).populate('sender', 'name apellido profilePicture');

        if (!solicitudes.length) {
            return res.status(200).json({ msg: 'No tienes solicitudes de amistad' });
        }

        res.json(solicitudes);
    } catch (err) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// Controlador para aceptar o rechazar una solicitud de amistad
exports.gestionarSolicitudAmistad = async (req, res) => {
    const solicitudId = req.params.id; // ID de la solicitud de amistad
    const { accion } = req.body; // 'accion' puede ser 'aceptar' o 'rechazar'
    const userId = req.user.id; // ID del usuario autenticado (el receptor de la solicitud)

    if (!accion) {
        return res.status(400).json({ msg: 'La acción es requerida' });
    }

    try {
        // Encuentra la solicitud de amistad por ID
        const solicitud = await FriendRequest.findById(solicitudId).populate('sender', 'name apellido profilePicture');

        if (!solicitud) {
            return res.status(404).json({ msg: 'Solicitud no encontrada' });
        }

        // Verificar que el usuario autenticado sea el receptor de la solicitud
        if (solicitud.receiver.toString() !== userId) {
            return res.status(403).json({ msg: 'No tienes permiso para gestionar esta solicitud' });
        }

        // Manejo de la acción de aceptar o rechazar la solicitud
        if (accion === 'aceptar') {
            // Cambia el estado de la solicitud a aceptada
            solicitud.status = 'accepted';
            await solicitud.save();

            // Encuentra a los usuarios involucrados (emisor y receptor)
            const sender = await User.findById(solicitud.sender._id);
            const receiver = await User.findById(userId);

            if (!sender || !receiver) {
                return res.status(404).json({ msg: 'Usuario no encontrado' });
            }

            // Añadir el emisor a la lista de amigos del receptor si no están ya en la lista
            if (!receiver.friends.includes(sender._id)) {
                receiver.friends.push(sender._id);
                await receiver.save();
            }

            // Añadir el receptor a la lista de amigos del emisor si no están ya en la lista
            if (!sender.friends.includes(receiver._id)) {
                sender.friends.push(receiver._id);
                await sender.save();
            }

            // Eliminar la solicitud de amistad después de aceptar
            await FriendRequest.findByIdAndDelete(solicitudId);

            return res.json({ msg: 'Solicitud de amistad aceptada exitosamente, ahora son amigos' });
        } else if (accion === 'rechazar') {
            // Cambia el estado de la solicitud a rechazada
            solicitud.status = 'rejected';
            await solicitud.save();

            // Eliminar la solicitud de amistad después de rechazarla
            await FriendRequest.findByIdAndDelete(solicitudId);

            return res.json({ msg: 'Solicitud de amistad rechazada' });
        } else {
            return res.status(400).json({ msg: 'Acción no válida' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};



// Controller para ver amigos
exports.verAmigos = async (req, res) => {
    try {
        const userId = req.user.id;

        // Encuentra al usuario por su ID y usa populate para obtener detalles de amigos
        const user = await User.findById(userId).populate({
            path: 'friends',
            select: 'name apellido profilePicture'
        });

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Verifica si el campo friends está vacío
        if (!user.friends || user.friends.length === 0) {
            return res.status(404).json({ msg: 'No tienes amigos' });
        }

        res.json(user.friends);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error del servidor' });
    }
};

// Función para verificar el estado de la solicitud de amistad o si ya son amigos
exports.checkFriendRequestStatus = async (req, res) => {
    const { id } = req.params; // ID del usuario con el que queremos verificar la amistad
    const currentUserId = req.user.id; // ID del usuario actual autenticado

    try {
        // Verificar si existe una solicitud de amistad entre los dos usuarios
        const friendRequest = await FriendRequest.findOne({
            $or: [
                { sender: currentUserId, receiver: id },
                { sender: id, receiver: currentUserId }
            ]
        });

        // Si no hay ninguna solicitud, no son amigos ni hay solicitud enviada
        if (!friendRequest) {
            return res.status(200).json({
                isFriend: false,
                requestSent: false,
                requestReceived: false
            });
        }

        // Verificar si ya son amigos (solicitud aceptada)
        if (friendRequest.status === 'accepted') {
            return res.status(200).json({
                isFriend: true,
                requestSent: false,
                requestReceived: false
            });
        }

        // Si hay una solicitud pendiente
        if (friendRequest.status === 'pending') {
            if (friendRequest.sender.toString() === currentUserId) {
                // Si el usuario actual envió la solicitud
                return res.status(200).json({
                    isFriend: false,
                    requestSent: true,
                    requestReceived: false
                });
            } else {
                // Si el usuario actual recibió la solicitud
                return res.status(200).json({
                    isFriend: false,
                    requestSent: false,
                    requestReceived: true
                });
            }
        }

        // Si la solicitud fue rechazada
        if (friendRequest.status === 'rejected') {
            return res.status(200).json({
                isFriend: false,
                requestSent: false,
                requestReceived: false
            });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error al verificar el estado de la solicitud' });
    }
};
