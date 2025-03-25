const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const {
  listPendingEvents,
  approveEvent,
  rejectEvent,
  getApprovalStatus
} = require('../controllers/eventApprovalController');

// Protected routes
router.use(protect);

// Event approval status route (accessible to authenticated users)
router.get('/:id/approval-status', getApprovalStatus);

// Admin only routes
router.use(admin);

// Event approval management routes
router.get('/approval/pending', listPendingEvents);
router.put('/:id/approve', approveEvent);
router.put('/:id/reject', rejectEvent);

module.exports = router; 