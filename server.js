require('dotenv').config();
const express = require("express");
const cors = require("cors");
const connectDB = require('./config/db');
const { loginLimiter, generalLimiter, sanitize } = require('./config/security');
const errorHandler = require('./middlewares/errorMiddleware');
const routes = require('./routes');

connectDB();
const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Middlewares globais
app.use(express.json());
app.use(sanitize());
app.use(generalLimiter);

// Rota de status da API
app.get('/', (req, res) => {
  res.json({ message: "API do Eventor funcionando!" });
});

// Aplicar limitador de login apenas nas rotas de autenticação
app.use('/api/auth', loginLimiter);

// Rotas da aplicação
app.use(routes);

// Middleware de erro
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});