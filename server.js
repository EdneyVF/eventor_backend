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

// Configuração CORS mais flexível para permitir múltiplas origens
const allowedOrigins = [
  'http://localhost:5173',   // Desenvolvimento local
];

// Se FRONTEND_URL estiver definido no .env, adicione-o à lista de origens permitidas
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origem (como apps mobile ou curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('Origem bloqueada pelo CORS:', origin);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-Requested-With",
  credentials: true, // Permitir cookies em requisições cross-origin
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Middlewares globais
app.use(express.json());
app.use(sanitize());
app.use(generalLimiter);

// Rota de status da API
app.get('/api', (req, res) => {
  res.json({ message: "API do Eventor funcionando!" });
});

// Aplicar limitador de login apenas nas rotas de autenticação
app.use('/api/auth', loginLimiter);

// Rotas da API
app.use(routes);

// Middleware de erro
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});