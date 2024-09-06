const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: false
    },
    fechaNacimiento: {
        type: Date,
        required: false 
    },
    genero: {
        type: String,
        enum: ['Masculino', 'Femenino', 'Otro'],
        required: false 
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profileUrl: {
        type: String,
        default: 'https://res.cloudinary.com/dbgj8dqup/image/upload/v1725640005/uploads/ktsngfmjvjv094hygwsu.png' // URL por defecto
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    }
});

// Encriptar contraseña antes de guardar el administrador
AdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('Admin', AdminSchema);
