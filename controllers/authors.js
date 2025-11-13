const Author = require('../models/authors');

exports.getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find();
    res.status(200).json(authors);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving authors', error });
  }
};

exports.getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.status(200).json(author);
  } catch (error) {
    res.status(400).json({ message: 'Invalid ID format', error });
  }
};

exports.createAuthor = async (req, res) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ message: 'Author name is required' });

    const newAuthor = new Author(req.body);
    const saved = await newAuthor.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Error creating author', error });
  }
};

exports.updateAuthor = async (req, res) => {
  try {
    const updated = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Author not found' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data or ID', error });
  }
};

exports.deleteAuthor = async (req, res) => {
  try {
    const deleted = await Author.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Author not found' });
    res.status(200).json({ message: 'Author deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting author', error });
  }
};
