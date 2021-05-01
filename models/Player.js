const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
    username:       { type: String, required: true },      // Nombre de usuario
    image:          { type: String, required: false },     // Imagen
    email:          { type: String, required: true },      // Correo electronico
    password:       { type: String, required: true },      // Contrase;a
    status_account: { type: String, default: 'active' },   // Estado de la cuenta de usuario
    status_player:  { type: String, default: 'offline' },  // Estado del jugador en el juego
    created_at:     { type: Date, default: Date.now },     // fecha creacion
    updated_at:     { type: Date, default: Date.now },     // fecha actualizacion
    // info de partidas
    _points:        { type: Number, default: 0 },          // Puntos
    _xp:            { type: Number, default: 0 },          // Experiencia
    _level:         { type: Number, default: 1 },          // Nivel
    _coins:         { type: Number, default: 0 },          // Monedas
    _hits:          { type: Number, default: 0 },          // # de aciertos
    _maxHits:       { type: Number, default: 0 },          // Maxima racha de aciertos
    _fails:         { type: Number, default: 0 }           // # de fallos
}, {
    timestamps: true, // crea y controla las variables createdAt y updateAt
    versionKey: false
});

// Encripta la contrase;a
PlayerSchema.methods.encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = bcrypt.hash(password, salt);
    return hash;
};

// Compara la contrase;a recibida desde el cliente con la del modelo encontrada
PlayerSchema.methods.matchPassword = async function (password) {
    return await bcrypt.compare(password, this.password);    
};

module.exports = mongoose.model('Player', PlayerSchema);