const express = require('express');
const router = express.Router();
const authorsController = require('../controllers/authors');
const { isAuthenticated } = require('../middleware/authenticate');
const { validateObjectId, sanitizeInput, validatePagination } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Authors
 *   description: Author management endpoints
 */

/**
 * @swagger
 * /authors:
 *   get:
 *     summary: Get all authors with pagination
 *     tags: [Authors]
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
 *     responses:
 *       200:
 *         description: List of all authors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Author'
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
router.get('/', validatePagination, authorsController.getAllAuthors);

/**
 * @swagger
 * /authors/{id}:
 *   get:
 *     summary: Get an author by ID
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Author found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Author not found
 */
router.get('/:id', validateObjectId, authorsController.getAuthorById);

/**
 * @swagger
 * /authors/{id}/books:
 *   get:
 *     summary: Get all books by a specific author
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ObjectId of the author
 *     responses:
 *       200:
 *         description: List of books by the author
 *       404:
 *         description: Author not found
 */
router.get('/:id/books', validateObjectId, authorsController.getAuthorBooks);

/**
 * @swagger
 * /authors:
 *   post:
 *     summary: Create a new author (Requires authentication)
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *           examples:
 *             example1:
 *               value:
 *                 name: "J.K. Rowling"
 *                 bio: "British author best known for the Harry Potter series."
 *                 birthDate: "1965-07-31"
 *                 nationality: "British"
 *     responses:
 *       201:
 *         description: Author created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.post('/', isAuthenticated, sanitizeInput, authorsController.createAuthor);

/**
 * @swagger
 * /authors/{id}:
 *   put:
 *     summary: Update an author (Requires authentication)
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *           examples:
 *             example1:
 *               value:
 *                 name: "J.K. Rowling"
 *                 bio: "British author, philanthropist, and film producer."
 *                 nationality: "Scottish"
 *     responses:
 *       200:
 *         description: Author updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         description: Invalid data or ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Author not found
 */
router.put('/:id', isAuthenticated, validateObjectId, sanitizeInput, authorsController.updateAuthor);

/**
 * @swagger
 * /authors/{id}:
 *   delete:
 *     summary: Delete an author (Requires authentication)
 *     tags: [Authors]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Author deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Author deleted"
 *       400:
 *         description: Error deleting author
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Author not found
 */
router.delete('/:id', isAuthenticated, validateObjectId, authorsController.deleteAuthor);

module.exports = router;