const Category = require('../models/Category');
const Event = require('../models/Event');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Listar todas as categorias
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  // Opções de filtro
  const filter = {};
  
  // Se não for admin, mostrar apenas categorias ativas
  if (!req.user || req.user.role !== 'admin') {
    filter.active = true;
  }

  // Buscar categorias
  const categories = await Category.find(filter).sort({ name: 1 });
  
  res.json(categories);
});

// @desc    Obter categoria por ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  // Se a categoria estiver inativa e o usuário não for admin
  if (!category.active && (!req.user || req.user.role !== 'admin')) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  res.json(category);
});

// @desc    Criar nova categoria
// @route   POST /api/categories
// @access  Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, active } = req.body;
  
  // Verificar se categoria já existe
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new ErrorResponse('Categoria com este nome já existe', 400);
  }
  
  // Criar categoria
  const category = await Category.create({
    name,
    description,
    active: active !== undefined ? active : true
  });
  
  res.status(201).json(category);
});

// @desc    Atualizar categoria
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, active } = req.body;
  
  let category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  // Verificar duplicidade de nome
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new ErrorResponse('Categoria com este nome já existe', 400);
    }
  }
  
  // Atualizar categoria
  category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description, active },
    { new: true, runValidators: true }
  );
  
  res.json(category);
});

// @desc    Deletar categoria
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  // Verificar se existem eventos usando esta categoria
  const eventsCount = await Event.countDocuments({ category: req.params.id });
  
  if (eventsCount > 0) {
    // Em vez de impedir a exclusão, marcar como inativa
    category.active = false;
    await category.save();
    
    return res.json({
      success: true,
      message: 'Categoria marcada como inativa pois existem eventos associados a ela',
      eventsCount
    });
  }
  
  // Se não houver eventos, excluir definitivamente
  await category.deleteOne();
  
  res.json({
    success: true,
    message: 'Categoria removida com sucesso'
  });
});

// @desc    Obter estatísticas de uma categoria específica
// @route   GET /api/categories/:id/stats
// @access  Public
const getCategoryStats = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  // Se a categoria estiver inativa e o usuário não for admin
  if (!category.active && (!req.user || req.user.role !== 'admin')) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }
  
  // Filtro para eventos
  const eventFilter = { 
    category: category._id 
  };
  
  // Usuários normais só veem eventos aprovados e ativos
  if (!req.user || req.user.role !== 'admin') {
    eventFilter.approvalStatus = 'approved';
    eventFilter.status = 'active';
  }
  
  // Obter todos os eventos da categoria
  const events = await Event.find(eventFilter)
    .select('status participants');
  
  // Calcular estatísticas
  let totalParticipants = 0;
  events.forEach(event => {
    totalParticipants += event.participants.length;
  });
  
  const eventsCount = events.length;
  const avgParticipantsPerEvent = eventsCount > 0 
    ? (totalParticipants / eventsCount).toFixed(2) 
    : 0;
  
  // Eventos agrupados por status
  const eventsByStatus = {
    active: events.filter(e => e.status === 'active').length,
    canceled: events.filter(e => e.status === 'canceled').length,
    finished: events.filter(e => e.status === 'finished').length
  };
  
  // Retornar estatísticas
  res.json({
    category: {
      _id: category._id,
      name: category.name,
      description: category.description
    },
    stats: {
      eventsCount,
      totalParticipants,
      avgParticipantsPerEvent: parseFloat(avgParticipantsPerEvent),
      eventsByStatus
    }
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
}; 