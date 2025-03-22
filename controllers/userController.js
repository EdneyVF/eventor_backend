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
    status: 'ativo'
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

  const stats = {
    eventsOrganized: await Event.countDocuments({ organizer: user._id }),
    eventsParticipating: await Event.countDocuments({ participants: user._id }),
    activeEvents: await Event.countDocuments({ 
      organizer: user._id,
      status: 'ativo'
    }),
    canceledEvents: await Event.countDocuments({
      organizer: user._id,
      status: 'cancelado'
    })
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