const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes.js'));
router.use('/users', require('./users.routes'));
router.use('/roles', require('./roles.routes'));
router.use('/gaushalas', require('./gaushalas.routes'));
router.use('/sheds', require('./shed.routes'));
router.use('/breed-types', require('./breed-types.routes'));
router.use('/types', require('./types.routes'));
router.use('/cows', require('./cows.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/modules', require('./modules.routes'));
router.use('/permissions', require('./permissions.routes'));
router.use('/feed-stock', require('./feed.routes'));
router.use('/medical-stock', require('./medical.routes'));
router.use('/treatments', require('./treatment.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/departments', require('./department.routes'));
router.use('/workers', require('./worker.routes'));
router.use('/milk', require('./milk.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
