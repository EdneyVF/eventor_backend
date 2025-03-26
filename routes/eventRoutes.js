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
  getUserParticipatingEvents,
  listAllEvents,
  activateEvent,
  deactivateEvent
} = require('../controllers/eventController');

// Rota de busca pública
router.get('/', searchEvents);

// Rotas que requerem autenticação
router.use(protect);

// Rota admin para listar todos os eventos
router.get('/admin/all', admin, listAllEvents);

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

// Rotas admin para ativar/inativar eventos
router.put('/:id/activate', admin, activateEvent);
router.put('/:id/deactivate', admin, deactivateEvent);

module.exports = router; 