const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestionSchema = new Schema({
    question:    { type: String, required: true }, // pregunta
    category:    { type: String, required: true }, // categoeria
    images:     [{ type: String, required: false }], // puede tener 0 o varias imagenes
    options:    [{ option: String, status: Boolean }], // varias opciones de respuesta
    status:      { type: String, default: 'active' }, // estado de la pregunta
    user:        { type: String, required: true }, // usuario que crea la pregunta.
    created_at:  { type: Date, default: Date.now }, // fecha creacion
    updated_at:  { type: Date, default: Date.now } // fecha actualizacion
}, {
    timestamps: true, // crea y controla las variables createdAt y updateAt
    versionKey: false
});

module.exports = mongoose.model('Question', QuestionSchema);