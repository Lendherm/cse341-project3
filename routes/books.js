const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books');
const { isAuthenticated } = require('../middleware/authenticate');
const { validateObjectId, sanitizeInput, validatePagination } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Book management endpoints
 */

/**
 * @swagger
 * /books:
 *   get:
 *     summary: Get all books with pagination
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *     responses:
 *       200:
 *         description: List of books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', validatePagination, booksController.getAllBooks);

/**
 * @swagger
 * /books/search:
 *   get:
 *     summary: Search books by title, genre, or tags
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search query is required
 */
router.get('/search', booksController.searchBooks);

/**
 * @swagger
 * /books/{id}:
 *   get:
 *     summary: Get a book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Book found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Book not found
 */
router.get('/:id', validateObjectId, booksController.getBookById);

/**
 * @swagger
 * /books:
 *   post:
 *     summary: Create a new book (Requires authentication)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *           examples:
 *             example1:
 *               value:
 *                 title: "The Great Gatsby"
 *                 authorId: "507f1f77bcf86cd799439011"
 *                 genre: "Fiction"
 *                 publishedYear: 1925
 *                 pages: 218
 *                 price: 12.99
 *                 inStock: true
 *                 tags: ["classic", "american"]
 *                 summary: "A story of wealth, love, and the American Dream in the 1920s."
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.post('/', isAuthenticated, sanitizeInput, booksController.createBook);

/**
 * @swagger
 * /books/{id}:
 *   put:
 *     summary: Update a book (Requires authentication)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *           examples:
 *             example1:
 *               value:
 *                 title: "The Great Gatsby - Updated"
 *                 price: 14.99
 *                 inStock: false
 *     responses:
 *       200:
 *         description: Book updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid data or ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Book not found
 */
router.put('/:id', isAuthenticated, validateObjectId, sanitizeInput, booksController.updateBook);

/**
 * @swagger
 * /books/{id}:
 *   delete:
 *     summary: Delete a book (Requires authentication)
 *     tags: [Books]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Book deleted"
 *       400:
 *         description: Error deleting book
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Book not found
 */
router.delete('/:id', isAuthenticated, validateObjectId, booksController.deleteBook);

module.exports = router;