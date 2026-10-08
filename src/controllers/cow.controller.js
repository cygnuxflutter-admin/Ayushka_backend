const mongoose = require('mongoose');
const cowService = require('../services/cow.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Gaushala = require('../models/Gaushala');
const Cow = require('../models/cow.model');
const { isSuperAdmin, isAdmin } = require('../utils/roles');

/**
 * Controller to handle POST /api/v1/cows
 */
const addCow = asyncHandler(async (req, res) => {
  console.log('--- [POST /api/v1/cows] Incoming Request Body ---');
  console.log(JSON.stringify(req.body, null, 2));

  const cowData = req.validatedData || req.body;
  const createdCow = await cowService.addCow(cowData, req.user);

  res.status(201).json({
    success: true,
    message: 'Cow added successfully',
    data: createdCow,
  });
});

/**
 * Controller to handle GET /api/v1/cows
 */
const getCows = asyncHandler(async (req, res) => {
  let gaushalaId = req.query.gaushalaId || req.query.gaushala_id || req.params?.gaushalaId;

  const user = req.user;
  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
    if (gaushalaId && gaushalaId.trim() !== userGaushalaStr) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only access their assigned gaushala`, 403);
    }
    gaushalaId = userGaushalaStr;
  }

  if (!gaushalaId || typeof gaushalaId !== 'string' || !gaushalaId.trim()) {
    throw new AppError('Gaushala Id is required', 400);
  }

  const trimmedGaushalaId = gaushalaId.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmedGaushalaId)) {
    throw new AppError('Invalid Gaushala Id format', 400);
  }

  const gaushalaExists = await Gaushala.findById(trimmedGaushalaId);
  if (!gaushalaExists) {
    throw new AppError('Gaushala not found', 404);
  }

  const result = await cowService.getCowsByGender({
    ...req.query,
    gaushala_id: trimmedGaushalaId,
  });

  res.status(200).json({
    success: true,
    message: 'Cows fetched successfully',
    data: result,
  });
});

const path = require('node:path');
const fs = require('node:fs');

/**
 * Controller to handle POST /api/v1/cows/import
 */
const importCows = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError('Excel file is required. Please upload an .xlsx, .xls, or .csv file.', 400);
  }

  const addedBy = req.user?._id?.toString() || req.body?.addedBy;
  if (!addedBy) {
    throw new AppError('addedBy or authentication is required', 400);
  }

  let defaultGaushalaId = req.body?.gaushalaId || req.body?.gaushala_id || null;

  // Role-based Gaushala check:
  // - SUPERADMIN: Can import cows to ANY gaushala.
  // - ADMIN & USER: Can ONLY import cows to their assigned gaushala.
  if (req.user && !isSuperAdmin(req.user) && req.user.gaushalaId) {
    const userGaushalaStr = (req.user.gaushalaId._id || req.user.gaushalaId).toString();
    if (defaultGaushalaId && defaultGaushalaId.toString().trim() !== userGaushalaStr) {
      const roleLabel = isAdmin(req.user) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only import cows to their assigned gaushala`, 403);
    }
    defaultGaushalaId = userGaushalaStr;
  }

  const result = await cowService.importCowsFromExcel({
    fileBuffer: req.file.buffer,
    addedBy,
    defaultGaushalaId,
    user: req.user,
  });

  const message = `Import completed: ${result.importedCount} cows imported successfully${result.failedCount > 0 ? `, ${result.failedCount} rows failed` : ''}`;

  res.status(200).json({
    success: true,
    message,
    data: result,
  });
});

/**
 * Controller to handle GET /api/v1/cows/import-template
 * Generates dynamic Excel template with database dropdowns.
 */
const downloadImportTemplate = asyncHandler(async (req, res) => {
  let gaushalaId = req.query.gaushalaId || req.query.gaushala_id || null;
  if (req.user && !isSuperAdmin(req.user) && req.user.gaushalaId) {
    gaushalaId = (req.user.gaushalaId._id || req.user.gaushalaId).toString();
  }
  const buffer = await cowService.generateCowImportTemplate({ gaushalaId, user: req.user });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="cow_import_template.xlsx"');
  res.send(buffer);
});

/**
 * Controller to handle PUT /api/v1/cows/:id
 */
const updateCow = asyncHandler(async (req, res) => {
  const cowId = req.cowId || req.params.id;
  const updateData = req.validatedData || req.body;

  const updatedCow = await cowService.updateCow(cowId, updateData, req.user);

  res.status(200).json({
    success: true,
    message: 'Cow updated successfully',
    data: updatedCow,
  });
});

/**
 * Controller to handle POST /api/v1/cows/:id/delete
 */
const deleteCow = asyncHandler(async (req, res) => {
  const cowId = req.params.id;
  const userId = req.user?._id;

  const result = await cowService.deleteCow(cowId, userId, req.user);

  res.status(200).json({
    success: true,
    message: 'Cow deleted successfully',
    data: result,
  });
});

/**
 * Controller to handle POST /api/v1/cows/:id/died
 */
const markCowAsDied = asyncHandler(async (req, res) => {
  const cowId = req.params.id;
  const sendDiedDate = req.body.send_died_date;

  const result = await cowService.markCowAsDied(cowId, sendDiedDate, req.user);

  res.status(200).json({
    success: true,
    message: 'Cow marked as died successfully',
    data: result,
  });
});

/**
 * Controller to handle POST /api/v1/cows/:id/status
 */
const toggleCowStatus = asyncHandler(async (req, res) => {
  const cowId = req.params.id;
  const isActive = req.body?.isActive;

  const result = await cowService.toggleCowStatus(cowId, isActive, req.user);

  const statusText = result.isActive ? 'activated' : 'deactivated';

  res.status(200).json({
    success: true,
    message: `Cow ${statusText} successfully`,
    data: result,
  });
});

/**
 * Controller to handle POST /api/v1/cows/shed-transfer or POST /api/v1/cows/:id/shed-transfer
 */
const transferShed = asyncHandler(async (req, res) => {
  const transferData = req.validatedTransferData || req.body;
  const transferredBy = req.user?._id?.toString() || transferData.transferredBy;

  const result = await cowService.transferShed({
    ...transferData,
    transferredBy,
    user: req.user,
  });

  res.status(200).json({
    success: true,
    message: 'Cow shed transfer completed successfully',
    data: result,
  });
});

/**
 * Controller to handle GET /api/v1/cows/shed-transfer-history
 * Returns shed transfer history filtered by cowId or gaushalaId.
 * Supports:
 * - Query by cowId: /api/v1/cows/shed-transfer-history?cowId=<COW_ID>
 * - Query by gaushalaId: /api/v1/cows/shed-transfer-history?gaushalaId=<GAUSHALA_ID>
 * - Query by both cowId and gaushalaId
 */
const getShedTransferHistory = asyncHandler(async (req, res) => {
  const cowId = req.query.cowId || req.query.cow_id || req.query.cowID;
  let gaushalaId = req.query.gaushalaId || req.query.gaushala_id || req.query.gaushalaID || req.params?.gaushalaId;

  const user = req.user;
  if (user && !isSuperAdmin(user) && user.gaushalaId) {
    const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
    if (gaushalaId && gaushalaId.trim() !== userGaushalaStr) {
      const roleLabel = isAdmin(user) ? 'Admin' : 'User';
      throw new AppError(`Access denied: ${roleLabel} can only view shed transfers within their assigned gaushala`, 403);
    }
    if (!cowId && !gaushalaId) {
      gaushalaId = userGaushalaStr;
    }
  }

  const trimmedCowId = typeof cowId === 'string' && cowId.trim() ? cowId.trim() : null;
  const trimmedGaushalaId = typeof gaushalaId === 'string' && gaushalaId.trim() ? gaushalaId.trim() : null;

  if (!trimmedCowId && !trimmedGaushalaId) {
    throw new AppError('Either cowId or gaushalaId is required in query parameters', 400);
  }

  let cow = null;
  if (trimmedCowId) {
    if (!mongoose.Types.ObjectId.isValid(trimmedCowId)) {
      throw new AppError('Invalid Cow ID format', 400);
    }
    cow = await Cow.findById(trimmedCowId).populate('gaushala_id', 'gaushalaName');
    if (!cow) {
      throw new AppError(`Cow not found with ID: ${trimmedCowId}`, 404);
    }
    if (user && !isSuperAdmin(user) && user.gaushalaId) {
      const userGaushalaStr = (user.gaushalaId._id || user.gaushalaId).toString();
      const cowGaushalaStr = (cow.gaushala_id?._id || cow.gaushala_id)?.toString();
      if (cowGaushalaStr && cowGaushalaStr !== userGaushalaStr) {
        const roleLabel = isAdmin(user) ? 'Admin' : 'User';
        throw new AppError(`Access denied: ${roleLabel} can only view shed transfers within their assigned gaushala`, 403);
      }
    }
  }

  let gaushala = null;
  if (trimmedGaushalaId) {
    if (!mongoose.Types.ObjectId.isValid(trimmedGaushalaId)) {
      throw new AppError('Invalid Gaushala ID format', 400);
    }
    gaushala = await Gaushala.findById(trimmedGaushalaId);
    if (!gaushala) {
      throw new AppError('Gaushala not found', 404);
    }
  }

  const serviceParams = { ...req.query };
  if (trimmedCowId) {
    serviceParams.cow_id = trimmedCowId;
  }
  if (trimmedGaushalaId) {
    serviceParams.gaushala_id = trimmedGaushalaId;
  } else {
    delete serviceParams.gaushala_id;
    delete serviceParams.gaushalaId;
    delete serviceParams.gaushalaID;
  }

  const history = await cowService.getShedTransferHistory(serviceParams);

  const responseData = {};

  if (cow) {
    responseData.cow = {
      _id: cow._id,
      tag_id: cow.tag_id,
      calf_name: cow.calf_name,
    };
  }

  if (gaushala) {
    responseData.gaushala = {
      _id: gaushala._id,
      gaushalaName: gaushala.gaushalaName,
    };
  } else if (cow?.gaushala_id) {
    responseData.gaushala = {
      _id: cow.gaushala_id._id || cow.gaushala_id,
      gaushalaName: cow.gaushala_id.gaushalaName || undefined,
    };
  }

  Object.assign(responseData, history);

  res.status(200).json({
    success: true,
    message: 'Shed transfer history fetched successfully',
    data: responseData,
  });
});

module.exports = {
  addCow,
  updateCow,
  deleteCow,
  markCowAsDied,
  toggleCowStatus,
  getCows,
  importCows,
  downloadImportTemplate,
  transferShed,
  getShedTransferHistory,
};

