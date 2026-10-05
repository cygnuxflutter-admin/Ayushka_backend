const medicalService = require('../services/medical.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller for Veterinary / Medical Stock Management
 */

// --- Medical Items Master ---

const createMedicalItem = asyncHandler(async (req, res) => {
  const itemData = req.validatedData || req.body;
  const item = await medicalService.createMedicalItem(itemData, req.user);

  res.status(201).json({
    success: true,
    message: 'Medical item created successfully',
    data: item,
  });
});

const updateMedicalItem = asyncHandler(async (req, res) => {
  const itemId = req.itemId || req.params.id;
  const updateData = req.validatedData || req.body;
  const item = await medicalService.updateMedicalItem(itemId, updateData);

  res.status(200).json({
    success: true,
    message: 'Medical item updated successfully',
    data: item,
  });
});

const deleteMedicalItem = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const result = await medicalService.deleteMedicalItem(itemId, req.user);

  res.status(200).json({
    success: true,
    message: 'Medical item deleted successfully',
    data: result,
  });
});

const getMedicalItems = asyncHandler(async (req, res) => {
  const result = await medicalService.getMedicalItems(req.query);

  res.status(200).json({
    success: true,
    message: 'Medical items fetched successfully',
    data: result.items,
    pagination: result.pagination,
    count: result.count,
  });
});

const getMedicalItemById = asyncHandler(async (req, res) => {
  const result = await medicalService.getMedicalItemById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Medical item details fetched successfully',
    data: result,
  });
});

const getLowStockItems = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  const items = await medicalService.getLowStockItems(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Low stock medical items retrieved successfully',
    count: items.length,
    data: items,
  });
});

const getExpiringBatches = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  const days = req.query.days || 30;
  const batches = await medicalService.getExpiringBatches(gaushalaId, days);

  res.status(200).json({
    success: true,
    message: `Batches expiring within ${days} days retrieved successfully`,
    count: batches.length,
    data: batches,
  });
});

// --- Transactions & Ledger ---

const recordInward = asyncHandler(async (req, res) => {
  const transactionData = req.validatedData || req.body;
  const result = await medicalService.recordInward(transactionData, req.user);

  res.status(201).json({
    success: true,
    message: 'Medical stock inward recorded successfully',
    data: result,
  });
});

const recordOutward = asyncHandler(async (req, res) => {
  const transactionData = req.validatedData || req.body;
  const result = await medicalService.recordOutward(transactionData, req.user);

  res.status(200).json({
    success: true,
    message: 'Medical stock outward recorded successfully via FEFO logic',
    data: result,
  });
});

const recordAdjustment = asyncHandler(async (req, res) => {
  const transactionData = req.validatedData || req.body;
  const result = await medicalService.recordAdjustment(transactionData, req.user);

  res.status(200).json({
    success: true,
    message: 'Medical stock adjustment recorded successfully',
    data: result,
  });
});

const getBatches = asyncHandler(async (req, res) => {
  const result = await medicalService.getBatches(req.query);

  res.status(200).json({
    success: true,
    message: 'Medical batches fetched successfully',
    data: result.batches,
    pagination: result.pagination,
    count: result.count,
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await medicalService.getTransactions(req.query);

  res.status(200).json({
    success: true,
    message: 'Medical stock transactions fetched successfully',
    data: result.transactions,
    pagination: result.pagination,
    count: result.count,
  });
});

const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await medicalService.getTransactionById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Transaction details fetched successfully',
    data: transaction,
  });
});

const getMedicalSummary = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  const summary = await medicalService.getMedicalSummary(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Medical stock summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  createMedicalItem,
  updateMedicalItem,
  deleteMedicalItem,
  getMedicalItems,
  getMedicalItemById,
  getLowStockItems,
  getExpiringBatches,
  recordInward,
  recordOutward,
  recordAdjustment,
  getBatches,
  getTransactions,
  getTransactionById,
  getMedicalSummary,
};
