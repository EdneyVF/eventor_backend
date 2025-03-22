# Eventor - Backend

API para gerenciamento de eventos com sistema de usuários, aprovações e participações.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript
- **Express**: Framework web para Node.js
- **MongoDB**: Banco de dados NoSQL
- **Mongoose**: ODM (Object Data Modeling) para MongoDB
- **JWT**: Autenticação baseada em tokens
- **Bcrypt**: Criptografia de senhas

## Pré-requisitos

- Node.js (v14 ou superior)
- MongoDB (local ou remoto)

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`
   - Preencha com suas configurações (MongoDB URI, JWT Secret, etc.)

## Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Populando o Banco de Dados com Dados Iniciais
```bash
npm run seed
```

## Rotas da API

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

## Dados de Teste

Após executar o seed (`npm run seed`), você terá acesso aos seguintes usuários:

**Administrador**:
- Email: admin@exemplo.com
- Senha: admin123

**Usuário Regular**:
- Email: usuario@exemplo.com
- Senha: user123 