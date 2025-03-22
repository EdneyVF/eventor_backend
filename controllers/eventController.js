const Event = require('../models/Event');
const User = require('../models/User');
const Category = require('../models/Category');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Busca e listagem de eventos
// @route   GET /api/events
// @access  Public
const searchEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Inicializa query
  let query = {};
  
  // Busca por texto
  if (req.query.q) {
    query.$text = { $search: req.query.q };
  } else if (req.query.search) {
    // Compatibilidade com parâmetro 'search' antigo
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Filtros de categoria (aceita múltiplos ou único)
  if (req.query.categories) {
    const categoryIds = req.query.categories.split(',');
    query.category = { $in: categoryIds };
  } else if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Filtros de status
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Filtros de data
  let hasDateFilter = false;
  
  if (req.query.from || req.query.to || req.query.startDate || req.query.endDate) {
    query.date = {};
    hasDateFilter = true;
    
    // Compatibilidade com parâmetros antigos
    if (req.query.startDate) {
      query.date.$gte = new Date(req.query.startDate);
    } else if (req.query.from) {
      query.date.$gte = new Date(req.query.from);
    }
    
    if (req.query.endDate) {
      query.date.$lte = new Date(req.query.endDate);
    } else if (req.query.to) {
      query.date.$lte = new Date(req.query.to);
    }
  }
  
  // Filtro para eventos em um período específico (próximos dias)
  if (req.query.period && !hasDateFilter) {
    const today = new Date();
    const future = new Date();
    const days = parseInt(req.query.period, 10) || 30;
    future.setDate(today.getDate() + days);
    
    query.date = { 
      $gte: today,
      $lte: future
    };
  }
  
  // Filtros de localização
  if (req.query.location) {
    const location = req.query.location;
    query.$or = [
      { 'location.city': { $regex: location, $options: 'i' } },
      { 'location.state': { $regex: location, $options: 'i' } },
      { 'location.country': { $regex: location, $options: 'i' } }
    ];
  } else {
    // Filtros específicos de localização
    if (req.query.city) {
      query['location.city'] = { $regex: req.query.city, $options: 'i' };
    }
    if (req.query.state) {
      query['location.state'] = { $regex: req.query.state, $options: 'i' };
    }
    if (req.query.country) {
      query['location.country'] = { $regex: req.query.country, $options: 'i' };
    }
  }
  
  // Filtro de faixa de preço
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) {
      query.price.$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      query.price.$lte = parseFloat(req.query.maxPrice);
    }
  }
  
  // Filtro para eventos gratuitos
  if (req.query.free === 'true') {
    query.price = 0;
  }
  
  // Filtro de capacidade disponível
  if (req.query.hasAvailability === 'true') {
    query.$expr = {
      $lt: [{ $size: '$participants' }, '$capacity']
    };
  }
  
  // Filtro por tags (ex: ?tags=música,arte,gratuito)
  if (req.query.tags) {
    const tagsList = req.query.tags.split(',').map(tag => tag.trim());
    query.tags = { $in: tagsList };
  }
  
  // Apenas eventos aprovados para usuários não-admin
  if (!req.user || req.user.role !== 'admin') {
    query.approvalStatus = 'aprovado';
    query.status = 'ativo';
  }
  
  // Ordenação
  let sortOption = {};
  
  // Se está usando busca por texto, ordena por relevância
  if (req.query.q) {
    sortOption = { score: { $meta: 'textScore' } };
  } else {
    // Outras opções de ordenação
    switch (req.query.sort) {
      case 'date_asc':
      case 'date': // Compatibilidade
        sortOption = { date: 1 };
        break;
      case 'date_desc':
        sortOption = { date: -1 };
        break;
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { date: 1 }; // Padrão: próximos eventos primeiro
    }
  }
  
  // Execute a busca
  const total = await Event.countDocuments(query);
  
  // Projeta o score apenas quando há busca de texto
  const projection = req.query.q ? { score: { $meta: 'textScore' } } : {};
  
  const events = await Event.find(query, projection)
    .populate('category', 'name')
    .populate('organizer', 'name email')
    .sort(sortOption)
    .skip(startIndex)
    .limit(limit);
  
  res.json({
    events,
    page,
    pages: Math.ceil(total / limit),
    total,
    filters: {
      textSearch: !!(req.query.q || req.query.search),
      location: req.query.location || null,
      city: req.query.city || null,
      state: req.query.state || null, 
      country: req.query.country || null,
      dateRange: !!(req.query.from || req.query.to || req.query.startDate || req.query.endDate),
      period: req.query.period ? parseInt(req.query.period, 10) : null,
      price: !!(req.query.minPrice || req.query.maxPrice || req.query.free),
      category: req.query.category || (req.query.categories ? 'multiple' : null),
      hasAvailability: req.query.hasAvailability === 'true'
    }
  });
});

// @desc    Criar evento
// @route   POST /api/events
// @access  Private
const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    date,
    endDate,
    location,
    category,
    capacity,
    price,
    tags
  } = req.body;

  // Validar categoria
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }

  // Validar localização
  if (!location || !location.address || !location.city || !location.state) {
    throw new ErrorResponse('Endereço, cidade e estado são obrigatórios', 400);
  }

  // Validar data
  const eventDate = new Date(date);
  if (eventDate <= new Date()) {
    throw new ErrorResponse('A data do evento deve ser futura', 400);
  }

  // Validar data de término
  if (endDate) {
    const eventEndDate = new Date(endDate);
    if (eventEndDate <= eventDate) {
      throw new ErrorResponse('A data de término deve ser posterior à data de início', 400);
    }
  }

  // Criar evento
  const event = await Event.create({
    title,
    description,
    date,
    endDate,
    location,
    category,
    capacity,
    price: price || 0,
    organizer: req.user._id,
    tags: tags || [],
    approvalStatus: req.user.role === 'admin' ? 'aprovado' : 'pendente'
  });

  const populatedEvent = await Event.findById(event._id)
    .populate('category', 'name')
    .populate('organizer', 'name email');

  res.status(201).json(populatedEvent);
});

// @desc    Obter evento por ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('category', 'name')
    .populate('organizer', 'name email')
    .populate('participants', 'name email')
    .populate('approvedBy', 'name');

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar se o evento não aprovado pode ser visto
  if (event.approvalStatus !== 'aprovado' && 
      (!req.user || 
       (req.user.role !== 'admin' && 
        event.organizer._id.toString() !== req.user._id.toString()))) {
    throw new ErrorResponse('Evento não disponível', 403);
  }

  res.json(event);
});

// @desc    Atualizar evento
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar permissão
  if (event.organizer.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin') {
    throw new ErrorResponse('Não autorizado', 403);
  }

  // Não permitir alterações em eventos finalizados/cancelados
  if (event.status !== 'ativo') {
    throw new ErrorResponse('Não é possível alterar eventos finalizados ou cancelados', 400);
  }

  // Validações específicas
  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      throw new ErrorResponse('Categoria não encontrada', 404);
    }
  }

  if (req.body.date) {
    const newDate = new Date(req.body.date);
    if (newDate <= new Date()) {
      throw new ErrorResponse('A data do evento deve ser futura', 400);
    }
  }

  if (req.body.capacity && req.body.capacity < event.participants.length) {
    throw new ErrorResponse('Nova capacidade não pode ser menor que o número atual de participantes', 400);
  }

  // Se não for admin, alterações significativas requerem nova aprovação
  if (req.user.role !== 'admin') {
    const significantChanges = ['title', 'date', 'price'].some(
      field => req.body[field] !== undefined
    ) || (req.body.location !== undefined);
    
    if (significantChanges) {
      req.body.approvalStatus = 'pendente';
      req.body.approvedBy = null;
      req.body.approvalDate = null;
    }
  }

  event = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
    .populate('category', 'name')
    .populate('organizer', 'name email')
    .populate('participants', 'name email');

  res.json(event);
});

// @desc    Deletar evento
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar permissão
  if (event.organizer.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin') {
    throw new ErrorResponse('Não autorizado', 403);
  }

  // Não permitir deleção de eventos com participantes
  if (event.participants.length > 0) {
    throw new ErrorResponse('Não é possível deletar eventos com participantes', 400);
  }

  await event.deleteOne();

  res.json({
    success: true,
    message: 'Evento deletado com sucesso'
  });
});

// @desc    Participar de um evento
// @route   POST /api/events/:id/participate
// @access  Private
const participateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar se evento está ativo e aprovado
  if (event.status !== 'ativo' || event.approvalStatus !== 'aprovado') {
    throw new ErrorResponse('Evento não está disponível para participação', 400);
  }

  // Verificar se já é participante
  if (event.participants.includes(req.user._id)) {
    throw new ErrorResponse('Você já está participando deste evento', 400);
  }

  // Verificar capacidade
  if (event.participants.length >= event.capacity) {
    throw new ErrorResponse('Evento está lotado', 400);
  }

  // Adicionar participante
  event.participants.push(req.user._id);
  await event.save();

  res.json({
    success: true,
    message: 'Participação confirmada com sucesso'
  });
});

// @desc    Cancelar participação em evento
// @route   DELETE /api/events/:id/participate
// @access  Private
const cancelParticipation = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar se é participante
  if (!event.participants.includes(req.user._id)) {
    throw new ErrorResponse('Você não está participando deste evento', 400);
  }

  // Remover participante
  event.participants = event.participants.filter(
    id => id.toString() !== req.user._id.toString()
  );
  await event.save();

  res.json({
    success: true,
    message: 'Participação cancelada com sucesso'
  });
});

// @desc    Cancelar evento
// @route   PUT /api/events/:id/cancel
// @access  Private
const cancelEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  // Verificar permissão
  if (event.organizer.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin') {
    throw new ErrorResponse('Não autorizado', 403);
  }

  // Verificar se já está cancelado
  if (event.status === 'cancelado') {
    throw new ErrorResponse('Evento já está cancelado', 400);
  }

  event.status = 'cancelado';
  await event.save();

  res.json({
    success: true,
    message: 'Evento cancelado com sucesso'
  });
});

module.exports = {
  searchEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  participateEvent,
  cancelParticipation,
  cancelEvent
};