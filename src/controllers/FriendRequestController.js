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
    const solicitudId = req.params.id; // Ahora se obtiene de req.params.id
    const { accion } = req.body; // 'accion' puede ser 'aceptar' o 'rechazar'
    const userId = req.user.id; // ID del usuario autenticado

    if (!accion) {
        return res.status(400).json({ msg: 'La acción es requerida' });
    }

    try {
        // Encuentra la solicitud de amistad por ID
        const solicitud = await FriendRequest.findById(solicitudId).populate('sender', 'name apellido profilePicture');

        if (!solicitud) {
            return res.status(404).json({ msg: 'Solicitud no encontrada' });
        }

        if (solicitud.receiver.toString() !== userId) {
            return res.status(403).json({ msg: 'No tienes permiso para gestionar esta solicitud' });
        }

        if (accion === 'aceptar') {
            // Aceptar la solicitud
            solicitud.status = 'accepted';
            await solicitud.save();

            // Encuentra a los usuarios involucrados
            const sender = await User.findById(solicitud.sender._id);
            const receiver = await User.findById(userId);

            if (!sender || !receiver) {
                return res.status(404).json({ msg: 'Usuario no encontrado' });
            }

            // Agrega los usuarios a la lista de amigos
            if (!receiver.friends.includes(sender._id)) {
                receiver.friends.push(sender._id);
                await receiver.save();
            }

            if (!sender.friends.includes(receiver._id)) {
                sender.friends.push(receiver._id);
                await sender.save();
            }

            // Elimina la solicitud de amistad de la base de datos
            await FriendRequest.findByIdAndDelete(solicitudId);

            return res.json({ msg: 'Solicitud de amistad aceptada exitosamente' });
        } else if (accion === 'rechazar') {
            // Rechazar la solicitud
            solicitud.status = 'rejected';
            await solicitud.save();

            // Elimina la solicitud de amistad si lo prefieres
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

