const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestionSchema = new Schema({
    question:   { type: String, required: true }, // pregunta
    category:   { type: String, required: true }, // categoeria
    images:     [{ type: String, required: false }], // puede tener 0 o varias imagenes
    options:    [{ option: String, status: Boolean }], // varias opciones de respuesta
    status:     { type: String, default: 'active' },
    created_at:  { type: Date, default: Date.now }, // fecha creacion
    updated_at:  { type: Date, default: Date.now } // fecha actualizacion
});

module.exports = mongoose.model('Question', QuestionSchema);