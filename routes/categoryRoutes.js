const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} = require('../controllers/categoryController');

// Rotas públicas
router.route('/').get(getCategories);
router.route('/:id').get(getCategoryById);
router.route('/:id/stats').get(getCategoryStats);

// Rotas protegidas (admin)
router.route('/').post(protect, admin, createCategory);
router.route('/:id')
  .put(protect, admin, updateCategory)
  .delete(protect, admin, deleteCategory);

module.exports = router; 