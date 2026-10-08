/**
 * Role helper utilities to determine authorization levels.
 */

/**
 * Normalize role name by trimming, lowercasing, and removing spaces, underscores, and hyphens.
 * e.g., 'Super Admin', 'SUPERADMIN', 'super_admin' -> 'superadmin'
 * e.g., 'Admin', 'ADMIN' -> 'admin'
 *
 * @param {string} roleName
 * @returns {string}
 */
const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    return '';
  }
  return roleName.trim().toLowerCase().replace(/[\s_-]+/g, '');
};

/**
 * Extracts the role name string from a role string, role object, or populated user object.
 *
 * @param {string|Object} roleOrUser
 * @returns {string}
 */
const extractRoleName = (roleOrUser) => {
  if (!roleOrUser) {
    return '';
  }
  if (typeof roleOrUser === 'string') {
    return roleOrUser;
  }
  if (typeof roleOrUser.roleName === 'string') {
    return roleOrUser.roleName;
  }
  if (roleOrUser.roleId && typeof roleOrUser.roleId.roleName === 'string') {
    return roleOrUser.roleId.roleName;
  }
  if (typeof roleOrUser.role === 'string') {
    return roleOrUser.role;
  }
  return '';
};

/**
 * Check if the given role or user is an ADMIN or SUPERADMIN.
 *
 * @param {string|Object} roleOrUser
 * @returns {boolean}
 */
const isAdminOrSuperAdmin = (roleOrUser) => {
  const roleName = extractRoleName(roleOrUser);
  const normalized = normalizeRoleName(roleName);
  return normalized === 'admin' || normalized === 'superadmin';
};

/**
 * Check if the given role or user is a SUPERADMIN.
 *
 * @param {string|Object} roleOrUser
 * @returns {boolean}
 */
const isSuperAdmin = (roleOrUser) => {
  const roleName = extractRoleName(roleOrUser);
  const normalized = normalizeRoleName(roleName);
  return normalized === 'superadmin';
};

/**
 * Check if the given role or user is an ADMIN.
 *
 * @param {string|Object} roleOrUser
 * @returns {boolean}
 */
const isAdmin = (roleOrUser) => {
  const roleName = extractRoleName(roleOrUser);
  const normalized = normalizeRoleName(roleName);
  return normalized === 'admin';
};

/**
 * Check if the user is allowed to access/modify data for the targetGaushalaId.
 * - SUPERADMIN: Has access to ALL gaushalas.
 * - ADMIN & USER: Only allowed access to their assigned gaushala (user.gaushalaId).
 *
 * @param {Object} user - Authenticated user document (req.user)
 * @param {string|ObjectId} targetGaushalaId - Target Gaushala ID
 * @returns {boolean}
 */
const canAccessGaushala = (user, targetGaushalaId) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!user.gaushalaId || !targetGaushalaId) return false;

  const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
  const targetGaushalaStr = (targetGaushalaId._id || targetGaushalaId).toString();
  return userGaushalaStr === targetGaushalaStr;
};

/**
 * Asserts that the authenticated user is allowed to access the targetGaushalaId.
 * Throws AppError 403 if unauthorized.
 *
 * @param {Object} user - Authenticated user document (req.user)
 * @param {string|ObjectId} targetGaushalaId - Target Gaushala ID
 * @param {string} [customMessage] - Optional custom error message
 * @returns {boolean}
 */
const assertGaushalaAccess = (user, targetGaushalaId, customMessage) => {
  const AppError = require('./AppError');
  if (!user) {
    throw new AppError('Authentication required', 401);
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  if (!targetGaushalaId) {
    throw new AppError('Gaushala ID is required', 400);
  }
  if (!canAccessGaushala(user, targetGaushalaId)) {
    const roleLabel = isAdmin(user) ? 'Admin' : 'User';
    throw new AppError(
      customMessage || `Access denied: ${roleLabel} can only access their assigned gaushala`,
      403,
    );
  }
  return true;
};

const extractIdString = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val.trim();
  if (val._id) return val._id.toString();
  if (typeof val.toString === 'function') return val.toString();
  return null;
};

/**
 * Resolves the gaushalaId from request (body, query, params, or req.user).
 * Enforces that non-superadmin users can only access their assigned gaushala.
 *
 * @param {Object} req - Express request object
 * @returns {string|null}
 */
const resolveUserGaushalaId = (req) => {
  const AppError = require('./AppError');
  const user = req?.user;
  const body = req?.body || {};
  const query = req?.query || {};
  const params = req?.params || {};

  const requestedGaushalaId =
    extractIdString(body.gaushalaId) ||
    extractIdString(body.gaushala_id) ||
    extractIdString(params.gaushalaId) ||
    extractIdString(params.gaushala_id) ||
    extractIdString(query.gaushalaId) ||
    extractIdString(query.gaushala_id) ||
    null;

  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const userGaushalaStr = extractIdString(user.gaushalaId);
    if (requestedGaushalaId && requestedGaushalaId !== userGaushalaStr) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only access their assigned gaushala`, 403);
    }
    return userGaushalaStr;
  }

  return (
    requestedGaushalaId ||
    (user?.gaushalaId ? extractIdString(user.gaushalaId) : null)
  );
};

module.exports = {
  normalizeRoleName,
  extractRoleName,
  isAdminOrSuperAdmin,
  isSuperAdmin,
  isAdmin,
  canAccessGaushala,
  assertGaushalaAccess,
  resolveUserGaushalaId,
  resolveGaushalaId: resolveUserGaushalaId,
};

