const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controller to handle GET /api/v1/dashboard/alerts-summary
 */
const getAlertsSummary = asyncHandler(async (req, res) => {
  const gaushalaId =
    req.query.gaushalaId ||
    req.query.gaushala_id ||
    req.user?.gaushalaId?.toString();

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
