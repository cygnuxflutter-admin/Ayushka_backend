const workerService = require('../services/worker.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGaushalaId } = require('../validators/worker.validator');

/**
 * Create a new Department
 */
const createDepartment = asyncHandler(async (req, res) => {
  const data = req.validatedData || req.body;
  const department = await workerService.createDepartment(data);

  res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: department,
  });
});

/**
 * List all Departments for a Gaushala (with worker count stats)
 */
const getDepartments = asyncHandler(async (req, res) => {
  const gaushalaId = resolveGaushalaId(req);
  const filter = {
    gaushalaId,
    search: req.query.search,
  };

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const departments = await workerService.getDepartments(filter);

  res.status(200).json({
    success: true,
    message: 'Departments fetched successfully',
    data: departments,
  });
});

/**
 * Get Department by ID
 */
const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await workerService.getDepartmentById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Department fetched successfully',
    data: department,
  });
});

/**
 * Update Department details (Admin or authorized user)
 */
const updateDepartment = asyncHandler(async (req, res) => {
  const departmentId = req.departmentId || req.params.id;
  const updateData = req.validatedData || req.body;

  const department = await workerService.updateDepartment(departmentId, updateData);

  res.status(200).json({
    success: true,
    message: 'Department updated successfully',
    data: department,
  });
});

/**
 * Delete Department
 */
const deleteDepartment = asyncHandler(async (req, res) => {
  const departmentId = req.params.id;
  const department = await workerService.deleteDepartment(departmentId, req.user?._id);

  res.status(200).json({
    success: true,
    message: 'Department deleted successfully',
    data: department,
  });
});

/**
 * Get all workers for a specific department
 */
const getDepartmentWorkers = asyncHandler(async (req, res) => {
  const departmentId = req.params.id;
  const department = await workerService.getDepartmentById(departmentId);

  const filter = {
    departmentId,
    gaushalaId: department.gaushalaId?._id || department.gaushalaId,
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
    message: 'Department workers fetched successfully',
    department: {
      _id: department._id,
      departmentName: department.departmentName,
      departmentCode: department.departmentCode,
      workerStats: department.workerStats,
    },
    data: result.workers,
    pagination: result.pagination,
  });
});

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentWorkers,
};
