# Eventor Backend

Eventor é uma plataforma web moderna para criação, gerenciamento e participação em eventos. Este repositório contém o código backend da aplicação, desenvolvido com Node.js, Express e MongoDB.

## 🚀 Funcionalidades

- **Autenticação de Usuários**: Sistema completo de registro, login e gerenciamento de perfil com JWT
- **Gerenciamento de Eventos**: API para criação, edição, listagem e exclusão de eventos
- **Sistema de Aprovação**: Fluxo de aprovação/rejeição de eventos por administradores
- **Participação em Eventos**: Controle de inscrições e capacidade de eventos
- **Gerenciamento de Categorias**: Organização de eventos por categorias temáticas
- **Painel Administrativo**: Endpoints específicos para ações administrativas
- **Filtragem Avançada**: Busca e filtros complexos de eventos por múltiplos parâmetros

## 🧰 Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript
- **Express**: Framework web para Node.js
- **MongoDB**: Banco de dados NoSQL
- **Mongoose**: ODM (Object Data Modeling) para MongoDB
- **JWT**: Autenticação baseada em tokens
- **Bcrypt**: Criptografia de senhas
- **Multer**: Upload de arquivos (imagens de eventos)
- **Joi**: Validação de dados e esquemas

## 📋 Pré-requisitos

- Node.js (versão 14.x ou superior)
- MongoDB (local ou remoto)
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/EdneyVF/eventor_backend
   cd eventor_backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o ambiente:
   - Crie um arquivo `.env` baseado no exemplo `.env.example`:
   ```
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/eventor
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=7d
   ```

## 💻 Como executar

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Para executar em produção:
   ```bash
   npm start
   ```

3. Para popular o banco com dados iniciais:
   ```bash
   npm run seed
   ```

4. A API estará disponível em:
   ```
   http://localhost:3001
   ```

## 🏗️ Estrutura do Projeto

```
eventor_backend/
├── src/                 # Código fonte
│   ├── config/          # Configurações da aplicação
│   ├── controllers/     # Controladores das rotas
│   ├── middlewares/     # Middlewares (auth, validation, etc)
│   ├── models/          # Modelos do Mongoose
│   ├── routes/          # Definição das rotas
│   ├── services/        # Lógica de negócio
│   ├── utils/           # Funções utilitárias
│   └── app.js           # Configuração do Express
├── seeds/               # Scripts para dados iniciais
├── .env                 # Variáveis de ambiente
├── package.json         # Dependências e scripts
└── index.js             # Ponto de entrada da aplicação
```

## 🔐 Autenticação

A autenticação é implementada usando JWT (JSON Web Tokens):

1. Quando um usuário faz login, o servidor valida as credenciais
2. Se válidas, gera um token JWT contendo o ID do usuário e permissões
3. Este token é enviado para o cliente e deve ser incluído no cabeçalho `Authorization` em requisições subsequentes
4. O middleware `auth` verifica a validade do token em rotas protegidas

```javascript
// Exemplo de middleware de autenticação
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Acesso negado' });
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};
```

## 📚 Rotas da API

### Autenticação
- `POST /api/auth/register`: Registro de novo usuário
- `POST /api/auth/login`: Login de usuário
- `GET /api/auth/me`: Obter dados do usuário logado
- `PUT /api/auth/password`: Atualizar senha
- `PUT /api/auth/profile`: Atualizar perfil

### Eventos
- `GET /api/events`: Listar/buscar eventos
- `GET /api/events/:id`: Obter evento por ID
- `POST /api/events`: Criar novo evento
- `PUT /api/events/:id`: Atualizar evento
- `DELETE /api/events/:id`: Deletar evento
- `POST /api/events/:id/participate`: Participar de um evento
- `DELETE /api/events/:id/participate`: Cancelar participação
- `PUT /api/events/:id/cancel`: Cancelar evento
- `PUT /api/events/:id/activate`: Ativar evento
- `PUT /api/events/:id/deactivate`: Desativar evento

### Aprovação de Eventos
- `GET /api/events/pending`: Listar eventos pendentes (admin)
- `PUT /api/events/:id/approve`: Aprovar evento (admin)
- `PUT /api/events/:id/reject`: Rejeitar evento (admin)
- `GET /api/events/:id/approval-status`: Verificar status de aprovação

### Usuários (Admin)
- `GET /api/users`: Listar usuários
- `GET /api/users/:id`: Obter usuário por ID
- `PUT /api/users/:id`: Atualizar usuário
- `DELETE /api/users/:id`: Deletar usuário
- `GET /api/users/:id/stats`: Obter estatísticas do usuário

### Categorias
- `GET /api/categories`: Listar categorias
- `GET /api/categories/:id`: Obter categoria por ID
- `POST /api/categories`: Criar categoria (admin)
- `PUT /api/categories/:id`: Atualizar categoria (admin)
- `DELETE /api/categories/:id`: Deletar categoria (admin)

## 👩‍💻 Fluxos Principais

### Ciclo de Vida de um Evento

1. Usuário cria evento (status: `inactive`, approvalStatus: `pending`)
2. Administrador revisa e aprova/rejeita o evento
3. Se aprovado, o evento pode ser ativado (status: `active`)
4. Usuários podem se inscrever até atingir a capacidade máxima
5. Após a data do evento, status muda para `finished`
6. Evento pode ser cancelado a qualquer momento pelo organizador (status: `canceled`)

## 📊 Dados de Teste

Após executar o seed (`npm run seed`), você terá acesso aos seguintes usuários:

**Administrador**:
- Email: admin@exemplo.com
- Senha: admin123

**Usuário Regular**:
- Email: usuario@exemplo.com
- Senha: user123

## 🧪 Testes

Para executar os testes:
```bash
npm test
# ou
yarn test
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE.txt) para detalhes.

---

Desenvolvido com ❤️ por Edney Vasconcelos Freitas 