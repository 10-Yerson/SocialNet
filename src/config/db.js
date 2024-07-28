const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/auth-system');
        console.log('MongoDB Conectado');
    } catch (err) {
        console.error('Error al conectara MongoDB...', err);
        process.exit(1);
    }
};

module.exports = connectDB;
