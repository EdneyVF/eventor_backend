const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const ErrorResponse = require('../utils/errorResponse');

// @desc    List pending events
// @route   GET /api/events/approval/pending
// @access  Private/Admin
const listPendingEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ approvalStatus: 'pending' })
    .populate('organizer', 'name email')
    .populate('category', 'name')
    .sort('-createdAt');

  res.json({
    success: true,
    count: events.length,
    events
  });
});

// @desc    Approve an event
// @route   PUT /api/events/:id/approve
// @access  Private/Admin
const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  if (event.approvalStatus !== 'pending') {
    throw new ErrorResponse('Evento não está pendente de aprovação', 400);
  }

  await event.approve(req.user._id);

  res.json({
    success: true,
    message: 'Evento aprovado com sucesso',
    event
  });
});

// @desc    Reject an event
// @route   PUT /api/events/:id/reject
// @access  Private/Admin
const rejectEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    throw new ErrorResponse('Motivo da rejeição é obrigatório', 400);
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  if (event.approvalStatus !== 'pending') {
    throw new ErrorResponse('Evento não está pendente de aprovação', 400);
  }

  await event.reject(req.user._id, reason);

  res.json({
    success: true,
    message: 'Evento rejeitado com sucesso',
    event
  });
});

// @desc    Get event approval status
// @route   GET /api/events/:id/approval-status
// @access  Private
const getApprovalStatus = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .select('approvalStatus approvedBy approvalDate rejectionReason')
    .populate('approvedBy', 'name');

  if (!event) {
    throw new ErrorResponse('Evento não encontrado', 404);
  }

  res.json({
    success: true,
    data: event
  });
});

module.exports = {
  listPendingEvents,
  approveEvent,
  rejectEvent,
  getApprovalStatus
}; 