const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://Momentary:z05E3sRANjmduNEI@socialnest.im8vb.mongodb.net/?retryWrites=true&w=majority&appName=socialnest');
        console.log('MongoDB Conectado');
    } catch (err) {
        console.error('Error al conectara MongoDB...', err);
        process.exit(1);
    }
};

module.exports = connectDB;
