const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const categoryRoutes = require('./categoryRoutes');
const eventApprovalRoutes = require('./eventApprovalRoutes');

// Definir rotas
router.use('/api/auth', authRoutes);
router.use('/api/events', eventRoutes);
router.use('/api/categories', categoryRoutes);
router.use('/api/events', eventApprovalRoutes);

module.exports = router; 