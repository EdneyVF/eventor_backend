const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Listar eventos pendentes de aprovação
// @route   GET /api/events/pending
// @access  Admin
const getPendingEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ approvalStatus: 'pendente' })
    .populate('organizer', 'name email')
    .populate('category', 'name')
    .sort({ createdAt: -1 });

  res.json(events);
});

// @desc    Aprovar um evento
// @route   PUT /api/events/:id/approve
// @access  Admin
const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  if (event.approvalStatus === 'aprovado') {
    throw new ErrorResponse('Evento já está aprovado', 400);
  }

  await event.approve(req.user._id);

  res.json({
    success: true,
    message: 'Evento aprovado com sucesso',
    event
  });
});

// @desc    Rejeitar um evento
// @route   PUT /api/events/:id/reject
// @access  Admin
const rejectEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    throw new ErrorResponse('Motivo da rejeição é obrigatório', 400);
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  if (event.approvalStatus === 'rejeitado') {
    throw new ErrorResponse('Evento já está rejeitado', 400);
  }

  await event.reject(req.user._id, reason);

  res.json({
    success: true,
    message: 'Evento rejeitado com sucesso',
    event
  });
});

// @desc    Obter status de aprovação de um evento
// @route   GET /api/events/:id/approval-status
// @access  Private
const getApprovalStatus = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .select('approvalStatus approvedBy approvalDate rejectionReason')
    .populate('approvedBy', 'name');

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  res.json(event);
});

module.exports = {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getApprovalStatus
}; 