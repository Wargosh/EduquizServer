const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendSchema = new Schema({
    user_first: { type: String, required: true }, // usuario que envia la solicitud
    user_second: { type: String, required: true }, // usuario a quien va dirigido
    private_room: { type: String, required: true }, // cadena utilizada para la comunicación entre ambos usuarios
    status: { type: Number, required: true, default: 0 }, // [0=solicitud, 1=amigos, 3=bloqueo]
}, {
    timestamps: true, // crea y controla las variables createdAt y updateAt
    versionKey: false
});

module.exports = mongoose.model('Friend', FriendSchema);