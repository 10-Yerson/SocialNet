const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.URL)
        console.log('MongoDB Conectado');
    } catch (err) {
        console.error('Error al conectara MongoDB...', err);
        process.exit(1);
    }
};

module.exports = connectDB;
