const express = require('express');
const permissionController = require('../../controllers/permission.controller');
const auth = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');

const router = express.Router();

// Current logged in user's permissions (Used by app/web to configure UI access)
router.get('/my-permissions', auth, permissionController.getMyPermissions);

// Admin endpoints for user permission management
router.get('/users/:userId', adminOnly, permissionController.getUserPermissions);
router.post('/users/:userId', adminOnly, permissionController.updateUserPermissions);
router.post('/users/:userId/update', adminOnly, permissionController.updateUserPermissions);

module.exports = router;
