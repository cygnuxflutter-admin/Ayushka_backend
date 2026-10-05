const asyncHandler = require('../utils/asyncHandler');
const moduleService = require('../services/module.service');

const getModules = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const modules = await moduleService.getAllModules(filter);
  res.status(200).json({
    success: true,
    message: 'Modules fetched successfully',
    data: modules,
  });
});

const getModuleById = asyncHandler(async (req, res) => {
  const moduleDoc = await moduleService.getModuleById(req.params.id);
  res.status(200).json({
    success: true,
    data: moduleDoc,
  });
});

const createModule = asyncHandler(async (req, res) => {
  const created = await moduleService.createModule(req.body);
  res.status(201).json({
    success: true,
    message: 'Module created successfully',
    data: created,
  });
});

const updateModule = asyncHandler(async (req, res) => {
  const updated = await moduleService.updateModule(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Module updated successfully',
    data: updated,
  });
});

const deleteModule = asyncHandler(async (req, res) => {
  const deleted = await moduleService.deleteModule(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Module deleted successfully',
    data: deleted,
  });
});

const addSubModule = asyncHandler(async (req, res) => {
  const updated = await moduleService.addSubModule(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Sub-module added successfully',
    data: updated,
  });
});

const removeSubModule = asyncHandler(async (req, res) => {
  const updated = await moduleService.removeSubModule(req.params.id, req.params.subModuleCode);
  res.status(200).json({
    success: true,
    message: 'Sub-module removed successfully',
    data: updated,
  });
});

module.exports = {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  addSubModule,
  removeSubModule,
};
