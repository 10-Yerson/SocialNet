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
        default: 'https://res.cloudinary.com/dbgj8dqup/image/upload/v1743182322/uploads/ixv6tw8jfbhykflcmyex.png' // URL de imagen por defecto
    },
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    following: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    
    profile: {
        fechaNacimiento: {
            type: Date,
            required: true
        },
        genero: {
            type: String,
            enum: ['Masculino', 'Femenino', 'Otro'],
            required: true
        },
        estadoCivil: {
            type: String,
            enum: ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'],
            required: false
        },
        descripcion: {
            type: String,
            maxlength: 500,
            required: false
        },
        hobbies: [{
            type: String,
            required: false
        }],
        socialLinks: {
            facebook: {
                type: String,
                match: [/^(https?:\/\/)?(www\.)?facebook\.com\/.+$/, 'Por favor, ingresa un enlace válido de Facebook'] ,  required: false
            },
            instagram: {
                type: String,
                match: [/^(https?:\/\/)?(www\.)?instagram\.com\/.+$/, 'Por favor, ingresa un enlace válido de Instagram'] ,  required: false
            }
        },
        origen: { 
            type: String, 
            required: false 
        }
    },
    role: {
        type: String,
        enum: ['user'],
        default: 'user'
    },

    // Nuevos campos para verificación
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationRequest: {
        status: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none'
        },
        requestDate: {
            type: Date
        },
        responseDate: {
            type: Date
        },
        reason: {
            type: String,
            maxlength: 500
        },
        documents: [{
            type: String 
        }],
        rejectionReason: {
            type: String
        }
    }
}, 

{ timestamps: true });

// Encriptar contraseña antes de guardar el usuario
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(8);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
