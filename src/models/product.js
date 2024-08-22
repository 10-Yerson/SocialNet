const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    like : {
        type: Number,
        require: true
    },

    role: {
        type: String,
        enum: ['user'],
        default: 'user'
    }
})

module.exports = mongoose.model('Product', ProductSchema);