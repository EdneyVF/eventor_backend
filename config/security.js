const rateLimit = require('express-rate-limit');
const sanitize = require('express-mongo-sanitize');

// Rate Limiter para tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 tentativas
  message: {
    message: 'Muitas tentativas de login. Por favor, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter geral para outras rotas
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // limite de 30 requisições por minuto
  message: {
    message: 'Muitas requisições deste IP. Por favor, tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validação de senha forte
const validatePassword = (password) => {
  const minLength = 6;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const isValid = 
    password.length >= minLength && 
    hasNumber && 
    hasLetter && 
    hasSpecialChar;

  if (!isValid) {
    const errors = [];
    if (password.length < minLength) errors.push(`mínimo de ${minLength} caracteres`);
    if (!hasNumber) errors.push('pelo menos um número');
    if (!hasLetter) errors.push('pelo menos uma letra');
    if (!hasSpecialChar) errors.push('pelo menos um caractere especial');

    return {
      isValid: false,
      message: `Senha deve conter: ${errors.join(', ')}`
    };
  }

  return { isValid: true };
};

// Configuração de sanitização
const sanitizeConfig = {
  allowDots: true,
  replaceWith: '_'
};

module.exports = {
  loginLimiter,
  generalLimiter,
  validatePassword,
  sanitize: () => sanitize(sanitizeConfig)
}; 