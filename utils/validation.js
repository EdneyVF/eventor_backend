// Validação de email
const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// Validação de telefone
const validatePhone = (phone) => {
  // Aceita formatos: +55 11 98888-8888, 11 98888-8888, 11988888888
  const re = /^(\+?\d{1,3}\s?)?(\d{2}|\(\d{2}\))[\s.-]?\d{4,5}[\s.-]?\d{4}$/;
  return !phone || re.test(phone); // Retorna true se vazio ou válido
};

// Validação de nome
const validateName = (name) => {
  return name && name.length >= 2 && name.length <= 100;
};

// Validação de bio
const validateBio = (bio) => {
  return !bio || bio.length <= 500; // Retorna true se vazio ou dentro do limite
};

module.exports = {
  validateEmail,
  validatePhone,
  validateName,
  validateBio
}; 