const express = require('express');
const cowController = require('../../controllers/cow.controller');
const { validateAddCow, validateUpdateCow, validateShedTransfer } = require('../../validators/cow.validator');
const optionalAuth = require('../../middlewares/optionalAuth');
const adminOnly = require('../../middlewares/adminOnly');
const uploadExcel = require('../../middlewares/excelUpload');

const router = express.Router();

// Read endpoints (Parent: /api/v1/cows)
router.get('/', optionalAuth, cowController.getCows);

router.get('/import-template', cowController.downloadImportTemplate);
router.post('/upload-excel', adminOnly, uploadExcel, cowController.importCows);

// Shed transfer history endpoint
router.get('/shed-transfer-history', optionalAuth, cowController.getShedTransferHistory);

// Shed transfer write endpoints
router.post('/shed-transfer', adminOnly, validateShedTransfer, cowController.transferShed);

// Write endpoints (Parent: /api/v1/cows)
router.post('/', adminOnly, validateAddCow, cowController.addCow);
router.put('/:id', adminOnly, validateUpdateCow, cowController.updateCow);
router.post('/:id/status', adminOnly, cowController.toggleCowStatus);
router.post('/:id/delete', adminOnly, cowController.deleteCow);
router.post('/:id/died', adminOnly, cowController.markCowAsDied);

module.exports = router;


