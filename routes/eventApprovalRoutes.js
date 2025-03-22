const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getApprovalStatus
} = require('../controllers/eventApprovalController');

// Rotas que requerem autenticação de admin
router.use(protect);

// Rotas públicas para usuários autenticados
router.get('/:id/approval-status', getApprovalStatus);

// Rotas que requerem privilégios de admin
router.use(admin);
router.get('/pending', getPendingEvents);
router.put('/:id/approve', approveEvent);
router.put('/:id/reject', rejectEvent);

module.exports = router; 