const User = require('../models/User');
const Event = require('../models/Event');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const { validateEmail } = require('../utils/validation');

// @desc    Obter todos os usuários
// @route   GET /api/users
// @access  Admin
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const query = {};
  
  // Filtros
  if (req.query.role) {
    query.role = req.query.role;
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password -__v')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.json({
    users,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Obter usuário por ID
// @route   GET /api/users/:id
// @access  Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -__v')
    .populate('participatingEvents', 'title date location status');

  if (!user) {
    throw new ErrorResponse('Usuário não encontrado', 404);
  }

  res.json(user);
});

// @desc    Atualizar usuário
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ErrorResponse('Usuário não encontrado', 404);
  }

  // Validações
  if (req.body.email && !validateEmail(req.body.email)) {
    throw new ErrorResponse('Email inválido', 400);
  }

  if (req.body.email && req.body.email !== user.email) {
    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) {
      throw new ErrorResponse('Email já está em uso', 400);
    }
  }

  if (req.body.role && !['user', 'admin'].includes(req.body.role)) {
    throw new ErrorResponse('Papel inválido', 400);
  }

  // Atualizar campos
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    phone: req.body.phone,
    bio: req.body.bio
  };

  // Remover campos undefined
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password -__v');

  res.json(updatedUser);
});

// @desc    Deletar usuário
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ErrorResponse('Usuário não encontrado', 404);
  }

  // Verificar se usuário tem eventos ativos
  const activeEvents = await Event.find({
    organizer: user._id,
    status: 'active'
  });

  if (activeEvents.length > 0) {
    throw new ErrorResponse(
      'Não é possível deletar usuário com eventos ativos',
      400
    );
  }

  // Remover usuário de eventos que participa
  await Event.updateMany(
    { participants: user._id },
    { $pull: { participants: user._id } }
  );

  await user.deleteOne();

  res.json({
    success: true,
    message: 'Usuário deletado com sucesso'
  });
});

// @desc    Obter estatísticas do usuário
// @route   GET /api/users/:id/stats
// @access  Admin
const getUserStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ErrorResponse('Usuário não encontrado', 404);
  }

  // Estatísticas básicas
  const eventsOrganized = await Event.countDocuments({ organizer: user._id });
  const eventsParticipating = await Event.countDocuments({ participants: user._id });
  const activeEvents = await Event.countDocuments({ 
    organizer: user._id,
    status: 'active'
  });
  const canceledEvents = await Event.countDocuments({
    organizer: user._id,
    status: 'canceled'
  });

  // Obter todos os eventos organizados pelo usuário para cálculos avançados
  const userEvents = await Event.find({ organizer: user._id });
  
  // Calcular total de participantes e média
  let totalParticipants = 0;
  userEvents.forEach(event => {
    totalParticipants += event.participants.length;
  });
  
  const avgParticipantsPerEvent = eventsOrganized > 0 
    ? (totalParticipants / eventsOrganized).toFixed(2) 
    : 0;

  // Calcular eventos por mês (últimos 12 meses)
  const eventsByMonth = {};
  const now = new Date();
  
  // Inicializar contagem para os últimos 12 meses
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    // Formato ISO para o primeiro dia do mês (YYYY-MM-01)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    eventsByMonth[monthKey] = {
      count: 0,
      month: d.getMonth(),
      year: d.getFullYear()
    };
  }
  
  // Contar eventos por mês
  userEvents.forEach(event => {
    const eventDate = new Date(event.createdAt);
    // Só considerar eventos dos últimos 12 meses
    const monthDiff = (now.getFullYear() - eventDate.getFullYear()) * 12 + 
                      now.getMonth() - eventDate.getMonth();
    
    if (monthDiff >= 0 && monthDiff < 12) {
      // Formato ISO para o primeiro dia do mês (YYYY-MM-01)
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-01`;
      
      // Incrementar contador para este mês
      if (eventsByMonth[monthKey]) {
        eventsByMonth[monthKey].count++;
      }
    }
  });

  // Retornar estatísticas completas
  const stats = {
    // Estatísticas básicas
    eventsOrganized,
    eventsParticipating,
    activeEvents,
    canceledEvents,
    
    // Estatísticas avançadas
    participantsStats: {
      totalParticipants,
      avgParticipantsPerEvent: parseFloat(avgParticipantsPerEvent)
    },
    
    // Distribuição temporal
    eventsByMonth: Object.entries(eventsByMonth)
      .map(([date, data]) => ({
        date,  // Data em formato ISO (YYYY-MM-01)
        count: data.count
      }))
      .sort((a, b) => b.date.localeCompare(a.date))  // Ordena por data (mais recente primeiro)
  };

  res.json(stats);
});

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
};