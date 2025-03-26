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
      $or: [
        { $eq: ['$capacity', null] }, // Unlimited capacity
        { $lt: [{ $size: '$participants' }, '$capacity'] } // Has spots available
      ]
    };
  }
  
  // Filtro por tags (ex: ?tags=música,arte,gratuito)
  if (req.query.tags) {
    const tagsList = req.query.tags.split(',').map(tag => tag.trim());
    query.tags = { $in: tagsList };
  }
  
  // Apenas eventos aprovados para usuários não-admin
  if (!req.user || req.user.role !== 'admin') {
    query.approvalStatus = 'approved';
    // Se um status específico não for solicitado, mostrar apenas eventos ativos
    if (!req.query.status) {
      query.status = 'active';
    }
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

  // Validar campos obrigatórios
  if (!title || !description || !date || !location || !category) {
    throw new ErrorResponse('Título, descrição, data, localização e categoria são obrigatórios', 400);
  }

  // Validar título e descrição
  if (title.length < 3 || title.length > 100) {
    throw new ErrorResponse('Título deve ter entre 3 e 100 caracteres', 400);
  }

  if (description.length < 10) {
    throw new ErrorResponse('Descrição deve ter pelo menos 10 caracteres', 400);
  }

  // Validar capacidade se fornecida
  if (capacity !== null && capacity !== undefined && capacity < 0) {
    throw new ErrorResponse('Capacidade deve ser um valor não-negativo', 400);
  }

  // Validar categoria
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ErrorResponse('Categoria não encontrada', 404);
  }

  // Verificar se a categoria está ativa
  if (!categoryExists.active) {
    throw new ErrorResponse('Esta categoria está inativa e não pode ser usada', 400);
  }

  // Validar localização
  if (!location.address || !location.city || !location.state) {
    throw new ErrorResponse('Endereço, cidade e estado são obrigatórios', 400);
  }

  // Validar data
  let eventDate;
  try {
    eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      throw new Error();
    }
  } catch (error) {
    throw new ErrorResponse('Formato de data inválido', 400);
  }
  
  const now = new Date();
  if (eventDate <= now) {
    throw new ErrorResponse('A data do evento deve ser futura', 400);
  }

  // Validar data de término
  let eventEndDate;
  if (endDate) {
    try {
      eventEndDate = new Date(endDate);
      if (isNaN(eventEndDate.getTime())) {
        throw new Error();
      }
    } catch (error) {
      throw new ErrorResponse('Formato de data de término inválido', 400);
    }
    
    if (eventEndDate <= eventDate) {
      throw new ErrorResponse('A data de término deve ser posterior à data de início', 400);
    }
  }

  // Validar preço
  let eventPrice = 0;
  if (price !== undefined) {
    eventPrice = parseFloat(price);
    if (isNaN(eventPrice) || eventPrice < 0) {
      throw new ErrorResponse('Preço deve ser um valor não-negativo', 400);
    }
  }

  // Validar tags
  let eventTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      eventTags = tags;
    } else if (typeof tags === 'string') {
      eventTags = tags.split(',').map(tag => tag.trim());
    }
    
    // Limitar quantidade de tags
    if (eventTags.length > 10) {
      throw new ErrorResponse('Máximo de 10 tags permitidas', 400);
    }
    
    // Validar cada tag
    eventTags.forEach(tag => {
      if (tag.length < 3 || tag.length > 30) {
        throw new ErrorResponse('Cada tag deve ter entre 3 e 30 caracteres', 400);
      }
    });
  }

  // Preparar dados do evento
  const eventData = {
    title,
    description,
    date: eventDate,
    location,
    category,
    capacity,
    organizer: req.user._id,
    approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending',
    price: eventPrice,
    tags: eventTags
  };
  
  // Definir status com base no status de aprovação
  eventData.status = eventData.approvalStatus === 'approved' ? 'active' : 'inactive';
  
  // Adicionar data de término se fornecida
  if (eventEndDate) {
    eventData.endDate = eventEndDate;
  }

  // Criar evento
  const event = await Event.create(eventData);

  // Retornar evento com dados populados
  const populatedEvent = await Event.findById(event._id)
    .populate('category', 'name')
    .populate('organizer', 'name email');

  // Adicionar flag informando se o evento precisa de aprovação
  const result = populatedEvent.toObject();
  result.needsApproval = result.approvalStatus === 'pending';

  res.status(201).json({
    success: true,
    message: result.needsApproval 
      ? 'Evento criado com sucesso e aguardando aprovação' 
      : 'Evento criado com sucesso',
    event: result
  });
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
  if (event.approvalStatus !== 'approved' && 
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

  // Não permitir alterações em eventos cancelados
  if (event.status === 'canceled') {
    throw new ErrorResponse('Não é possível alterar eventos cancelados', 400);
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

  if (req.body.capacity !== null && req.body.capacity !== undefined && req.body.capacity < event.participants.length) {
    throw new ErrorResponse('Nova capacidade não pode ser menor que o número atual de participantes', 400);
  }

  // Se for admin, o evento é automaticamente aprovado e ativado
  if (req.user.role === 'admin') {
    req.body.approvalStatus = 'approved';
    req.body.approvedBy = req.user._id;
    req.body.approvalDate = new Date();
    req.body.status = 'active';
  } else {
    // Se não for admin, qualquer alteração requer nova aprovação
    req.body.approvalStatus = 'pending';
    req.body.approvedBy = null;
    req.body.approvalDate = null;
    // Definir status como inativo quando aprovação pendente
    req.body.status = 'inactive';
  }

  event = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  )
    .populate('category', 'name')
    .populate('organizer', 'name email')
    .populate('participants', 'name email');

  res.json({
    success: true,
    message: event.approvalStatus === 'pending' 
      ? 'Evento atualizado com sucesso e aguardando aprovação' 
      : 'Evento atualizado com sucesso',
    event
  });
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

  // Verificar se evento está ativo
  if (event.status !== 'active') {
    throw new ErrorResponse('Evento não está disponível para participação', 400);
  }

  // Verificar se já é participante
  if (event.participants.includes(req.user._id)) {
    throw new ErrorResponse('Você já está participando deste evento', 400);
  }

  // Verificar capacidade
  if (event.capacity !== null && event.participants.length >= event.capacity) {
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
  if (event.status === 'canceled') {
    throw new ErrorResponse('Evento já está cancelado', 400);
  }

  event.status = 'canceled';
  await event.save();

  res.json({
    success: true,
    message: 'Evento cancelado com sucesso'
  });
});

// @desc    Listar eventos do usuário
// @route   GET /api/events/my-events
// @access  Private
const getUserEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filtro base: eventos organizados pelo usuário
  const query = {
    organizer: req.user._id
  };
  
  // Filtro adicional por status (se fornecido)
  if (req.query.status && ['active', 'inactive', 'canceled', 'finished'].includes(req.query.status)) {
    query.status = req.query.status;
  }

  // Filtro adicional por status de aprovação (se fornecido)
  if (req.query.approvalStatus && ['pending', 'approved', 'rejected'].includes(req.query.approvalStatus)) {
    query.approvalStatus = req.query.approvalStatus;
  }
  
  // Calcular total de eventos
  const total = await Event.countDocuments(query);
  
  // Buscar eventos com paginação
  const events = await Event.find(query)
    .populate('category', 'name')
    .populate({
      path: 'participants',
      select: 'name email',
      options: { limit: 5 } // Limitar número de participantes retornados
    })
    .sort({ createdAt: -1 }) // Ordenar por data de criação (mais recente primeiro)
    .skip(startIndex)
    .limit(limit);
  
  // Retornar eventos com metadados
  res.json({
    events,
    page,
    pages: Math.ceil(total / limit),
    total,
    counts: {
      total: await Event.countDocuments({ organizer: req.user._id }),
      active: await Event.countDocuments({ organizer: req.user._id, status: 'active' }),
      inactive: await Event.countDocuments({ organizer: req.user._id, status: 'inactive' }),
      canceled: await Event.countDocuments({ organizer: req.user._id, status: 'canceled' }),
      finished: await Event.countDocuments({ organizer: req.user._id, status: 'finished' }),
      pending: await Event.countDocuments({ organizer: req.user._id, approvalStatus: 'pending' }),
      approved: await Event.countDocuments({ organizer: req.user._id, approvalStatus: 'approved' }),
      rejected: await Event.countDocuments({ organizer: req.user._id, approvalStatus: 'rejected' })
    }
  });
});

// @desc    Listar eventos que o usuário está participando
// @route   GET /api/events/participating
// @access  Private
const getUserParticipatingEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filtro base: eventos em que o usuário é participante
  let query = {
    participants: req.user._id
  };
  
  // Filtro adicional por status, padrão é 'active'
  query.status = req.query.status || 'active';
  
  // Por padrão, mostrar apenas eventos aprovados, exceto quando solicitando eventos inativos
  if (query.status !== 'inactive') {
    query.approvalStatus = 'approved';
  }
  
  // Filtro adicional por data (passados/futuros)
  if (req.query.when === 'past') {
    query.date = { $lt: new Date() };
  } else if (req.query.when === 'future' || !req.query.when) {
    // Padrão: eventos futuros
    query.date = { $gte: new Date() };
  }
  
  // Calcular total de eventos
  const total = await Event.countDocuments(query);
  
  // Buscar eventos com paginação
  const events = await Event.find(query)
    .populate('category', 'name')
    .populate('organizer', 'name email')
    .sort({ date: 1 }) // Ordenar por data (próximos eventos primeiro)
    .skip(startIndex)
    .limit(limit);
  
  // Retornar eventos com metadados
  res.json({
    events,
    page,
    pages: Math.ceil(total / limit),
    total,
    counts: {
      upcoming: await Event.countDocuments({
        participants: req.user._id,
        status: 'active',
        approvalStatus: 'approved',
        date: { $gte: new Date() }
      }),
      past: await Event.countDocuments({
        participants: req.user._id,
        status: { $in: ['active', 'finished'] },
        approvalStatus: 'approved',
        date: { $lt: new Date() }
      }),
      canceled: await Event.countDocuments({
        participants: req.user._id,
        status: 'canceled'
      }),
      inactive: await Event.countDocuments({
        participants: req.user._id,
        status: 'inactive'
      })
    }
  });
});

// @desc    Listar todos os eventos (admin)
// @route   GET /api/events/admin/all
// @access  Admin
const listAllEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Inicializa query
  let query = {};
  
  // Busca por texto
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Filtros de categoria
  if (req.query.categories) {
    const categoryIds = req.query.categories.split(',');
    query.category = { $in: categoryIds };
  } else if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Filtros de status (opcional)
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }
  
  // Filtros de status de aprovação (opcional)
  if (req.query.approvalStatus && req.query.approvalStatus !== 'all') {
    query.approvalStatus = req.query.approvalStatus;
  }
  
  // Filtros de organizer (opcional)
  if (req.query.organizer) {
    query.organizer = req.query.organizer;
  }
  
  // Filtros de data
  if (req.query.from || req.query.to) {
    query.date = {};
    
    if (req.query.from) {
      query.date.$gte = new Date(req.query.from);
    }
    
    if (req.query.to) {
      query.date.$lte = new Date(req.query.to);
    }
  }
  
  // Ordenação
  let sortOption = {};
  
  // Opções de ordenação
  switch (req.query.sort) {
    case 'date_asc':
      sortOption = { date: 1 };
      break;
    case 'date_desc':
      sortOption = { date: -1 };
      break;
    case 'title_asc':
      sortOption = { title: 1 };
      break;
    case 'title_desc':
      sortOption = { title: -1 };
      break;
    case 'recent':
      sortOption = { createdAt: -1 };
      break;
    default:
      sortOption = { createdAt: -1 }; // Padrão: eventos mais recentes primeiro
  }
  
  // Contagens para o dashboard
  const counts = {
    total: await Event.countDocuments({}),
    active: await Event.countDocuments({ status: 'active' }),
    inactive: await Event.countDocuments({ status: 'inactive' }),
    canceled: await Event.countDocuments({ status: 'canceled' }),
    finished: await Event.countDocuments({ status: 'finished' }),
    pending: await Event.countDocuments({ approvalStatus: 'pending' }),
    approved: await Event.countDocuments({ approvalStatus: 'approved' }),
    rejected: await Event.countDocuments({ approvalStatus: 'rejected' })
  };
  
  // Execute a busca
  const total = await Event.countDocuments(query);
  
  const events = await Event.find(query)
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
    counts
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
  cancelEvent,
  getUserEvents,
  getUserParticipatingEvents,
  listAllEvents
};