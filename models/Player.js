const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const PlayerSchema = new Schema({
    username:    { type: String, required: true },      // Nombre de usuario
    email:       { type: String, required: true },      // Correo electronico
    password:    { type: String, required: true },      // Contrase;a
    status:      { type: String, default: 'active' },   // Estado usuario
    created_at:  { type: Date, default: Date.now },     // fecha creacion
    updated_at:  { type: Date, default: Date.now }      // fecha actualizacion
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