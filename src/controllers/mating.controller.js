const matingService = require('../services/mating.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../utils/roles');

/**
 * Record new mating entry (Natural Service or Artificial Insemination)
 */
const recordMating = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const result = await matingService.recordMating(data, req.user);

  res.status(201).json({
    success: true,
    message: 'Mating record registered successfully',
    data: result,
  });
});

/**
 * Update Pregnancy Diagnosis (PD) status
 */
const updatePDStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.validatedData || req.body;
  const result = await matingService.updatePDStatus(id, data, req.user);

  res.status(200).json({
    success: true,
    message: `Pregnancy diagnosis updated to ${result.status}`,
    data: result,
  });
});

/**
 * Record calving event (calf delivery)
 */
const recordCalving = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.validatedData || req.body;
  const result = await matingService.recordCalving(id, data, req.user);

  res.status(200).json({
    success: true,
    message: 'Calving record saved successfully',
    data: result,
  });
});

/**
 * Update existing mating details
 */
const updateMating = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await matingService.updateMating(id, data, req.user);

  res.status(200).json({
    success: true,
    message: 'Mating details updated successfully',
    data: result,
  });
});

/**
 * Get list of mating records with filtering & pagination
 */
const getMatingList = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await matingService.getMatingList({
    gaushalaId,
    ...req.query,
  });

  res.status(200).json({
    success: true,
    message: 'Mating records fetched successfully',
    data: result.records,
    pagination: result.pagination,
  });
});

/**
 * Get single mating record by ID
 */
const getMatingById = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  const { id } = req.params;
  const result = await matingService.getMatingById(id, gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Mating record fetched successfully',
    data: result,
  });
});

/**
 * Delete mating record (soft delete)
 */
const deleteMating = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await matingService.deleteMatingRecord(id, req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get repeat breeder alerts (cows with 3 or more failed matings)
 */
const getRepeatBreederAlerts = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await matingService.getRepeatBreederAlerts(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Repeat breeder alerts fetched successfully',
    data: result,
  });
});

/**
 * Get matings due for Pregnancy Diagnosis (PD) check
 */
const getPendingPDAlerts = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const result = await matingService.getPendingPDAlerts(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Pending PD alerts fetched successfully',
    data: result,
  });
});

module.exports = {
  recordMating,
  updatePDStatus,
  recordCalving,
  updateMating,
  getMatingList,
  getMatingById,
  deleteMating,
  getRepeatBreederAlerts,
  getPendingPDAlerts,
};
