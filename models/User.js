const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'O nome é obrigatório'],
      trim: true,
      minlength: [2, 'O nome deve ter no mínimo 2 caracteres'],
      maxlength: [100, 'O nome deve ter no máximo 100 caracteres']
    },
    email: {
      type: String,
      required: [true, 'O email é obrigatório'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor, insira um email válido',
      ],
    },
    password: { 
      type: String, 
      required: [true, 'A senha é obrigatória'],
      minlength: [6, 'A senha deve ter no mínimo 6 caracteres']
    },
    role: { 
      type: String, 
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} não é um papel válido'
      },
      default: 'user' 
    },
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?[\d\s-()]+$/.test(v);
        },
        message: 'Número de telefone inválido'
      }
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'A biografia deve ter no máximo 500 caracteres']
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual para eventos organizados
userSchema.virtual('organizedEvents', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'organizer'
});

// Virtual para eventos que participa
userSchema.virtual('participatingEvents', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'participants'
});

// Hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Método para verificar senha
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Método para atualizar último login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Índices
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
