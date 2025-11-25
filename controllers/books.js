const Book = require('../models/book');
const Author = require('../models/author');

// Validation function
const validateBookData = (bookData) => {
  const errors = [];
  
  if (!bookData.title || bookData.title.trim() === '') {
    errors.push('Title is required');
  }
  
  if (!bookData.authorId || bookData.authorId.trim() === '') {
    errors.push('Author ID is required');
  }
  
  if (!bookData.genre || bookData.genre.trim() === '') {
    errors.push('Genre is required');
  }
  
  if (!bookData.price || bookData.price <= 0) {
    errors.push('Valid price is required');
  }
  
  if (bookData.publishedYear && (bookData.publishedYear < 1000 || bookData.publishedYear > new Date().getFullYear())) {
    errors.push('Published year must be valid');
  }
  
  if (bookData.pages && bookData.pages <= 0) {
    errors.push('Pages must be a positive number');
  }
  
  return errors;
};

exports.getAllBooks = async (req, res) => {
  try {
    const { page, limit } = req.pagination;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.genre) {
      filter.genre = new RegExp(req.query.genre, 'i');
    }
    
    const [books, total] = await Promise.all([
      Book.find(filter)
        .populate('authorId', 'name nationality')
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(filter)
    ]);
    
    res.status(200).json({
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting books:', error);
    res.status(500).json({ 
      message: 'Error retrieving books from database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.searchBooks = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const books = await Book.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { genre: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }).populate('authorId', 'name');
    
    res.status(200).json({
      query: q,
      results: books,
      count: books.length
    });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ 
      message: 'Error searching books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('authorId', 'name bio nationality birthDate');
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json(book);
  } catch (error) {
    console.error('Error getting book by ID:', error);
    res.status(400).json({ 
      message: 'Error retrieving book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createBook = async (req, res) => {
  try {
    const validationErrors = validateBookData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if author exists
    const author = await Author.findById(req.body.authorId);
    if (!author) {
      return res.status(400).json({ message: 'Author not found' });
    }

    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    await savedBook.populate('authorId', 'name');
    
    res.status(201).json(savedBook);
  } catch (error) {
    console.error('Error creating book:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Book with similar details already exists'
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating book in database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const validationErrors = validateBookData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if author exists if authorId is being updated
    if (req.body.authorId) {
      const author = await Author.findById(req.body.authorId);
      if (!author) {
        return res.status(400).json({ message: 'Author not found' });
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('authorId', 'name');
    
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(400).json({ 
      message: 'Error updating book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json({ 
      message: 'Book deleted successfully',
      deletedBook: {
        id: deletedBook._id,
        title: deletedBook.title
      }
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(400).json({ 
      message: 'Error deleting book from database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};