const mongoose = require('mongoose');
const { Schema } = mongoose;

const authorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    default: ''
  },
  birthDate: {
    type: Date
  },
  nationality: {
    type: String,
    default: ''
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

// Middleware to update `updatedAt` on save
authorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Author = mongoose.model('Author', authorSchema);

module.exports = Author;
