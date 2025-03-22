const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe,
  updatePassword,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 * @body    { name, email, password, phone?, bio? }
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuário e retornar token
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do usuário logado
 * @access  Private
 * @header  Authorization: Bearer token
 */
router.get('/me', protect, getMe);

/**
 * @route   PUT /api/auth/password
 * @desc    Atualizar senha do usuário
 * @access  Private
 * @body    { currentPassword, newPassword }
 * @header  Authorization: Bearer token
 */
router.put('/password', protect, updatePassword);

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualizar perfil do usuário
 * @access  Private
 * @body    { name?, phone?, bio? }
 * @header  Authorization: Bearer token
 */
router.put('/profile', protect, updateProfile);

module.exports = router;
