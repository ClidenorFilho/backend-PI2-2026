# 🏗️ API de Cadastro de Usuários — Guia Completo

## Estrutura de Arquivos

```
project/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   └── UserController.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── middlewares/
│   │   └── validateUserRegistration.ts
│   ├── routes/
│   │   └── userRoutes.ts
│   ├── services/
│   │   └── UserService.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 1. Comandos de Setup (do zero)

```bash
# 1. Criar pasta e entrar nela
mkdir user-registration-api && cd user-registration-api

# 2. Inicializar package.json (já configurado nos arquivos)
npm init -y

# 3. Instalar dependências de produção
npm install express @prisma/client bcrypt zod

# 4. Instalar dependências de desenvolvimento
npm install -D typescript ts-node-dev @types/node @types/express @types/bcrypt prisma

# 5. Copiar os arquivos do projeto para a pasta

# 6. Criar o .env a partir do exemplo
cp .env.example .env

# 7. Inicializar o Prisma (somente se for do zero, sem o schema.prisma)
# npx prisma init  ← apenas se não tiver o schema ainda

# 8. Gerar o Prisma Client
npx prisma generate

# 9. Criar e aplicar a migration (requer banco rodando)
npx prisma migrate dev --name init_users
```

---

## 2. Rodando com Docker (recomendado)

```bash
# Subir os containers (API + PostgreSQL)
docker-compose up --build

# Em background
docker-compose up --build -d

# Ver logs da API
docker-compose logs -f api

# Parar tudo
docker-compose down

# Parar e apagar volumes (reseta o banco)
docker-compose down -v
```

---

## 3. Rodando em Desenvolvimento Local

```bash
# Requer PostgreSQL local ou o container do postgres rodando

# Subir só o banco via docker
docker-compose up postgres -d

# Rodar a API em modo dev (hot reload)
npm run dev
```

---

## 4. Testando a API

### Cadastro de Proprietário (sem CREA)

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao.silva@email.com",
    "cpf": "529.982.247-25",
    "password": "Senha@123",
    "confirmPassword": "Senha@123",
    "profile": "PROPRIETARIO"
  }'
```

**Resposta 201:**
```json
{
  "status": "success",
  "message": "Usuário cadastrado com sucesso.",
  "data": {
    "user": {
      "id": "uuid-aqui",
      "name": "João Silva",
      "email": "joao.silva@email.com",
      "profile": "PROPRIETARIO",
      "createdAt": "2024-03-01T12:00:00.000Z"
    }
  }
}
```

---

### Cadastro de Construtor (com CREA obrigatório)

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Engenheira",
    "email": "maria@engenharia.com",
    "cpf": "529.982.247-25",
    "password": "Build@2024",
    "confirmPassword": "Build@2024",
    "profile": "CONSTRUTOR",
    "crea": "CREA-SP 123456/D"
  }'
```

---

### Erro 400 — Validação (CREA ausente para Construtor)

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Construtor",
    "email": "carlos@build.com",
    "cpf": "111.444.777-35",
    "password": "Forte@999",
    "confirmPassword": "Forte@999",
    "profile": "CONSTRUTOR"
  }'
```

**Resposta 400:**
```json
{
  "status": "error",
  "message": "Dados inválidos. Verifique os campos abaixo.",
  "errors": {
    "crea": "O campo 'crea' é obrigatório para o perfil CONSTRUTOR."
  }
}
```

---

### Erro 409 — E-mail duplicado

**Resposta 409:**
```json
{
  "status": "error",
  "message": "Este e-mail já está cadastrado. Utilize outro ou faça login.",
  "errors": {
    "email": "Este e-mail já está cadastrado. Utilize outro ou faça login."
  }
}
```

---

## 5. Regras de Validação Resumidas

| Campo            | Regra                                                                 |
|------------------|-----------------------------------------------------------------------|
| `name`           | Mínimo nome + sobrenome, 2 letras cada                               |
| `email`          | Formato válido, único no banco                                       |
| `cpf`            | Algoritmo verificador real, aceita pontuação, salvo só dígitos       |
| `password`       | 8+ chars, maiúscula, minúscula, símbolo, sem 123/abc                 |
| `confirmPassword`| Deve ser idêntico ao `password`                                      |
| `profile`        | `CONSTRUTOR` ou `PROPRIETARIO`                                       |
| `crea`           | Obrigatório se `profile = CONSTRUTOR`, ignorado para `PROPRIETARIO`  |

---

## 6. Fluxo da Requisição

```
POST /users
    │
    ▼
[Router] userRoutes.ts
    │
    ▼
[Middleware] validateUserRegistration.ts
    │   Zod parse → erros → 400
    │   OK → req.body tipado
    ▼
[Controller] UserController.ts
    │   Extrai dados, chama Service
    │   Mapeia ConflictError → 409
    │   Retorna 201 ou 500
    ▼
[Service] UserService.ts
    │   Verifica unicidade (e-mail + CPF)
    │   bcrypt.hash(password, 12)
    │   Filtra CREA por perfil
    ▼
[Prisma] prisma.user.create()
    │
    ▼
[PostgreSQL] tabela "users"
```

---

## 7. Variáveis de Ambiente

| Variável           | Descrição                        | Padrão              |
|--------------------|----------------------------------|---------------------|
| `DATABASE_URL`     | String de conexão Prisma         | —                   |
| `POSTGRES_USER`    | Usuário do PostgreSQL            | `apiuser`           |
| `POSTGRES_PASSWORD`| Senha do PostgreSQL              | `apipassword`       |
| `POSTGRES_DB`      | Nome do banco                    | `userdb`            |
| `PORT`             | Porta da API                     | `3000`              |
| `NODE_ENV`         | Ambiente                         | `development`       |

---

## 8. Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Compila TypeScript → dist/
npm run start        # Roda o build de produção
npm run prisma:generate  # Gera o Prisma Client
npm run prisma:migrate   # Cria e aplica migrations
npm run prisma:studio    # Abre o Prisma Studio (GUI do banco)
```
