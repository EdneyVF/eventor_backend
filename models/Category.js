const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'O nome da categoria é obrigatório'],
    trim: true,
    unique: true,
    minlength: [2, 'O nome deve ter no mínimo 2 caracteres'],
    maxlength: [50, 'O nome deve ter no máximo 50 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'A descrição deve ter no máximo 200 caracteres']
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema); 