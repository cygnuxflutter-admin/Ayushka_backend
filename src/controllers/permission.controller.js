const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Module = require('../models/Module');
const UserPermission = require('../models/UserPermission');
const { assignDefaultPermissions } = require('../services/module.service');
const { isAdminOrSuperAdmin } = require('../utils/roles');

/**
 * Fetch permissions for the currently authenticated user.
 */
const getMyPermissions = asyncHandler(async (req, res) => {
  const user = req.user;
  const isFullAccess = isAdminOrSuperAdmin(user);

  if (isFullAccess) {
    // Admin & Superadmin have full access to all modules and submodules
    const allModules = await Module.find({ isActive: true }).sort({ name: 1 });
    const fullPermissions = [];

    for (const mod of allModules) {
      for (const sub of mod.subModules || []) {
        fullPermissions.push({
          moduleId: mod._id,
          moduleCode: mod.code,
          moduleName: mod.name,
          subModuleCode: sub.code,
          subModuleName: sub.name,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        role: user.roleId?.roleName || 'Admin',
        isAdmin: true,
        permissions: fullPermissions,
      },
    });
  }

  // Regular user
  const userPermDoc = await UserPermission.findOne({ userId: user._id });

  res.status(200).json({
    success: true,
    data: {
      userId: user._id,
      role: user.roleId?.roleName || 'User',
      isAdmin: false,
      permissions: userPermDoc?.permissions || [],
    },
  });
});

/**
 * Admin fetches permissions of a specific user with full module matrix for UI checkboxes.
 */
const getUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError('Valid user ID is required', 400);
  }

  const targetUser = await User.findOne({
    _id: userId,
    isDeleted: false,
  }).populate('roleId', 'roleName');

  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  const isTargetAdmin = isAdminOrSuperAdmin(targetUser);
  const allModules = await Module.find({ isActive: true }).sort({ name: 1 });
  let userPermDoc = await UserPermission.findOne({ userId: targetUser._id });
  if (!userPermDoc || !Array.isArray(userPermDoc.permissions) || userPermDoc.permissions.length === 0) {
    userPermDoc = await assignDefaultPermissions(targetUser._id);
  }
  const userPerms = userPermDoc?.permissions || [];

  // Build matrix with every module and sub-module
  const permissionMatrix = [];

  for (const mod of allModules) {
    for (const sub of mod.subModules || []) {
      const existing = userPerms.find(
        (p) =>
          p.moduleCode?.toUpperCase() === mod.code?.toUpperCase() &&
          p.subModuleCode?.toUpperCase() === sub.code?.toUpperCase(),
      );

      permissionMatrix.push({
        moduleId: mod._id,
        moduleName: mod.name,
        moduleCode: mod.code,
        subModuleName: sub.name,
        subModuleCode: sub.code,
        canView: isTargetAdmin ? true : Boolean(existing?.canView),
        canAdd: isTargetAdmin ? true : Boolean(existing?.canAdd),
        canEdit: isTargetAdmin ? true : Boolean(existing?.canEdit),
        canDelete: isTargetAdmin ? true : Boolean(existing?.canDelete),
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        emailId: targetUser.emailId,
        role: targetUser.roleId?.roleName,
        isAdmin: isTargetAdmin,
      },
      permissionMatrix,
      rawPermissions: userPerms,
    },
  });
});

/**
 * Admin assigns or updates permissions for a specific user.
 */
const updateUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { permissions } = req.body || {};

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new AppError('Valid user ID is required', 400);
  }

  const targetUser = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  if (!Array.isArray(permissions)) {
    throw new AppError('Permissions array is required', 400);
  }

  // Sanitize permissions
  const sanitizedPermissions = permissions.map((p) => {
    return {
      moduleId: p.moduleId && mongoose.isValidObjectId(p.moduleId) ? p.moduleId : null,
      moduleCode: (p.moduleCode || '').trim().toUpperCase(),
      subModuleCode: (p.subModuleCode || '').trim().toUpperCase(),
      canView: Boolean(p.canView),
      canAdd: Boolean(p.canAdd),
      canEdit: Boolean(p.canEdit),
      canDelete: Boolean(p.canDelete),
    };
  }).filter((p) => p.moduleCode && p.subModuleCode);

  const updatedDoc = await UserPermission.findOneAndUpdate(
    { userId: targetUser._id },
    {
      userId: targetUser._id,
      permissions: sanitizedPermissions,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  res.status(200).json({
    success: true,
    message: 'User permissions updated successfully',
    data: updatedDoc,
  });
});

module.exports = {
  getMyPermissions,
  getUserPermissions,
  updateUserPermissions,
};
