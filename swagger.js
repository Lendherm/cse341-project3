const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'W03 Project API',
      version: '1.0.0',
      description: 'CRUD API for Books and Authors'
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Local server'
      },
      {
        url: 'https://cse341-project3-11r5.onrender.com',
        description: 'Render deployment'
      }
    ]
  },
  apis: ['./routes/*.js']
};

module.exports = options;
