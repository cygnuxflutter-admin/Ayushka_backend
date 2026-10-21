const heatService = require('../services/heat.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../utils/roles');

/**
 * Record new cow heat entry
 */
const createHeatRecord = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await heatService.createHeatRecord(data, req.user);

  res.status(201).json({
    success: true,
    message: 'Cow heat observation recorded successfully',
    data: result,
  });
});

/**
 * Update existing heat record
 */
const updateHeatRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await heatService.updateHeatRecord(id, data, req.user);

  res.status(200).json({
    success: true,
    message: 'Heat record updated successfully',
    data: result,
  });
});

/**
 * Get list of heat records with filtering & pagination
 */
const getHeatList = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await heatService.getHeatList({
    gaushalaId,
    ...req.query,
  });

  res.status(200).json({
    success: true,
    message: 'Heat records fetched successfully',
    data: result.records,
    pagination: result.pagination,
  });
});

/**
 * Get single heat record by ID
 */
const getHeatById = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  const { id } = req.params;
  const result = await heatService.getHeatById(id, gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Heat record fetched successfully',
    data: result,
  });
});

/**
 * Delete heat record (soft delete)
 */
const deleteHeatRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await heatService.deleteHeatRecord(id, req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get cows currently active in heat (ready for mating)
 */
const getActiveHeats = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await heatService.getActiveHeats(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Active heat cows fetched successfully',
    data: result,
  });
});

/**
 * Get frequent repeat heat alerts (3+ heats without conception)
 */
const getRepeatHeatAlerts = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await heatService.getRepeatHeatAlerts(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Repeat heat alerts fetched successfully',
    data: result,
  });
});

module.exports = {
  createHeatRecord,
  updateHeatRecord,
  getHeatList,
  getHeatById,
  deleteHeatRecord,
  getActiveHeats,
  getRepeatHeatAlerts,
};
