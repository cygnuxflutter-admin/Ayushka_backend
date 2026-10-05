const express = require('express');
const workerController = require('../../controllers/worker.controller');
const {
  validateCreateWorker,
  validateUpdateWorker,
  validateWorkerStatus,
  validateWorkerLeave,
} = require('../../validators/worker.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// WORKER ROUTES (/api/v1/workers)
// ==========================================

// 1. Department-wise worker breakdown & summary (MUST be before /:id)
router.get(
  '/department-summary',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'view'),
  workerController.getDepartmentWiseSummary,
);

// 2. List workers with filters (departmentId, gaushalaId, isActive, search, pagination)
router.get(
  '/',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'view'),
  workerController.getWorkers,
);

// 3. Get single worker by ID
router.get(
  '/:id',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'view'),
  workerController.getWorkerById,
);

// 4. Create new worker
router.post(
  '/',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'add'),
  validateCreateWorker,
  workerController.createWorker,
);

// 5. Update worker details (Admin can update worker name, department, status, dates)
router.post(
  '/:id/update',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'edit'),
  validateUpdateWorker,
  workerController.updateWorker,
);

// 6. Toggle worker status (Active / Deactive)
router.post(
  '/:id/status',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'edit'),
  validateWorkerStatus,
  workerController.toggleWorkerStatus,
);

// 7. Mark worker as left Gaushala (isActive = false, isDelete = false, records leavingDate)
router.post(
  '/:id/leave',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'edit'),
  validateWorkerLeave,
  workerController.markWorkerLeft,
);

// 8. Delete worker (Soft delete: isDelete = true, isActive = false, deletedBy recorded)
router.post(
  '/:id/delete',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'delete'),
  workerController.deleteWorker,
);

module.exports = router;
