const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const UserPermission = require('../models/UserPermission');
const auth = require('./auth');
const { isSuperAdmin, isAdmin, resolveUserGaushalaId } = require('../utils/roles');

/**
 * Middleware to enforce module and sub-module action permissions (view, add, edit, delete).
 *
 * Rules:
 * 1. Superadmin -> Full access across ALL gaushalas, modules, and actions without restrictions.
 * 2. Admin -> Full access to all modules and actions, strictly scoped to their assigned gaushala.
 * 3. Regular User -> Looks up UserPermission in database and strictly scoped to their assigned gaushala.
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

      // 1. SUPERADMIN BYPASS: Unrestricted access across ALL gaushalas, modules, and actions
      if (isSuperAdmin(user)) {
        return next();
      }

      // For non-superadmin: enforce gaushala scoping on gaushala-scoped modules
      const globalModules = ['ROLE', 'BREED_TYPE', 'TYPE', 'GAUSHALA'];
      const isGaushalaScopedModule = !globalModules.includes((moduleCode || '').trim().toUpperCase());
      if (isGaushalaScopedModule && user.gaushalaId) {
        const enforcedGaushalaId = resolveUserGaushalaId(req);
        if (enforcedGaushalaId) {
          if (req.query && !req.query.gaushalaId && !req.query.gaushala_id) {
            req.query.gaushalaId = enforcedGaushalaId;
          }
        }
      }

      // 2. ADMIN BYPASS: Full access to all modules/actions within their assigned gaushala
      if (isAdmin(user)) {
        return next();
      }

      // 3. REGULAR USER: Check user-specific permissions
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
