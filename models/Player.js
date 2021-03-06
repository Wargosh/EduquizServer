const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
    username:           { type: String, required: true },      // Nombre de usuario
    tittle:             { type: String, required: false},      // Titulo del jugador
    image:              { type: String, required: false },     // Imagen
    email:              { type: String, required: true },      // Correo electronico
    password:           { type: String, required: true },      // Contrase;a
    status_account:     { type: String, default: 'active' },   // Estado de la cuenta de usuario
    status_player:      { type: String, default: 'offline' },  // Estado del jugador en el juego
    // info de partidas
    _points:            { type: Number, default: 0 },          // Puntos
    _xp:                { type: Number, default: 0 },          // Experiencia
    _level:             { type: Number, default: 1 },          // Nivel
    _coins:             { type: Number, default: 0 },          // Monedas
    _hits:              { type: Number, default: 0 },          // # de aciertos
    _maxHits:           { type: Number, default: 0 },          // Maxima racha de aciertos
    _fails:             { type: Number, default: 0 },          // # de fallos
    // Mas estadisticas
    _totalGames:        { type: Number, default: 0 },          // # total de partidas jugadas (en cualquier modo)
    _numMedalsGold:     { type: Number, default: 0 },          // # total de medallas de oro obtenidas
    _numMedalsSilver:   { type: Number, default: 0 },          // # total de medallas de plata obtenidas
    _numMedalsBronze:   { type: Number, default: 0 }           // # total de medallas de bronce obtenidas
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