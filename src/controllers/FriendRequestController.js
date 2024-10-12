const User = require('../models/User');
const NotificationController = require('./NotificationController');


// Seguir a un usuario
exports.followUser = async (req, res) => {
    try {
        const userId = req.user.id; // Usuario autenticado que sigue
        const followUserId = req.params.id; // Usuario a seguir

        if (userId === followUserId) {
            return res.status(400).json({ msg: 'No puedes seguirte a ti mismo' });
        }

        const user = await User.findById(userId);
        const followUser = await User.findById(followUserId);

        if (!followUser) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        if (user.following.includes(followUserId)) {
            return res.status(400).json({ msg: 'Ya sigues a este usuario' });
        }

        user.following.push(followUserId);
        followUser.followers.push(userId);

        await user.save();
        await followUser.save();

        // Enviar notificación al usuario seguido
        await NotificationController.sendNotification(followUserId, userId, `${user.name} te está siguiendo.`);

        return res.json({ msg: `Ahora sigues a ${followUser.name}`, isFollowing: true });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};

// Dejar de seguir a un usuario
exports.unfollowUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const unfollowUserId = req.params.id;

        const user = await User.findById(userId);
        const unfollowUser = await User.findById(unfollowUserId);

        if (!unfollowUser) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        if (!user.following.includes(unfollowUserId)) {
            return res.status(400).json({ msg: 'No sigues a este usuario' });
        }

        user.following = user.following.filter(followId => followId.toString() !== unfollowUserId);
        unfollowUser.followers = unfollowUser.followers.filter(followerId => followerId.toString() !== userId);

        await user.save();
        await unfollowUser.save();

        return res.json({ msg: `Has dejado de seguir a ${unfollowUser.name}` });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};

// Verificar estado de seguimiento entre dos usuarios
exports.checkFollowStatus = async (req, res) => {
    try {
        const userId = req.user.id; // Usuario que está revisando el perfil
        const targetUserId = req.params.id; // Usuario cuyo perfil está siendo revisado

        // Validación de IDs
        if (!userId || !targetUserId) {
            return res.status(400).json({ msg: 'ID de usuario inválido' });
        }

        const user = await User.findById(userId).lean();
        const targetUser = await User.findById(targetUserId).lean();

        if (!user || !targetUser) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const isFollowing = user.following.includes(targetUserId); // Si el usuario actual sigue al perfil revisado
        const isBeingFollowed = targetUser.followers.includes(userId); // Si el perfil revisado sigue al usuario actual

        return res.json({ isFollowing, isBeingFollowed });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Error en el servidor', error: err.message });
    }
};

// Listar usuarios que el usuario autenticado aún no sigue
exports.listUsersToFollow = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('following');
        const usersToFollow = await User.find({
            _id: { $ne: userId, $nin: user.following }
        }).select('name profilePicture');

        return res.json(usersToFollow);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};

// Listar seguidores de un usuario
exports.listFollowers = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId).populate('followers', 'name apellido profilePicture');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        return res.json(user.followers);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};

// Listar usuarios seguidos por un usuario
exports.listFollowing = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId).populate('following', 'name apellido profilePicture');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        return res.json(user.following);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Error en el servidor');
    }
};