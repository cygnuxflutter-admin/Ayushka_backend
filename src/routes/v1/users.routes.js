const express = require('express');
const userController = require('../../controllers/user.controller');
const { validateAddUser, validateUpdateUser } = require('../../validators/user.validator');
const adminOnly = require('../../middlewares/adminOnly');

const router = express.Router();

// Enforce Admin only for all user management endpoints
router.use(adminOnly);

// Read endpoints (Parent: /api/v1/users)
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Write endpoints (Parent: /api/v1/users)
router.post('/', adminOnly, validateAddUser, userController.addUser);
router.post('/:id/update', adminOnly, validateUpdateUser, userController.updateUser);
router.post('/:id/status', adminOnly, userController.toggleUserStatus);
router.post('/:id/delete', adminOnly, userController.deleteUser);
router.post('/:id/change-password', adminOnly, userController.changePassword);
router.post('/:id/reset-password', adminOnly, userController.changePassword);

module.exports = router;

