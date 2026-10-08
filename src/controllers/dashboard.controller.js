const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

/**
 * Controller to handle GET /api/v1/dashboard/alerts-summary
 */
const getAlertsSummary = asyncHandler(async (req, res) => {
  let gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  const user = req.user;

  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
    if (gaushalaId && gaushalaId.trim() !== userGaushalaStr) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only view alerts for their assigned gaushala`, 403);
    }
    gaushalaId = userGaushalaStr;
  } else if (!gaushalaId && user?.gaushalaId) {
    gaushalaId = (user.gaushalaId._id || user.gaushalaId).toString();
  }

  if (!gaushalaId || typeof gaushalaId !== 'string' || !gaushalaId.trim()) {
    throw new AppError('Gaushala ID is required in query parameters (gaushalaId)', 400);
  }

  const summary = await dashboardService.getAlertsSummary(
    gaushalaId.trim(),
    req.user?._id,
  );

  res.status(200).json({
    success: true,
    message: 'Dashboard alerts summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  getAlertsSummary,
};
