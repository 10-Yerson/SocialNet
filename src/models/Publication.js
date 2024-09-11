const mongoose = require('mongoose');

const publicationSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        default: 'https://res.cloudinary.com/dbgj8dqup/image/upload/v1726063964/uploads/byklgfhlcameojyxkbpj.jpg'  // Imagen por defecto
    },
    likes: { 
        type: Number, 
        default: 0 
    },
    comments: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment' 
    }],
    shares: { 
        type: Number, 
        default: 0 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Publication', publicationSchema);
