const express = require('express');
const cowController = require('../../controllers/cow.controller');
const { validateAddCow, validateUpdateCow, validateShedTransfer } = require('../../validators/cow.validator');
const checkPermission = require('../../middlewares/checkPermission');
const uploadExcel = require('../../middlewares/excelUpload');

const router = express.Router();

// Read endpoints (Parent: /api/v1/cows)
router.get('/', checkPermission('COW', 'COW_LIST', 'view'), cowController.getCows);

router.get('/import-template', cowController.downloadImportTemplate);
router.post('/upload-excel', checkPermission('COW', 'COW_LIST', 'add'), uploadExcel, cowController.importCows);

// Shed transfer history endpoint
router.get('/shed-transfer-history', checkPermission('COW', 'SHED_TRANSFER', 'view'), cowController.getShedTransferHistory);

// Shed transfer write endpoints
router.post('/shed-transfer', checkPermission('COW', 'SHED_TRANSFER', 'add'), validateShedTransfer, cowController.transferShed);

// Write endpoints (Parent: /api/v1/cows)
router.post('/', checkPermission('COW', 'COW_LIST', 'add'), validateAddCow, cowController.addCow);
router.post('/:id/update', checkPermission('COW', 'COW_LIST', 'edit'), validateUpdateCow, cowController.updateCow);
router.post('/:id/status', checkPermission('COW', 'COW_LIST', 'edit'), cowController.toggleCowStatus);
router.post('/:id/delete', checkPermission('COW', 'COW_LIST', 'delete'), cowController.deleteCow);
router.post('/:id/died', checkPermission('COW', 'COW_LIST', 'edit'), cowController.markCowAsDied);

module.exports = router;


