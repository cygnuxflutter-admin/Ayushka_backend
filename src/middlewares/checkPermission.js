const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const UserPermission = require('../models/UserPermission');
const auth = require('./auth');

/**
 * Middleware to enforce module and sub-module action permissions (view, add, edit, delete).
 *
 * Rules:
 * 1. Admin Role (roleName: 'admin') -> Automatically bypasses all checks and has full access to all APIs.
 * 2. Regular User -> Looks up UserPermission in database and verifies if the user has permission
 *    for the given module, sub-module, and action.
 *
 * @param {string} moduleCode - Code of module (e.g. 'COW', 'SHED', 'USER')
 * @param {string} subModuleCode - Code of sub-module (e.g. 'COW_LIST', 'SHED_TRANSFER')
 * @param {'view'|'add'|'edit'|'delete'} action - Action being performed
 */
const checkPermission = (moduleCode, subModuleCode, action) => {
  return [
    auth,
    asyncHandler(async (req, res, next) => {
      const user = req.user;
      if (!user) {
        throw new AppError('Authentication required', 401);
      }

      // 1. ADMIN BYPASS: Admin has full access to all APIs without restrictions
      const roleName = user.roleId?.roleName?.trim().toLowerCase();
      if (roleName === 'admin') {
        return next();
      }

      // 2. REGULAR USER: Check user-specific permissions
      const userPerm = await UserPermission.findOne({ userId: user._id });
      if (!userPerm || !Array.isArray(userPerm.permissions) || userPerm.permissions.length === 0) {
        throw new AppError('Access denied: No permissions assigned to your user account', 403);
      }

      const modUpper = moduleCode ? moduleCode.trim().toUpperCase() : '';
      const subUpper = subModuleCode ? subModuleCode.trim().toUpperCase() : '';

      const matchedPermission = userPerm.permissions.find((p) => {
        const pMod = p.moduleCode ? p.moduleCode.trim().toUpperCase() : '';
        const pSub = p.subModuleCode ? p.subModuleCode.trim().toUpperCase() : '';

        if (subUpper) {
          return pMod === modUpper && pSub === subUpper;
        }
        return pMod === modUpper;
      });

      if (!matchedPermission) {
        throw new AppError(
          `Access denied: You do not have access to ${subModuleCode || moduleCode}`,
          403,
        );
      }

      // Map action to schema property
      const actionMap = {
        view: 'canView',
        add: 'canAdd',
        edit: 'canEdit',
        delete: 'canDelete',
      };

      const permField = actionMap[action?.toLowerCase()];
      if (!permField || !matchedPermission[permField]) {
        throw new AppError(
          `Access denied: You do not have permission to ${action} in ${subModuleCode || moduleCode}`,
          403,
        );
      }

      next();
    }),
  ];
};

module.exports = checkPermission;
