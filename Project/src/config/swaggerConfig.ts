// src/config/swaggerConfig.ts
// ─────────────────────────────────────────────────────────────────
// Configuração do Swagger/OpenAPI para documentação da API
// ─────────────────────────────────────────────────────────────────

import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API As-Built',
      version: '1.0.0',
      description: 'API REST para Sistema de Gestão de Obras - Documentação completa com Swagger',
      contact: {
        name: 'Equipe Backend',
        email: 'backend@asbuilt.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token obtido no endpoint /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Descrição do erro',
            },
          },
          required: ['status', 'message'],
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Operação realizada com sucesso',
            },
            data: {
              type: 'object',
            },
          },
          required: ['status', 'message', 'data'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../routes/*.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
