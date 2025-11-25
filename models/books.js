const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title must be less than 200 characters']
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'Author',
    required: [true, 'Author ID is required']
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true
  },
  publishedYear: {
    type: Number,
    min: [1000, 'Published year must be after 1000'],
    max: [new Date().getFullYear(), 'Published year cannot be in the future']
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1'],
    max: [10000, 'Pages cannot exceed 10000']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000, 'Price cannot exceed 1000']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.length <= 10;
      },
      message: 'Cannot have more than 10 tags'
    }
  },
  summary: {
    type: String,
    maxlength: [2000, 'Summary must be less than 2000 characters'],
    default: ''
  },
  isbn: {
    type: String,
    trim: true,
    match: [/^(?:\d{10}|\d{13})$/, 'ISBN must be 10 or 13 digits']
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update updatedAt on save
bookSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
bookSchema.index({ title: 1 });
bookSchema.index({ authorId: 1 });
bookSchema.index({ genre: 1 });
bookSchema.index({ price: 1 });
bookSchema.index({ tags: 1 });

// Virtual for book availability status
bookSchema.virtual('availability').get(function() {
  return this.inStock ? 'In Stock' : 'Out of Stock';
});

// Static method to find books by genre
bookSchema.statics.findByGenre = function(genre) {
  return this.find({ genre: new RegExp(genre, 'i') });
};

// Instance method to check if book is classic
bookSchema.methods.isClassic = function() {
  const currentYear = new Date().getFullYear();
  return this.publishedYear && (currentYear - this.publishedYear) >= 50;
};

// Ensure virtual fields are serialized
bookSchema.set('toJSON', { virtuals: true });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;