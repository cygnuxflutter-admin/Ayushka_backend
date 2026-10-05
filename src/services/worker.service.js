const mongoose = require('mongoose');
const Department = require('../models/Department');
const Worker = require('../models/Worker');
const Gaushala = require('../models/Gaushala');
const AppError = require('../utils/AppError');

// ==========================================
// DEPARTMENT SERVICE
// ==========================================

const createDepartment = async (departmentData) => {
  const { gaushalaId, departmentName, departmentCode, description, isActive } = departmentData;

  const gaushala = await Gaushala.findById(gaushalaId);
  if (!gaushala) {
    throw new AppError('Gaushala not found', 404);
  }

  // Check duplicate name within the same Gaushala
  const existing = await Department.findOne({
    gaushalaId,
    isDelete: false,
    departmentName: new RegExp(`^${departmentName.trim()}$`, 'i'),
  });

  if (existing) {
    throw new AppError(`Department '${departmentName}' already exists in this Gaushala`, 409);
  }

  return Department.create({
    gaushalaId,
    departmentName: departmentName.trim(),
    departmentCode: departmentCode || '',
    description: description || '',
    isActive: isActive !== undefined ? isActive : true,
    isDelete: false,
  });
};

const getDepartments = async (filter = {}) => {
  const query = { isDelete: false };

  if (filter.gaushalaId) {
    query.gaushalaId = filter.gaushalaId;
  }
  if (filter.isActive !== undefined) {
    query.isActive = filter.isActive;
  }
  if (filter.search) {
    query.departmentName = { $regex: filter.search.trim(), $options: 'i' };
  }

  const departments = await Department.find(query)
    .populate('gaushalaId', 'gaushalaName')
    .sort({ departmentName: 1 })
    .lean();

  // Attach worker count breakdown to each department
  const departmentIds = departments.map((d) => d._id);
  const workerCounts = await Worker.aggregate([
    {
      $match: {
        departmentId: { $in: departmentIds },
        isDelete: false,
      },
    },
    {
      $group: {
        _id: '$departmentId',
        totalWorkers: { $sum: 1 },
        activeWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        inactiveWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
        },
      },
    },
  ]);

  const countsMap = {};
  for (const c of workerCounts) {
    countsMap[c._id.toString()] = {
      totalWorkers: c.totalWorkers,
      activeWorkers: c.activeWorkers,
      inactiveWorkers: c.inactiveWorkers,
    };
  }

  return departments.map((d) => ({
    ...d,
    workerStats: countsMap[d._id.toString()] || {
      totalWorkers: 0,
      activeWorkers: 0,
      inactiveWorkers: 0,
    },
  }));
};

const getDepartmentById = async (id) => {
  const department = await Department.findOne({ _id: id, isDelete: false })
    .populate('gaushalaId', 'gaushalaName');

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Get count stats
  const [stats] = await Worker.aggregate([
    {
      $match: {
        departmentId: department._id,
        isDelete: false,
      },
    },
    {
      $group: {
        _id: '$departmentId',
        totalWorkers: { $sum: 1 },
        activeWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        inactiveWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
        },
      },
    },
  ]);

  const deptObj = department.toObject();
  deptObj.workerStats = stats || { totalWorkers: 0, activeWorkers: 0, inactiveWorkers: 0 };
  return deptObj;
};

const updateDepartment = async (id, updateData) => {
  const department = await Department.findOne({ _id: id, isDelete: false });
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  if (updateData.departmentName && updateData.departmentName !== department.departmentName) {
    const duplicate = await Department.findOne({
      gaushalaId: department.gaushalaId,
      _id: { $ne: department._id },
      isDelete: false,
      departmentName: new RegExp(`^${updateData.departmentName.trim()}$`, 'i'),
    });
    if (duplicate) {
      throw new AppError(`Department '${updateData.departmentName}' already exists in this Gaushala`, 409);
    }
    department.departmentName = updateData.departmentName.trim();
  }

  if (updateData.departmentCode !== undefined) {
    department.departmentCode = updateData.departmentCode;
  }
  if (updateData.description !== undefined) {
    department.description = updateData.description;
  }
  if (updateData.isActive !== undefined) {
    department.isActive = updateData.isActive;
  }

  await department.save();
  return department.populate('gaushalaId', 'gaushalaName');
};

const deleteDepartment = async (id, userId = null) => {
  const department = await Department.findOne({ _id: id, isDelete: false });
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if any active or registered workers are in this department
  const existingWorker = await Worker.exists({
    departmentId: department._id,
    isDelete: false,
  });

  if (existingWorker) {
    throw new AppError('Cannot delete department because workers are assigned to it. Please reassign or remove the workers first.', 409);
  }

  department.isDelete = true;
  department.isActive = false;
  department.deletedBy = userId;
  await department.save();

  return department;
};

// ==========================================
// WORKER SERVICE
// ==========================================

const createWorker = async (workerData) => {
  const { gaushalaId, departmentId, name, joiningDate, leavingDate, isActive } = workerData;

  const gaushala = await Gaushala.findById(gaushalaId);
  if (!gaushala) {
    throw new AppError('Gaushala not found', 404);
  }

  const department = await Department.findOne({
    _id: departmentId,
    gaushalaId,
    isDelete: false,
  });
  if (!department) {
    throw new AppError('Department not found or does not belong to this Gaushala', 404);
  }

  const worker = await Worker.create({
    gaushalaId,
    departmentId,
    name: name.trim(),
    joiningDate: joiningDate || new Date(),
    leavingDate: leavingDate || null,
    isActive: leavingDate ? false : (isActive !== undefined ? isActive : true),
    isDelete: false,
    deletedBy: null,
  });

  return worker.populate([
    { path: 'gaushalaId', select: 'gaushalaName' },
    { path: 'departmentId', select: 'departmentName departmentCode' },
  ]);
};

const getWorkers = async (filter = {}) => {
  const query = { isDelete: false };

  if (filter.gaushalaId) {
    query.gaushalaId = filter.gaushalaId;
  }
  if (filter.departmentId) {
    query.departmentId = filter.departmentId;
  }
  if (filter.isActive !== undefined) {
    query.isActive = filter.isActive;
  }
  if (filter.search) {
    query.name = { $regex: filter.search.trim(), $options: 'i' };
  }

  const page = Math.max(1, parseInt(filter.page, 10) || 1);
  const limit = Math.max(1, parseInt(filter.limit, 10) || 50);
  const skip = (page - 1) * limit;

  const [totalCount, workers] = await Promise.all([
    Worker.countDocuments(query),
    Worker.find(query)
      .populate('gaushalaId', 'gaushalaName')
      .populate('departmentId', 'departmentName departmentCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    workers,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

const getWorkerById = async (id) => {
  const worker = await Worker.findOne({ _id: id, isDelete: false })
    .populate('gaushalaId', 'gaushalaName')
    .populate('departmentId', 'departmentName departmentCode');

  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  return worker;
};

const updateWorker = async (id, updateData) => {
  const worker = await Worker.findOne({ _id: id, isDelete: false });
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  if (updateData.name !== undefined) {
    worker.name = updateData.name.trim();
  }

  if (updateData.departmentId && updateData.departmentId.toString() !== worker.departmentId.toString()) {
    const department = await Department.findOne({
      _id: updateData.departmentId,
      gaushalaId: worker.gaushalaId,
      isDelete: false,
    });
    if (!department) {
      throw new AppError('Target department not found or does not belong to this Gaushala', 404);
    }
    worker.departmentId = updateData.departmentId;
  }

  if (updateData.joiningDate !== undefined) {
    worker.joiningDate = updateData.joiningDate;
  }

  if (updateData.leavingDate !== undefined) {
    worker.leavingDate = updateData.leavingDate;
    if (updateData.leavingDate) {
      // When worker leaves gaushala, isActive becomes false, isDelete remains false
      worker.isActive = false;
      worker.isDelete = false;
    }
  }

  // Admin updating active / deactive status
  if (updateData.isActive !== undefined) {
    worker.isActive = updateData.isActive;
    if (!updateData.isActive) {
      // If deactivating, ensure isDelete is false
      worker.isDelete = false;
      if (!worker.leavingDate && updateData.leavingDate === undefined) {
        worker.leavingDate = new Date();
      }
    } else {
      // If reactivating worker
      worker.leavingDate = null;
    }
  }

  await worker.save();

  return worker.populate([
    { path: 'gaushalaId', select: 'gaushalaName' },
    { path: 'departmentId', select: 'departmentName departmentCode' },
  ]);
};

const markWorkerLeft = async (id, leavingDate = new Date()) => {
  const worker = await Worker.findOne({ _id: id, isDelete: false });
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  // When user will leave gaushala, the isActive Flag will become false, isDelete flag will become false
  worker.leavingDate = leavingDate;
  worker.isActive = false;
  worker.isDelete = false;

  await worker.save();

  return worker.populate([
    { path: 'gaushalaId', select: 'gaushalaName' },
    { path: 'departmentId', select: 'departmentName departmentCode' },
  ]);
};

const toggleWorkerStatus = async (id, isActive) => {
  const worker = await Worker.findOne({ _id: id, isDelete: false });
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  worker.isActive = Boolean(isActive);
  if (!worker.isActive) {
    // When deactivated / left gaushala
    worker.isDelete = false;
    if (!worker.leavingDate) {
      worker.leavingDate = new Date();
    }
  } else {
    // Reactivated
    worker.leavingDate = null;
  }

  await worker.save();

  return worker.populate([
    { path: 'gaushalaId', select: 'gaushalaName' },
    { path: 'departmentId', select: 'departmentName departmentCode' },
  ]);
};

const deleteWorker = async (id, userId = null) => {
  const worker = await Worker.findOne({ _id: id, isDelete: false });
  if (!worker) {
    throw new AppError('Worker not found', 404);
  }

  worker.isDelete = true;
  worker.isActive = false;
  worker.deletedBy = userId;

  await worker.save();

  return worker;
};

const getDepartmentWiseSummary = async (gaushalaId) => {
  if (!gaushalaId) {
    throw new AppError('gaushalaId is required', 400);
  }

  const gaushalaObjectId = new mongoose.Types.ObjectId(gaushalaId);

  const departments = await Department.find({
    gaushalaId: gaushalaObjectId,
    isDelete: false,
  }).sort({ departmentName: 1 }).lean();

  const workerSummary = await Worker.aggregate([
    {
      $match: {
        gaushalaId: gaushalaObjectId,
        isDelete: false,
      },
    },
    {
      $group: {
        _id: '$departmentId',
        totalWorkers: { $sum: 1 },
        activeWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        leftOrInactiveWorkers: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
        },
      },
    },
  ]);

  const summaryMap = {};
  for (const s of workerSummary) {
    summaryMap[s._id.toString()] = {
      totalWorkers: s.totalWorkers,
      activeWorkers: s.activeWorkers,
      leftOrInactiveWorkers: s.leftOrInactiveWorkers,
    };
  }

  let overallTotal = 0;
  let overallActive = 0;
  let overallInactive = 0;

  const departmentBreakdown = departments.map((d) => {
    const stats = summaryMap[d._id.toString()] || {
      totalWorkers: 0,
      activeWorkers: 0,
      leftOrInactiveWorkers: 0,
    };
    overallTotal += stats.totalWorkers;
    overallActive += stats.activeWorkers;
    overallInactive += stats.leftOrInactiveWorkers;

    return {
      departmentId: d._id,
      departmentName: d.departmentName,
      departmentCode: d.departmentCode,
      isActive: d.isActive,
      ...stats,
    };
  });

  return {
    gaushalaId,
    overall: {
      totalDepartments: departments.length,
      totalWorkers: overallTotal,
      activeWorkers: overallActive,
      leftOrInactiveWorkers: overallInactive,
    },
    departments: departmentBreakdown,
  };
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  markWorkerLeft,
  toggleWorkerStatus,
  deleteWorker,
  getDepartmentWiseSummary,
};
