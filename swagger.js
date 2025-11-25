const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Books & Authors API with OAuth",
      version: "2.0.0",
      description:
        "API for CRUD operations with Books and Authors using Node.js, MongoDB, Mongoose, Express, and OAuth authentication. Protected routes require GitHub login.",
      contact: {
        name: "API Support",
        email: "support@example.com"
      },
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html"
      }
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
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session cookie for authenticated users. Login at /auth/github first."
        }
      },
      schemas: {
        Author: {
          type: "object",
          required: ["name"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            name: {
              type: "string",
              example: "Gabriel García Márquez",
              description: "Author's full name"
            },
            bio: {
              type: "string",
              example: "Colombian novelist, author of One Hundred Years of Solitude.",
              description: "Author biography"
            },
            birthDate: {
              type: "string",
              format: "date",
              example: "1927-03-06",
              description: "Author's birth date"
            },
            nationality: {
              type: "string",
              example: "Colombian",
              description: "Author's nationality"
            },
            website: {
              type: "string",
              example: "https://example.com/author",
              description: "Author's website"
            },
            genres: {
              type: "array",
              items: { type: "string" },
              example: ["Magic Realism", "Fiction"],
              description: "Genres the author writes in"
            },
            age: {
              type: "number",
              description: "Calculated age (virtual field)",
              readOnly: true
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp"
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp"
            }
          }
        },
        Book: {
          type: "object",
          required: ["title", "authorId", "genre", "price"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            title: {
              type: "string",
              example: "The Hobbit",
              description: "Book title"
            },
            authorId: {
              type: "string",
              example: "60fc5ba8c25e243cf0d8e8b7",
              description: "MongoDB ObjectId of the author"
            },
            genre: {
              type: "string",
              example: "Fantasy",
              description: "Book genre"
            },
            publishedYear: {
              type: "integer",
              example: 1938,
              description: "Year the book was published"
            },
            pages: {
              type: "integer",
              example: 310,
              description: "Number of pages"
            },
            price: {
              type: "number",
              format: "float",
              example: 19.99,
              description: "Book price"
            },
            inStock: {
              type: "boolean",
              example: true,
              description: "Availability status"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["classic", "adventure", "fantasy"],
              description: "Book tags/categories"
            },
            summary: {
              type: "string",
              example: "A fantasy novel about Bilbo Baggins' adventure with dwarves.",
              description: "Book summary"
            },
            isbn: {
              type: "string",
              example: "9780547928227",
              description: "ISBN number"
            },
            language: {
              type: "string",
              example: "English",
              description: "Book language"
            },
            availability: {
              type: "string",
              description: "Availability status (virtual field)",
              readOnly: true
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp"
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp"
            }
          }
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            username: {
              type: "string",
              example: "johndoe"
            },
            email: {
              type: "string",
              example: "john@example.com"
            },
            displayName: {
              type: "string",
              example: "John Doe"
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              example: "user"
            },
            githubProfile: {
              type: "string",
              description: "GitHub profile URL (virtual field)",
              readOnly: true
            }
          }
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error description"
            },
            errors: {
              type: "array",
              items: { type: "string" },
              description: "Detailed validation errors"
            },
            loginUrl: {
              type: "string",
              description: "URL to login for authentication errors"
            }
          }
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              example: 1
            },
            limit: {
              type: "integer",
              example: 10
            },
            total: {
              type: "integer",
              example: 100
            },
            pages: {
              type: "integer",
              example: 10
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                message: "Please log in to access this resource",
                loginUrl: "/auth/github"
              }
            }
          }
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                message: "Validation failed",
                errors: ["Title is required", "Genre is required"]
              }
            }
          }
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                message: "Book not found"
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: "Authentication",
        description: "OAuth authentication endpoints"
      },
      {
        name: "Books",
        description: "Book management endpoints"
      },
      {
        name: "Authors",
        description: "Author management endpoints"
      }
    ]
  },
  apis: ["./routes/*.js", "./controllers/*.js"]
};

module.exports = swaggerOptions;