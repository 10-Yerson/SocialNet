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
    },
    video: { 
        type: String  
    },
    likes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
     }],
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
