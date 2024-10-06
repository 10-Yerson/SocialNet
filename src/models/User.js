const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    
    },
    fechaNacimiento: {
        type: Date,
        required: true
    },
    genero: {
        type: String,
        enum: ['Masculino', 'Femenino', 'Otro'],
        required: true
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
    profilePicture: {
        type: String,
        default: 'https://res.cloudinary.com/dbgj8dqup/image/upload/v1725640005/uploads/ktsngfmjvjv094hygwsu.png' // URL de imagen por defecto
    },
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }], // Almacena los usuarios que siguen a este usuario
    following: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }], // Almacena los usuarios a los que este usuario sigue
    role: {
        type: String,
        enum: ['user'],
        default: 'user'
    }
});

// Encriptar contraseña antes de guardar el usuario
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
