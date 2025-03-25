const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
  register, 
  login, 
  getMe,
  updatePassword,
  updateProfile,
  refreshToken
} = require('../controllers/authController');

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
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh-token', refreshToken);

/**
 * @route   GET /api/auth/force-logout
 * @desc    Force logout
 * @access  Public
 */
router.get('/force-logout', (req, res) => {
  res.status(401).json({ 
    message: 'Por favor, faça login novamente.',
    forceLogout: true 
  });
});

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
