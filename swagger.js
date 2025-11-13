const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'W03 Project API',
      version: '1.0.0',
      description: 'CRUD API for Books and Authors'
    },
    servers: [{ url: 'https://your-render-app.onrender.com' }] // Cambia por tu URL
  },
  apis: ['./routes/*.js']
};

module.exports = options;
