const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller to handle POST /api/v1/users (Add User)
 */
const addUser = asyncHandler(async (req, res) => {
  const userData = req.validatedData || req.body;
  const createdUser = await userService.addUser(userData, req.user);

  res.status(201).json({
    success: true,
    message: 'User added successfully',
    data: createdUser,
  });
});

/**
 * Controller to handle PUT /api/v1/users/:id or POST /api/v1/users/:id/update (Edit User)
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.userId || req.params.id;
  const updateData = req.validatedData || req.body;

  const updatedUser = await userService.updateUser(userId, updateData, req.user);

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

/**
 * Controller to handle GET /api/v1/users (List Users)
 */
const getUsers = asyncHandler(async (req, res) => {
  const filterOptions = {
    gaushalaId: req.query.gaushalaId || req.query.gaushala_id,
    roleId: req.query.roleId || req.query.role_id,
    isActive: req.query.isActive !== undefined ? req.query.isActive : req.query.is_active,
    search: req.query.search,
  };

  const users = await userService.getUsers(filterOptions, req.user);

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

/**
 * Controller to handle GET /api/v1/users/:id (Get User Details)
 */
const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await userService.getUserById(userId, req.user);

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});

/**
 * Controller to handle POST /api/v1/users/:id/status (Toggle Status)
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const isActive = req.body?.isActive !== undefined ? req.body.isActive : req.body?.is_active;

  const result = await userService.toggleUserStatus(userId, isActive, req.user);
  const statusText = result.isActive ? 'activated' : 'deactivated';

  res.status(200).json({
    success: true,
    message: `User ${statusText} successfully`,
    data: result,
  });
});

/**
 * Controller to handle POST /api/v1/users/:id/delete or DELETE /api/v1/users/:id (Delete User)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const deletedBy = req.user?._id;

  const result = await userService.deleteUser(userId, deletedBy, req.user);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

/**
 * Controller to handle POST /api/v1/users/:id/change-password or POST /api/v1/users/:id/reset-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.body?.userId || req.body?.user_id;
  const body = req.body || {};
  const oldPassword = body.oldPassword || body.old_password || body.currentPassword || body.current_password;
  const newPassword = body.newPassword || body.new_password || body.password;
  const confirmPassword = body.confirmPassword || body.confirm_password;

  const updatedUser = await userService.forgotPassword({
    requester: req.user,
    userId,
    emailId: body.emailId || body.email,
    username: body.username || body.identifier,
    oldPassword,
    newPassword,
    confirmPassword,
  });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: updatedUser,
  });
});

module.exports = {
  addUser,
  updateUser,
  getUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  changePassword,
};

