const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'O título do evento é obrigatório'],
    trim: true,
    minlength: [3, 'O título deve ter no mínimo 3 caracteres'],
    maxlength: [100, 'O título deve ter no máximo 100 caracteres']
  },
  description: { 
    type: String, 
    required: [true, 'A descrição do evento é obrigatória'],
    trim: true,
    minlength: [10, 'A descrição deve ter no mínimo 10 caracteres']
  },
  date: { 
    type: Date, 
    required: [true, 'A data do evento é obrigatória'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'A data do evento deve ser futura'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.date;
      },
      message: 'A data de término deve ser posterior à data de início'
    }
  },
  location: { 
    address: {
      type: String,
      required: [true, 'O endereço do evento é obrigatório'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'A cidade do evento é obrigatória'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'O estado do evento é obrigatório'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'O país do evento é obrigatório'],
      trim: true,
      default: 'Brasil'
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'A categoria do evento é obrigatória']
  },
  capacity: {
    type: Number,
    min: [1, 'A capacidade mínima é 1 participante'],
    required: [true, 'A capacidade do evento é obrigatória']
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'O preço não pode ser negativo']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'O organizador do evento é obrigatório']
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'canceled', 'finished', 'inactive'],
    default: 'inactive'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  tags: [{ type: String, trim: true }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
eventSchema.virtual('isFullyBooked').get(function() {
  return this.participants.length >= this.capacity;
});

eventSchema.virtual('participantsCount').get(function() {
  return this.participants.length;
});

eventSchema.virtual('isApproved').get(function() {
  return this.approvalStatus === 'approved';
});

// Methods
eventSchema.methods.approve = async function(adminId) {
  this.approvalStatus = 'approved';
  this.approvedBy = adminId;
  this.approvalDate = new Date();
  this.rejectionReason = null;
  this.status = 'active';
  return this.save();
};

eventSchema.methods.reject = async function(adminId, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = adminId;
  this.approvalDate = new Date();
  this.rejectionReason = reason || null;
  this.status = 'inactive';
  return this.save();
};

// Middleware
eventSchema.pre('save', async function(next) {
  if (this.isNew) {
    const User = mongoose.model('User');
    const organizer = await User.findById(this.organizer);
    
    if (organizer && organizer.role === 'admin') {
      this.approvalStatus = 'approved';
      this.approvedBy = this.organizer;
      this.approvalDate = new Date();
      this.status = 'active';
    } else {
      // Para eventos criados por usuários normais, aguardando aprovação
      this.status = 'inactive';
    }
  } else if (this.isModified('approvalStatus')) {
    // Quando o status de aprovação é modificado, atualizar o status do evento
    if (this.approvalStatus === 'approved') {
      this.status = 'active';
    } else if (this.approvalStatus === 'rejected' || this.approvalStatus === 'pending') {
      this.status = 'inactive';
    }
  }
  next();
});

// Índices
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ participants: 1 });
eventSchema.index({ approvalStatus: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ price: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ 'location.state': 1 });
eventSchema.index({ 'location.country': 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ title: 'text', description: 'text', 'location.address': 'text' });

module.exports = mongoose.model('Event', eventSchema);
