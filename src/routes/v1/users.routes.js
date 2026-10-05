const express = require('express');
const userController = require('../../controllers/user.controller');
const { validateAddUser, validateUpdateUser } = require('../../validators/user.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// Read endpoints (Parent: /api/v1/users)
router.get('/', checkPermission('USER', 'USER_LIST', 'view'), userController.getUsers);
router.get('/:id', checkPermission('USER', 'USER_LIST', 'view'), userController.getUserById);

// Write endpoints (Parent: /api/v1/users)
router.post('/', checkPermission('USER', 'USER_LIST', 'add'), validateAddUser, userController.addUser);
router.post('/:id/update', checkPermission('USER', 'USER_LIST', 'edit'), validateUpdateUser, userController.updateUser);
router.post('/:id/status', checkPermission('USER', 'USER_LIST', 'edit'), userController.toggleUserStatus);
router.post('/:id/delete', checkPermission('USER', 'USER_LIST', 'delete'), userController.deleteUser);
router.post('/:id/change-password', checkPermission('USER', 'USER_LIST', 'edit'), userController.changePassword);
router.post('/:id/reset-password', checkPermission('USER', 'USER_LIST', 'edit'), userController.changePassword);

module.exports = router;

