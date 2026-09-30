const express = require('express');
const authController = require('../../controllers/auth.controller.js');
const optionalAuth = require('../../middlewares/optionalAuth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/register', authController.register);
router.post('/forget-password', optionalAuth, authController.forgotPassword);
router.post('/forgot-password', optionalAuth, authController.forgotPassword);
router.post('/change-password', optionalAuth, authController.forgotPassword);
router.post('/reset-password', optionalAuth, authController.forgotPassword);

module.exports = router;


