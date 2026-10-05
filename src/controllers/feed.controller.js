const feedService = require('../services/feed.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controller for Cow Fodder and Feed Stock Management
 */

// --- Feed Items Master Controllers ---

const createFeedItem = asyncHandler(async (req, res) => {
  const itemData = req.validatedData || req.body;
  const item = await feedService.createFeedItem(itemData, req.user);

  res.status(201).json({
    success: true,
    message: 'Feed item created successfully',
    data: item,
  });
});

const updateFeedItem = asyncHandler(async (req, res) => {
  const itemId = req.itemId || req.params.id;
  const updateData = req.validatedData || req.body;
  const item = await feedService.updateFeedItem(itemId, updateData);

  res.status(200).json({
    success: true,
    message: 'Feed item updated successfully',
    data: item,
  });
});

const deleteFeedItem = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const result = await feedService.deleteFeedItem(itemId, req.user);

  res.status(200).json({
    success: true,
    message: 'Feed item deleted successfully',
    data: result,
  });
});

const getFeedItems = asyncHandler(async (req, res) => {
  const result = await feedService.getFeedItems(req.query);

  res.status(200).json({
    success: true,
    message: 'Feed items fetched successfully',
    data: result.items,
    pagination: result.pagination,
    count: result.count,
  });
});

const getFeedItemById = asyncHandler(async (req, res) => {
  const item = await feedService.getFeedItemById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Feed item fetched successfully',
    data: item,
  });
});

const getLowStockItems = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id;
  const items = await feedService.getLowStockItems(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Low stock items fetched successfully',
    data: items,
  });
});

// --- Stock Transactions Controllers ---

const recordInward = asyncHandler(async (req, res) => {
  const transactionData = req.validatedTransaction || req.body;
  const result = await feedService.recordInward(transactionData, req.user);

  res.status(201).json({
    success: true,
    message: 'Stock inward recorded successfully',
    data: result,
  });
});

const recordOutward = asyncHandler(async (req, res) => {
  const transactionData = req.validatedTransaction || req.body;
  const result = await feedService.recordOutward(transactionData, req.user);

  res.status(201).json({
    success: true,
    message: 'Stock outward recorded successfully',
    data: result,
  });
});

const recordAdjustment = asyncHandler(async (req, res) => {
  const transactionData = req.validatedTransaction || req.body;
  const result = await feedService.recordAdjustment(transactionData, req.user);

  res.status(201).json({
    success: true,
    message: 'Stock adjustment recorded successfully',
    data: result,
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await feedService.getTransactions(req.query);

  res.status(200).json({
    success: true,
    message: 'Stock transactions fetched successfully',
    data: result.transactions,
    pagination: result.pagination,
  });
});

const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await feedService.getTransactionById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Stock transaction fetched successfully',
    data: transaction,
  });
});

const getStockSummary = asyncHandler(async (req, res) => {
  const gaushalaId = req.query.gaushalaId || req.query.gaushala_id || req.params.gaushalaId;
  if (!gaushalaId) {
    throw new AppError('gaushalaId query parameter is required', 400);
  }

  const summary = await feedService.getStockSummary(gaushalaId);

  res.status(200).json({
    success: true,
    message: 'Stock summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  createFeedItem,
  updateFeedItem,
  deleteFeedItem,
  getFeedItems,
  getFeedItemById,
  getLowStockItems,
  recordInward,
  recordOutward,
  recordAdjustment,
  getTransactions,
  getTransactionById,
  getStockSummary,
};
