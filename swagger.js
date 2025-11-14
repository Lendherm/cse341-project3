const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "W03 Project API",
      version: "1.0.0",
      description:
        "API for CRUD operations with Books and Authors using Node.js, MongoDB, Mongoose and Express.",
    },
    servers: [
  {
    url: "https://cse341-project3-11r5.onrender.com",
    description: "Production server (Render)"
  },
  {
    url: "http://localhost:8080",
    description: "Local development server"
  }
],

    components: {
      schemas: {
        Author: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Gabriel García Márquez",
            },
            bio: {
              type: "string",
              example: "Colombian novelist, author of One Hundred Years of Solitude.",
            },
            birthDate: {
              type: "string",
              format: "date",
              example: "1927-03-06",
            },
            nationality: {
              type: "string",
              example: "Colombian",
            }
          }
        },

        Book: {
          type: "object",
          required: ["title", "author"],
          properties: {
            title: {
              type: "string",
              example: "Cien años de soledad",
            },
            description: {
              type: "string",
              example: "A magical realism novel set in Macondo.",
            },
            publishYear: {
              type: "integer",
              example: 1967,
            },
            genre: {
              type: "string",
              example: "Magical Realism",
            },
            author: {
              type: "string",
              example: "60fc5ba8c25e243cf0d8e8b7", // Example ObjectId
            }
          }
        }
      }
    },
    paths: {
      "/authors": {
        get: {
          summary: "Get all authors",
          responses: {
            200: {
              description: "List of authors",
            }
          }
        },
        post: {
          summary: "Create a new author",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Author",
                }
              }
            }
          },
          responses: {
            201: {
              description: "Author created successfully",
            }
          }
        }
      },

      "/authors/{id}": {
        get: {
          summary: "Get author by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          responses: {
            200: { description: "Author found" },
            404: { description: "Author not found" }
          }
        },
        put: {
          summary: "Update an author by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Author",
                }
              }
            }
          },
          responses: {
            200: { description: "Author updated" }
          }
        },
        delete: {
          summary: "Delete an author",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          responses: {
            200: { description: "Author deleted" }
          }
        }
      },

      "/books": {
        get: {
          summary: "Get all books",
          responses: {
            200: { description: "List of books" }
          }
        },
        post: {
          summary: "Create a new book",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Book" }
              }
            }
          },
          responses: {
            201: { description: "Book created" }
          }
        }
      },

      "/books/{id}": {
        get: {
          summary: "Get book by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          responses: {
            200: { description: "Book found" },
            404: { description: "Book not found" }
          }
        },
        put: {
          summary: "Update a book",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Book" }
              }
            }
          },
          responses: {
            200: { description: "Book updated" }
          }
        },
        delete: {
          summary: "Delete a book",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            }
          ],
          responses: {
            200: { description: "Book deleted" }
          }
        }
      }
    }
  },
  apis: []
};

module.exports = swaggerOptions;
