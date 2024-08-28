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
        default: 'https://th.bing.com/th/id/R.a0b6a2b06abd39a417d2b181a76c584c?rik=IKbsVNgF0RX8tQ&pid=ImgRaw&r=0'  // Imagen por defecto
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
