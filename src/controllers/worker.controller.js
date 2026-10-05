const workerService = require('../services/worker.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../validators/worker.validator');

/**
 * Add a new Worker profile
 */
const createWorker = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const worker = await workerService.createWorker(data);

  res.status(201).json({
    success: true,
    message: 'Worker registered successfully',
    data: worker,
  });
});

/**
 * List Workers with filters (departmentId, gaushalaId, isActive, search, pagination)
 */
const getWorkers = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  const departmentId = req.query.departmentId || req.query.department_id;

  const filter = {
    gaushalaId,
    departmentId,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  };

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const result = await workerService.getWorkers(filter);

  res.status(200).json({
    success: true,
    message: 'Workers fetched successfully',
    data: result.workers,
    pagination: result.pagination,
  });
});

/**
 * Get Worker details by ID
 */
const getWorkerById = asyncHandler(async (req, res) => {
  const worker = await workerService.getWorkerById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Worker details fetched successfully',
    data: worker,
  });
});

/**
 * Update Worker details (Admin can update worker name, department, isActive, dates)
 */
const updateWorker = asyncHandler(async (req, res) => {
  const workerId = req.workerId || req.params.id;
  const updateData = req.validatedData || req.body;

  const worker = await workerService.updateWorker(workerId, updateData);

  res.status(200).json({
    success: true,
    message: 'Worker updated successfully',
    data: worker,
  });
});

/**
 * Toggle Worker Status (active / deactive)
 * When deactivated (worker leaves gaushala), isActive = false, isDelete = false
 */
const toggleWorkerStatus = asyncHandler(async (req, res) => {
  const workerId = req.workerId || req.params.id;
  const isActive = req.isActive;

  const worker = await workerService.toggleWorkerStatus(workerId, isActive);

  res.status(200).json({
    success: true,
    message: `Worker marked as ${isActive ? 'active' : 'inactive'} successfully`,
    data: worker,
  });
});

/**
 * Mark worker as left Gaushala
 * Sets leavingDate, isActive = false, isDelete = false
 */
const markWorkerLeft = asyncHandler(async (req, res) => {
  const workerId = req.workerId || req.params.id;
  const leavingDate = req.leavingDate || new Date();

  const worker = await workerService.markWorkerLeft(workerId, leavingDate);

  res.status(200).json({
    success: true,
    message: 'Worker marked as left Gaushala successfully (isActive = false, isDelete = false)',
    data: worker,
  });
});

/**
 * Delete Worker (soft delete: isDelete = true, isActive = false, deletedBy recorded)
 */
const deleteWorker = asyncHandler(async (req, res) => {
  const workerId = req.params.id;
  const worker = await workerService.deleteWorker(workerId, req.user?._id);

  res.status(200).json({
    success: true,
    message: 'Worker deleted successfully',
    data: worker,
  });
});

/**
 * Department-wise Worker Breakdown Summary for a Gaushala
 */
const getDepartmentWiseSummary = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  if (!gaushalaId) {
    throw new AppError('gaushalaId is required', 400);
  }

  const summary = await workerService.getDepartmentWiseSummary(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Department-wise worker summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  toggleWorkerStatus,
  markWorkerLeft,
  deleteWorker,
  getDepartmentWiseSummary,
};
