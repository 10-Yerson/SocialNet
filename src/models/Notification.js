const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['follow', 'like', 'comment', 'mention', 'other'],
        default: 'other',
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    // Para notificaciones de tipo 'like', podemos guardar una referencia a la publicación
    reference: {
        type: Schema.Types.ObjectId,
        refPath: 'refModel',
        required: false
    },
    // Modelo de referencia dinámico (Publication, Comment, etc.)
    refModel: {
        type: String,
        enum: ['Publication', 'Comment', 'User'],
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);