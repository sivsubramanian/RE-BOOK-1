const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

router.get('/', requestController.list);
router.post('/:id', requestController.createRequest);

module.exports = router;
