const express = require('express');
const uploadController = require('../../controllers/upload.controller');
const uploadSingle = require('../../middlewares/upload');

const router = express.Router();

router.post('/', uploadSingle, uploadController.uploadFile);
router.post('/file', uploadSingle, uploadController.uploadFile);

module.exports = router;
