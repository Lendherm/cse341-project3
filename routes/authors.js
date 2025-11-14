const express = require('express');
const router = express.Router();
const authorsController = require('../controllers/authors');

/**
 * @swagger
 * components:
 *   schemas:
 *     Author:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Gabriel García Márquez"
 *         bio:
 *           type: string
           example: "Colombian novelist, Nobel Prize winner."
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1927-03-06"
 *         nationality:
 *           type: string
 *           example: "Colombian"
 */

/**
 * @swagger
 * tags:
 *   name: Authors
 *   description: Author management
 */

/**
 * @swagger
 * /authors:
 *   get:
 *     summary: Get all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: List of authors
 */
router.get('/', authorsController.getAllAuthors);

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
 *       404:
 *         description: Author not found
 */
router.get('/:id', authorsController.getAuthorById);

/**
 * @swagger
 * /authors:
 *   post:
 *     summary: Create a new author
 *     tags: [Authors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *     responses:
 *       201:
 *         description: Author created
 *       400:
 *         description: Validation error
 */
router.post('/', authorsController.createAuthor);

/**
 * @swagger
 * /authors/{id}:
 *   put:
 *     summary: Update an author
 *     tags: [Authors]
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
 *     responses:
 *       200:
 *         description: Author updated successfully
 *       400:
 *         description: Invalid ID or data
 *       404:
 *         description: Author not found
 */
router.put('/:id', authorsController.updateAuthor);

/**
 * @swagger
 * /authors/{id}:
 *   delete:
 *     summary: Delete an author
 *     tags: [Authors]
     parameters:
       - in: path
         name: id
         schema:
           type: string
         required: true
         description: MongoDB ObjectId
     responses:
       200:
         description: Author deleted
       404:
         description: Author not found
 */
router.delete('/:id', authorsController.deleteAuthor);

module.exports = router;
