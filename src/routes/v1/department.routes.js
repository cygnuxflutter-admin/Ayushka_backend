const express = require('express');
const departmentController = require('../../controllers/department.controller');
const {
  validateCreateDepartment,
  validateUpdateDepartment,
} = require('../../validators/worker.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// DEPARTMENT ROUTES (/api/v1/departments)
// ==========================================

// 1. List departments for a Gaushala (with worker count statistics)
router.get(
  '/',
  checkPermission('WORKER_MGMT', 'DEPARTMENT_LIST', 'view'),
  departmentController.getDepartments,
);

// 2. Get single department by ID
router.get(
  '/:id',
  checkPermission('WORKER_MGMT', 'DEPARTMENT_LIST', 'view'),
  departmentController.getDepartmentById,
);

// 3. Get all workers belonging to a department
router.get(
  '/:id/workers',
  checkPermission('WORKER_MGMT', 'WORKER_LIST', 'view'),
  departmentController.getDepartmentWorkers,
);

// 4. Create new department
router.post(
  '/',
  checkPermission('WORKER_MGMT', 'DEPARTMENT_LIST', 'add'),
  validateCreateDepartment,
  departmentController.createDepartment,
);

// 5. Update department details
router.post(
  '/:id/update',
  checkPermission('WORKER_MGMT', 'DEPARTMENT_LIST', 'edit'),
  validateUpdateDepartment,
  departmentController.updateDepartment,
);

// 6. Delete department
router.post(
  '/:id/delete',
  checkPermission('WORKER_MGMT', 'DEPARTMENT_LIST', 'delete'),
  departmentController.deleteDepartment,
);

module.exports = router;
