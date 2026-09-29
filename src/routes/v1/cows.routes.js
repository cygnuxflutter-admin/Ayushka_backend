const express = require('express');
const cowController = require('../../controllers/cow.controller');
const { validateAddCow } = require('../../validators/cow.validator');
const optionalAuth = require('../../middlewares/optionalAuth');

const router = express.Router();

// Supports both '/' when mounted at '/cows' (or '/cow') and '/cows' when mounted at root
router.post('/', optionalAuth, validateAddCow, cowController.addCow);
router.post('/cows', optionalAuth, validateAddCow, cowController.addCow);

module.exports = router;
