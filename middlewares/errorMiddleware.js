const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro para desenvolvimento
  console.error(err);

  // Mongoose erro de ID inválido
  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado';
    error = new ErrorResponse(message, 404);
  }

  // Mongoose erro de validação
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Mongoose erro de duplicidade
  if (err.code === 11000) {
    const message = 'Valor duplicado inserido';
    error = new ErrorResponse(message, 400);
  }

  // JWT erro de token
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = new ErrorResponse(message, 401);
  }

  // JWT erro de expiração
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = new ErrorResponse(message, 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erro do servidor'
  });
};

module.exports = errorHandler; 