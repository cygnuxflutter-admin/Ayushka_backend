const milkService = require('../services/milk.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../validators/milk.validator');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

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

/**
 * Get cow-wise milk production matrix for date range (Morning & Evening grid)
 */
const getMilkMatrix = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;

  // Support direct Excel format download via query param: ?format=excel
  if (query.format === 'excel') {
    const buffer = await milkService.exportMilkMatrixExcel(query);
    const filename = `Milk_Production_Matrix_${query.startDate}_to_${query.endDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  }

  const result = await milkService.getMilkProductionMatrix(query);

  res.status(200).json({
    success: true,
    message: 'Milk production matrix fetched successfully',
    data: result,
  });
});

/**
 * Export cow-wise milk production matrix as styled Excel spreadsheet (.xlsx)
 */
const exportMilkMatrixExcel = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const buffer = await milkService.exportMilkMatrixExcel(query);
  const filename = `Milk_Production_Matrix_${query.startDate}_to_${query.endDate}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * Controller to handle GET /api/v1/milk/import-template
 * Generates dynamic Excel template with database dropdowns (Cows, Workers, Shifts, Gaushalas).
 */
const downloadImportTemplate = asyncHandler(async (req, res) => {
  let gaushalaId = req.query.gaushalaId || req.query.gaushala_id || null;
  if (req.user && !isSuperAdmin(req.user) && req.user.gaushalaId) {
    gaushalaId = (req.user.gaushalaId._id || req.user.gaushalaId).toString();
  }

  const buffer = await milkService.generateMilkImportTemplate({
    gaushalaId,
    user: req.user,
    date: req.query.date,
    shift: req.query.shift,
  });

  const filename = 'milk_production_import_template.xlsx';
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * Controller to handle POST /api/v1/milk/upload-excel (or /import-excel)
 * Bulk imports milk production records from uploaded Excel / CSV file.
 */
const importMilkProduction = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError('Excel file is required. Please upload an .xlsx, .xls, or .csv file.', 400);
  }

  const addedBy = req.user?._id?.toString() || req.body?.addedBy;
  if (!addedBy) {
    throw new AppError('addedBy or authentication is required', 400);
  }

  let defaultGaushalaId =
    req.body?.gaushalaId || req.body?.gaushala_id || req.query?.gaushalaId || null;

  // Role-based Gaushala check:
  if (req.user && !isSuperAdmin(req.user) && req.user.gaushalaId) {
    const userGaushalaStr = (req.user.gaushalaId._id || req.user.gaushalaId).toString();
    if (defaultGaushalaId && defaultGaushalaId.toString().trim() !== userGaushalaStr) {
      const roleLabel = isAdmin(req.user) ? 'Admin' : 'User';
      throw new AppError(
        `Access denied: ${roleLabel} can only import milk records for their assigned gaushala`,
        403,
      );
    }
    defaultGaushalaId = userGaushalaStr;
  }

  const result = await milkService.importMilkProductionFromExcel({
    fileBuffer: req.file.buffer,
    addedBy,
    defaultGaushalaId,
    user: req.user,
  });

  const message = `Import completed: ${result.importedCount} milk production records imported successfully${
    result.failedCount > 0 ? `, ${result.failedCount} rows failed` : ''
  }`;

  res.status(200).json({
    success: true,
    message,
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
  getMilkMatrix,
  exportMilkMatrixExcel,
  downloadImportTemplate,
  importMilkProduction,
};
