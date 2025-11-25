const Author = require('../models/authors');
const Book = require('../models/books');

// Validation function
const validateAuthorData = (authorData) => {
  const errors = [];
  
  if (!authorData.name || authorData.name.trim() === '') {
    errors.push('Author name is required');
  }
  
  if (authorData.name && authorData.name.length < 2) {
    errors.push('Author name must be at least 2 characters long');
  }
  
  if (authorData.name && authorData.name.length > 100) {
    errors.push('Author name must be less than 100 characters');
  }
  
  if (authorData.bio && authorData.bio.length > 1000) {
    errors.push('Biography must be less than 1000 characters');
  }
  
  if (authorData.birthDate) {
    const birthDate = new Date(authorData.birthDate);
    if (isNaN(birthDate.getTime())) {
      errors.push('Birth date must be a valid date');
    } else if (birthDate > new Date()) {
      errors.push('Birth date cannot be in the future');
    }
  }
  
  return errors;
};

exports.getAllAuthors = async (req, res) => {
  try {
    const { page, limit } = req.pagination;
    const skip = (page - 1) * limit;
    
    const [authors, total] = await Promise.all([
      Author.find()
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Author.countDocuments()
    ]);
    
    res.status(200).json({
      authors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting authors:', error);
    res.status(500).json({ 
      message: 'Error retrieving authors from database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }
    
    res.status(200).json(author);
  } catch (error) {
    console.error('Error getting author by ID:', error);
    res.status(400).json({ 
      message: 'Error retrieving author',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAuthorBooks = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }
    
    const books = await Book.find({ authorId: req.params.id })
      .select('title genre publishedYear price inStock');
    
    res.status(200).json({
      author: {
        id: author._id,
        name: author.name
      },
      books,
      count: books.length
    });
  } catch (error) {
    console.error('Error getting author books:', error);
    res.status(500).json({ 
      message: 'Error retrieving author books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createAuthor = async (req, res) => {
  try {
    const validationErrors = validateAuthorData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const newAuthor = new Author(req.body);
    const savedAuthor = await newAuthor.save();
    
    res.status(201).json(savedAuthor);
  } catch (error) {
    console.error('Error creating author:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Author with this name already exists'
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating author in database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateAuthor = async (req, res) => {
  try {
    const validationErrors = validateAuthorData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const updatedAuthor = await Author.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedAuthor) {
      return res.status(404).json({ message: 'Author not found' });
    }
    
    res.status(200).json(updatedAuthor);
  } catch (error) {
    console.error('Error updating author:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(400).json({ 
      message: 'Error updating author',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteAuthor = async (req, res) => {
  try {
    // Check if author has books
    const authorBooks = await Book.countDocuments({ authorId: req.params.id });
    if (authorBooks > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete author with existing books',
        booksCount: authorBooks
      });
    }
    
    const deletedAuthor = await Author.findByIdAndDelete(req.params.id);
    if (!deletedAuthor) {
      return res.status(404).json({ message: 'Author not found' });
    }
    
    res.status(200).json({ 
      message: 'Author deleted successfully',
      deletedAuthor: {
        id: deletedAuthor._id,
        name: deletedAuthor.name
      }
    });
  } catch (error) {
    console.error('Error deleting author:', error);
    res.status(400).json({ 
      message: 'Error deleting author from database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};