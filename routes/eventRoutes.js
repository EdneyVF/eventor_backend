const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const {
  searchEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  participateEvent,
  cancelParticipation,
  cancelEvent
} = require('../controllers/eventController');

// Rotas públicas
router.get('/', searchEvents);
router.get('/:id', getEventById);

// Rotas que requerem autenticação
router.use(protect);

router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Rotas de participação
router.post('/:id/participate', participateEvent);
router.delete('/:id/participate', cancelParticipation);
router.put('/:id/cancel', cancelEvent);

module.exports = router; 