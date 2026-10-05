const treatmentService = require('../services/treatment.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controller for Cow Treatment Management
 */

const createTreatment = asyncHandler(async (req, res) => {
  const treatmentData = req.validatedData || req.body;
  const result = await treatmentService.createTreatment(treatmentData, req.user);

  res.status(201).json({
    success: true,
    message: 'Treatment case created successfully',
    data: result,
  });
});

const getTreatments = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  if (!gaushalaId) {
    throw new AppError('gaushalaId is required in query params', 400);
  }

  const result = await treatmentService.getTreatments({
    ...req.query,
    gaushalaId,
  });

  res.status(200).json({
    success: true,
    message: 'Treatments fetched successfully',
    data: result.treatments,
    pagination: result.pagination,
    count: result.count,
  });
});

const getTreatmentById = asyncHandler(async (req, res) => {
  const result = await treatmentService.getTreatmentById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Treatment details fetched successfully',
    data: result,
  });
});

const updateTreatment = asyncHandler(async (req, res) => {
  const updateData = req.validatedData || req.body;
  const result = await treatmentService.updateTreatment(req.params.id, updateData, req.user);

  res.status(200).json({
    success: true,
    message: 'Treatment updated successfully',
    data: result,
  });
});

const administerDose = asyncHandler(async (req, res) => {
  const doseNumber = req.validatedDoseNumber || req.params.doseNumber;
  const doseData = req.validatedData || req.body;
  const result = await treatmentService.administerDose(
    req.params.id,
    doseNumber,
    doseData,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: `Dose ${doseNumber} administered successfully`,
    data: result,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, recoveryNotes, markCowDied } = req.validatedData || req.body;
  const result = await treatmentService.updateStatus(
    req.params.id,
    { status, recoveryNotes, markCowDied },
    req.user,
  );

  res.status(200).json({
    success: true,
    message: 'Treatment status updated successfully',
    data: result,
  });
});

const getTodayDueDoses = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  if (!gaushalaId) {
    throw new AppError('gaushalaId is required in query params', 400);
  }

  const result = await treatmentService.getTodayDueDoses(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Today due doses fetched successfully',
    data: result,
    count: result.length,
  });
});

const getDashboardSummary = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  if (!gaushalaId) {
    throw new AppError('gaushalaId is required in query params', 400);
  }

  const result = await treatmentService.getDashboardSummary(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Treatment summary fetched successfully',
    data: result,
  });
});

const deleteTreatment = asyncHandler(async (req, res) => {
  const result = await treatmentService.deleteTreatment(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: 'Treatment record deleted successfully',
    data: result,
  });
});

module.exports = {
  createTreatment,
  getTreatments,
  getTreatmentById,
  updateTreatment,
  administerDose,
  updateStatus,
  getTodayDueDoses,
  getDashboardSummary,
  deleteTreatment,
};
