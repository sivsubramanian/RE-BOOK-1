const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/', bookController.list);
router.get('/:id', bookController.getById);

module.exports = router;
