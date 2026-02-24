const Book = require('../models/Book');

exports.list = (req, res, next) => {
  try {
    const { department, semester, condition, q, limit } = req.query;
    const results = Book.findAll({ department, semester, condition, q, limit });
    res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.getById = (req, res, next) => {
  try {
    const book = Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    next(err);
  }
};
