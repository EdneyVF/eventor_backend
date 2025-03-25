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

      let decoded;
      try {
        // Tentar verificar com audience e issuer primeiro (novos tokens)
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          audience: 'eventor-app',
          issuer: 'eventor-api'
        });
      } catch (verifyError) {
        // Se falhar, tentar verificar sem audience e issuer (compatibilidade com tokens antigos)
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('Token verificado em modo de compatibilidade');
        } catch (fallbackError) {
          // Se ambos falharem, registrar o erro e lançar
          console.error('Erro na verificação do token:', verifyError.message);
          console.error('Erro no fallback:', fallbackError.message);
          throw verifyError; // Usar o erro original
        }
      }

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

      // Verificar se o papel do usuário no token corresponde ao do banco de dados
      // Só verificar se o token incluir o campo role
      if (decoded.role && decoded.role !== user.role) {
        res.status(401);
        throw new Error('Token inválido: informações inconsistentes');
      }

      // Adicionar usuário à requisição
      req.user = user;
      next();
    } catch (error) {
      console.error('Erro de autenticação:', error.name, error.message);
      
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