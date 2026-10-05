const milkService = require('../services/milk.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../validators/milk.validator');

/**
 * Record single cow milk production entry
 */
const recordProduction = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await milkService.recordMilkProduction(data, req.user);

  res.status(201).json({
    success: true,
    message: 'Milk production recorded successfully',
    data: result,
  });
});

/**
 * Record bulk milk production entries (multiple cows in one shift)
 */
const recordBulkProduction = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await milkService.recordBulkMilkProduction(data, req.user);

  res.status(201).json({
    success: true,
    message: `Recorded milk production for ${result.totalRecorded} cows`,
    data: result,
  });
});

/**
 * Get daily milk production & distribution balance sheet for a date
 */
const getDailySummary = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  const date = req.query.date || milkService.getTodayDateString();

  const summary = await milkService.getDailyMilkSummary(gaushalaId, date);

  res.status(200).json({
    success: true,
    message: 'Daily milk summary fetched successfully',
    data: summary,
  });
});

/**
 * List milk production records with filters
 */
const getProductionList = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await milkService.getProductionList({
    gaushalaId,
    date: req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    shift: req.query.shift,
    cowId: req.query.cowId || req.query.cow_id,
    workerId: req.query.workerId || req.query.worker_id,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    message: 'Milk production records fetched successfully',
    data: result.records,
    pagination: result.pagination,
  });
});

/**
 * Record milk distribution
 */
const recordDistribution = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await milkService.recordMilkDistribution(data, req.user);

  res.status(201).json({
    success: true,
    message: result.isDelayedEntry
      ? 'Delayed milk distribution recorded successfully from total day stock'
      : 'Milk distribution recorded successfully',
    data: result,
  });
});

/**
 * List milk distribution records with filters
 */
const getDistributionList = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await milkService.getDistributionList({
    gaushalaId,
    milkDate: req.query.milkDate || req.query.milk_date,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    shift: req.query.shift,
    recipientType: req.query.recipientType,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    message: 'Milk distribution records fetched successfully',
    data: result.records,
    pagination: result.pagination,
  });
});

/**
 * Record disposal of spoiled milk from cold storage/fridge
 */
const recordDisposal = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await milkService.recordMilkDisposal(data, req.user);

  res.status(201).json({
    success: true,
    message: 'Milk disposal recorded successfully',
    data: result,
  });
});

/**
 * List milk disposal records with filters
 */
const getDisposalList = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await milkService.getDisposalList({
    gaushalaId,
    milkDate: req.query.milkDate || req.query.milk_date,
    disposalDate: req.query.disposalDate || req.query.disposal_date,
    reason: req.query.reason,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    message: 'Milk disposal records fetched successfully',
    data: result.records,
    pagination: result.pagination,
  });
});

/**
 * Get all dates with remaining leftover milk stored in fridge
 */
const getFridgeStock = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const stock = await milkService.getFridgeStock(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Fridge milk stock fetched successfully',
    data: stock,
  });
});

/**
 * Run monthly variance check across cows and trigger alerts
 */
const checkMonthlyAlerts = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const year = req.body.year || req.query.year;
  const month = req.body.month || req.query.month;

  const result = await milkService.checkMonthlyMilkAlerts(gaushalaId, year, month);

  res.status(200).json({
    success: true,
    message: `Monthly milk variance check completed. ${result.alertsCount} alert(s) generated.`,
    data: result,
  });
});

module.exports = {
  recordProduction,
  recordBulkProduction,
  getDailySummary,
  getProductionList,
  recordDistribution,
  getDistributionList,
  recordDisposal,
  getDisposalList,
  getFridgeStock,
  checkMonthlyAlerts,
};
