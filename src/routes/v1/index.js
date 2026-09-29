const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes.js'));
router.use('/roles', require('./roles.routes'));
router.use('/gaushalas', require('./gaushalas.routes'));
router.use('/sheds', require('./shed.routes'));
router.use('/breed-types', require('./breed-types.routes'));
router.use('/types', require('./types.routes'));
router.use('/cows', require('./cows.routes'));
router.use('/cow', require('./cows.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
