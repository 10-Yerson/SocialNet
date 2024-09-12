const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://Momentary:7s5AAj9iRjiXRgRK@socialnest.sqee9.mongodb.net/?retryWrites=true&w=majority&appName=SocialNest');
        console.log('MongoDB Conectado');
    } catch (err) {
        console.error('Error al conectara MongoDB...', err);
        process.exit(1);
    }
};

module.exports = connectDB;
