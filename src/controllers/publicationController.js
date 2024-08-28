const Publication = require('../models/Publication');

exports.createPublication = async (req, res) => {
    try {
        const { description } = req.body;
        const user = req.user.id;  // Suponiendo que ya tienes autenticación

        const newPublication = new Publication({
            user,
            description
        });

        await newPublication.save();
        res.status(201).json({ message: 'Publication created', publication: newPublication });
    } catch (error) {
        res.status(500).json({ message: 'Error creating publication', error: error.message });
    }
};

// Obtener publicaciones con el perfil del usuario
exports.getAllPublications = async (req, res) => {
    try {
        const publications = await Publication.find()
            .populate('user', 'name profilePicture')  // Supongamos que el usuario tiene un nombre y una imagen de perfil
            .sort({ createdAt: -1 });
        res.json(publications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching publications', error: error.message });
    }
};
