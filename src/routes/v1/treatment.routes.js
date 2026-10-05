const express = require('express');
const treatmentController = require('../../controllers/treatment.controller');
const {
  validateCreateTreatment,
  validateUpdateTreatment,
  validateAdministerDose,
  validateUpdateStatus,
} = require('../../validators/treatment.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// SUMMARY & ALERT ENDPOINTS (Must come before /:id)
// ==========================================

// Dashboard stats
router.get(
  '/dashboard/summary',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'view'),
  treatmentController.getDashboardSummary,
);

// Today due doses alert list
router.get(
  '/doses/today-due',
  checkPermission('TREATMENT', 'DOSE_SCHEDULE', 'view'),
  treatmentController.getTodayDueDoses,
);

// ==========================================
// CRUD & DOSE ENDPOINTS
// ==========================================

// List all treatments
router.get(
  '/',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'view'),
  treatmentController.getTreatments,
);

// Get single treatment by ID
router.get(
  '/:id',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'view'),
  treatmentController.getTreatmentById,
);

// Create new treatment case
router.post(
  '/',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'add'),
  validateCreateTreatment,
  treatmentController.createTreatment,
);

// Update treatment details
router.post(
  '/:id/update',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'edit'),
  validateUpdateTreatment,
  treatmentController.updateTreatment,
);

// Administer / mark a specific dose as given
router.post(
  '/:id/doses/:doseNumber/administer',
  checkPermission('TREATMENT', 'DOSE_SCHEDULE', 'edit'),
  validateAdministerDose,
  treatmentController.administerDose,
);

// Update treatment status (e.g. RECOVERED, CRITICAL, DECEASED, CLOSED)
router.post(
  '/:id/status',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'edit'),
  validateUpdateStatus,
  treatmentController.updateStatus,
);

// Delete treatment record (soft delete)
router.post(
  '/:id/delete',
  checkPermission('TREATMENT', 'TREATMENT_LIST', 'delete'),
  treatmentController.deleteTreatment,
);

module.exports = router;
