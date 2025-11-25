const mongoose = require('mongoose');
const { Schema } = mongoose;

const authorSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    minlength: [2, 'Author name must be at least 2 characters'],
    maxlength: [100, 'Author name must be less than 100 characters']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Biography must be less than 1000 characters'],
    default: ''
  },
  birthDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date < new Date();
      },
      message: 'Birth date cannot be in the future'
    }
  },
  nationality: {
    type: String,
    trim: true,
    default: ''
  },
  website: {
    type: String,
    trim: true
  },
  genres: {
    type: [String],
    default: []
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
authorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
authorSchema.index({ name: 1 });
authorSchema.index({ nationality: 1 });

// Virtual for author's age
authorSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
authorSchema.set('toJSON', { virtuals: true });

const Author = mongoose.model('Author', authorSchema);

module.exports = Author;