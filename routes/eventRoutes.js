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
  cancelEvent,
  getUserEvents,
  getUserParticipatingEvents
} = require('../controllers/eventController');

// Rota de busca pública
router.get('/', searchEvents);

// Rotas que requerem autenticação
router.use(protect);

// Rotas para listar eventos do usuário (devem vir ANTES das rotas com parâmetros)
router.get('/my-events', getUserEvents);
router.get('/participating', getUserParticipatingEvents);

// Rotas para eventos específicos
router.post('/', createEvent);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Rotas de participação
router.post('/:id/participate', participateEvent);
router.delete('/:id/participate', cancelParticipation);
router.put('/:id/cancel', cancelEvent);

module.exports = router; 