const Request = require('../models/Request');
const Book = require('../models/Book');

exports.list = (req, res, next) => {
  try {
    res.json(Request.findAll());
  } catch (err) {
    next(err);
  }
};

exports.createRequest = (req, res, next) => {
  try {
    const book = Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const payload = {
      bookTitle: book.title,
      buyerName: (req.user && req.user.name) || req.body.buyerName || 'Anonymous',
      status: 'requested',
      date: 'just now',
    };
    const created = Request.create(payload);
    res.json({ ok: true, request: created });
  } catch (err) {
    next(err);
  }
};
