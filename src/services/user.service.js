const mongoose = require('mongoose');
const User = require('../models/User');
const Gaushala = require('../models/Gaushala');
const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { assignDefaultPermissions } = require('./module.service');
const { isAdminOrSuperAdmin, isSuperAdmin, isAdmin } = require('../utils/roles');

/**
 * Add a new user to the database.
 * @param {Object} userData
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Object>} Created user document
 */
const addUser = async (userData, requester = null) => {
  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    const userGaushalaStr = (requester.gaushalaId._id || requester.gaushalaId).toString();
    if (userData.gaushalaId && userData.gaushalaId.toString() !== userGaushalaStr) {
      const roleLabel = isAdmin(requester) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only add users to their assigned gaushala`, 403);
    }
  }

  // 1. Verify that referenced Gaushala exists
  const gaushala = await Gaushala.findById(userData.gaushalaId);
  if (!gaushala) {
    throw new AppError('Gaushala not found', 404);
  }

  // 2. Verify that referenced Role exists
  const role = await Role.findById(userData.roleId);
  if (!role) {
    throw new AppError('Role not found', 404);
  }

  // 3. Check for unique non-deleted email
  const existingEmail = await User.findOne({
    emailId: userData.emailId.toLowerCase(),
    isDeleted: false,
  });
  if (existingEmail) {
    throw new AppError('User with this email already exists', 409);
  }

  // 4. Check for unique non-deleted username
  const existingUsername = await User.findOne({
    username: userData.username,
    isDeleted: false,
  });
  if (existingUsername) {
    throw new AppError('User with this username already exists', 409);
  }

  // 5. Create user (password hashing is handled in User pre-save hook)
  const user = await User.create(userData);

  // 5.1 Assign default false permissions across all modules
  await assignDefaultPermissions(user._id).catch((err) => {
    console.error('Failed to assign default permissions to new user:', err);
  });

  // 6. Return populated user
  return await User.findById(user._id)
    .populate('gaushalaId', 'gaushalaName')
    .populate('roleId', 'roleName');
};

/**
 * Update an existing user.
 * @param {string} userId
 * @param {Object} updateData
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Object>} Updated user document
 */
const updateUser = async (userId, updateData, requester = null) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid User ID format', 400);
  }

  // 1. Check if user exists and is not deleted
  const existingUser = await User.findOne({
    _id: userId,
    isDeleted: false,
  });
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    const userGaushalaStr = (requester.gaushalaId._id || requester.gaushalaId).toString();
    const targetGaushalaStr = (existingUser.gaushalaId?._id || existingUser.gaushalaId)?.toString();
    if (targetGaushalaStr && targetGaushalaStr !== userGaushalaStr) {
      const roleLabel = isAdmin(requester) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only update users within their assigned gaushala`, 403);
    }
  }

  // 2. If gaushalaId is being updated, verify it exists
  if (updateData.gaushalaId) {
    const gaushala = await Gaushala.findById(updateData.gaushalaId);
    if (!gaushala) {
      throw new AppError('Gaushala not found', 404);
    }
  }

  // 3. If roleId is being updated, verify it exists
  if (updateData.roleId) {
    const role = await Role.findById(updateData.roleId);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
  }

  // 4. If emailId is being updated, verify uniqueness among other active users
  if (updateData.emailId && updateData.emailId.toLowerCase() !== existingUser.emailId.toLowerCase()) {
    const emailConflict = await User.findOne({
      _id: { $ne: userId },
      emailId: updateData.emailId.toLowerCase(),
      isDeleted: false,
    });
    if (emailConflict) {
      throw new AppError('User with this email already exists', 409);
    }
  }

  // 5. If username is being updated, verify uniqueness among other active users
  if (updateData.username && updateData.username !== existingUser.username) {
    const usernameConflict = await User.findOne({
      _id: { $ne: userId },
      username: updateData.username,
      isDeleted: false,
    });
    if (usernameConflict) {
      throw new AppError('User with this username already exists', 409);
    }
  }

  // 6. Apply updates and save
  Object.keys(updateData).forEach((key) => {
    existingUser[key] = updateData[key];
  });

  await existingUser.save();

  // 7. Return populated user
  return await User.findById(existingUser._id)
    .populate('gaushalaId', 'gaushalaName')
    .populate('roleId', 'roleName');
};

/**
 * Get users with optional filtering.
 * @param {Object} filterOptions
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Array>}
 */
const getUsers = async (filterOptions = {}, requester = null) => {
  const query = { isDeleted: false };

  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    query.gaushalaId = requester.gaushalaId._id || requester.gaushalaId;
  } else if (filterOptions.gaushalaId && mongoose.Types.ObjectId.isValid(filterOptions.gaushalaId)) {
    query.gaushalaId = filterOptions.gaushalaId;
  }
  if (filterOptions.roleId && mongoose.Types.ObjectId.isValid(filterOptions.roleId)) {
    query.roleId = filterOptions.roleId;
  }
  if (filterOptions.isActive !== undefined) {
    query.isActive = filterOptions.isActive === true || filterOptions.isActive === 'true';
  }
  if (filterOptions.search && typeof filterOptions.search === 'string') {
    const searchRegex = new RegExp(filterOptions.search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { username: searchRegex },
      { emailId: searchRegex },
    ];
  }

  return await User.find(query)
    .sort({ createdAt: -1 })
    .populate('gaushalaId', 'gaushalaName')
    .populate('roleId', 'roleName');
};

/**
 * Get user by ID.
 * @param {string} userId
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Object>}
 */
const getUserById = async (userId, requester = null) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid User ID format', 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  })
    .populate('gaushalaId', 'gaushalaName')
    .populate('roleId', 'roleName');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    const userGaushalaStr = (requester.gaushalaId._id || requester.gaushalaId).toString();
    const targetGaushalaStr = (user.gaushalaId?._id || user.gaushalaId)?.toString();
    if (targetGaushalaStr && targetGaushalaStr !== userGaushalaStr) {
      const roleLabel = isAdmin(requester) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only view users within their assigned gaushala`, 403);
    }
  }

  return user;
};

/**
 * Toggle user active status.
 * @param {string} userId
 * @param {boolean} [explicitActiveStatus]
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Object>}
 */
const toggleUserStatus = async (userId, explicitActiveStatus, requester = null) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid User ID format', 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    const userGaushalaStr = (requester.gaushalaId._id || requester.gaushalaId).toString();
    const targetGaushalaStr = (user.gaushalaId?._id || user.gaushalaId)?.toString();
    if (targetGaushalaStr && targetGaushalaStr !== userGaushalaStr) {
      const roleLabel = isAdmin(requester) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only modify users within their assigned gaushala`, 403);
    }
  }

  if (typeof explicitActiveStatus === 'boolean') {
    user.isActive = explicitActiveStatus;
  } else {
    user.isActive = !user.isActive;
  }

  await user.save();

  return {
    id: user._id,
    isActive: user.isActive,
  };
};

/**
 * Soft-delete a user.
 * @param {string} userId
 * @param {string} deletedBy
 * @param {Object} [requester] Authenticated user document (req.user)
 * @returns {Promise<Object>}
 */
const deleteUser = async (userId, deletedBy, requester = null) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid User ID format', 400);
  }

  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (requester && !isSuperAdmin(requester) && requester.gaushalaId) {
    const userGaushalaStr = (requester.gaushalaId._id || requester.gaushalaId).toString();
    const targetGaushalaStr = (user.gaushalaId?._id || user.gaushalaId)?.toString();
    if (targetGaushalaStr && targetGaushalaStr !== userGaushalaStr) {
      const roleLabel = isAdmin(requester) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only delete users within their assigned gaushala`, 403);
    }
  }

  user.isDeleted = true;
  user.isActive = false;
  if (deletedBy && mongoose.Types.ObjectId.isValid(deletedBy)) {
    user.deletedBy = deletedBy;
  }

  await user.save();

  return {
    id: user._id,
    isDeleted: true,
  };
};

/**
 * Forget / Change password for Admin or regular user.
 * 1. Admin can directly change password without using old password (only new password required).
 * 2. Regular user / unauthenticated user must provide both old password and new password.
 *
 * @param {Object} params
 * @param {Object} [params.requester] - The authenticated user making the request
 * @param {string} [params.userId] - Target user ID (optional)
 * @param {string} [params.emailId] - Target user email (optional)
 * @param {string} [params.username] - Target user username (optional)
 * @param {string} [params.oldPassword] - Current password
 * @param {string} params.newPassword - New password (min 8 chars)
 * @param {string} [params.confirmPassword] - Confirm password
 * @returns {Promise<Object>} Updated user document
 */
const forgotPassword = async ({
  requester,
  userId,
  emailId,
  username,
  oldPassword,
  newPassword,
  confirmPassword,
}) => {
  // 1. Confirm password validation if provided
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    throw new AppError('New password and confirm password do not match', 400);
  }

  // 2. Validate new password
  if (!newPassword || typeof newPassword !== 'string') {
    throw new AppError('New password is required', 400);
  }
  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  const isAdmin = isAdminOrSuperAdmin(requester);

  let user = null;

  if (isAdmin) {
    // Admin directly changes password without using old password
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid User ID format', 400);
      }
      user = await User.findOne({ _id: userId, isDeleted: false }).select('+password');
    } else if (emailId) {
      user = await User.findOne({ emailId: emailId.trim().toLowerCase(), isDeleted: false }).select('+password');
    } else if (username) {
      user = await User.findOne({ username: username.trim(), isDeleted: false }).select('+password');
    } else if (requester?._id) {
      user = await User.findOne({ _id: requester._id, isDeleted: false }).select('+password');
    } else {
      throw new AppError('User ID, email, or username is required', 400);
    }

    if (!user) {
      throw new AppError('User not found', 404);
    }
  } else {
    // Non-admin user or unauthenticated user: oldPassword is required
    if (!oldPassword || typeof oldPassword !== 'string') {
      throw new AppError('Old password is required', 400);
    }

    if (requester) {
      // Authenticated regular user
      if (userId && userId.toString() !== requester._id.toString()) {
        throw new AppError('You are not authorized to change another user\'s password', 403);
      }
      if (emailId && emailId.trim().toLowerCase() !== requester.emailId?.toLowerCase()) {
        throw new AppError('You are not authorized to change another user\'s password', 403);
      }
      if (username && username.trim() !== requester.username) {
        throw new AppError('You are not authorized to change another user\'s password', 403);
      }

      user = await User.findOne({ _id: requester._id, isDeleted: false }).select('+password');
    } else {
      // Unauthenticated user
      if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          throw new AppError('Invalid User ID format', 400);
        }
        user = await User.findOne({ _id: userId, isDeleted: false }).select('+password');
      } else if (emailId) {
        user = await User.findOne({ emailId: emailId.trim().toLowerCase(), isDeleted: false }).select('+password');
      } else if (username) {
        user = await User.findOne({ username: username.trim(), isDeleted: false }).select('+password');
      } else {
        throw new AppError('Email, username, or user ID is required to identify the user', 400);
      }
    }

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403);
    }

    // Verify old password
    const isOldPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isOldPasswordCorrect) {
      throw new AppError('Invalid old password', 400);
    }
  }

  // Update password (pre-save hook hashes the password)
  user.password = newPassword;
  await user.save();

  return await User.findById(user._id)
    .populate('gaushalaId', 'gaushalaName')
    .populate('roleId', 'roleName');
};

module.exports = {
  addUser,
  updateUser,
  getUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  forgotPassword,
  changePassword: forgotPassword,
};

