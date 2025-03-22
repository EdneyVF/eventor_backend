const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Proteger rotas - requer autenticação
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar header de autorização
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obter token
      token = req.headers.authorization.split(' ')[1];

      // Verificar formato do token
      if (!token || token === 'null' || token === 'undefined') {
        res.status(401);
        throw new Error('Token inválido');
      }

      // Verificar e decodificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar se o ID é válido
      if (!decoded.id) {
        res.status(401);
        throw new Error('Token mal formado');
      }

      // Buscar usuário
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401);
        throw new Error('Usuário não encontrado');
      }

      // Adicionar usuário à requisição
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        res.status(401);
        throw new Error('Token inválido');
      }
      if (error.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error('Token expirado');
      }
      throw error;
    }
  } else {
    res.status(401);
    throw new Error('Não autorizado, token não encontrado');
  }
});

// Verificar se é admin
const admin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Não autorizado');
  }

  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Não autorizado, acesso apenas para administradores');
  }

  next();
});

module.exports = { 
  protect, 
  admin
};