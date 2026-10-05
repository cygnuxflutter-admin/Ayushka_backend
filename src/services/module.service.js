const Module = require('../models/Module');
const AppError = require('../utils/AppError');

const DEFAULT_MODULES = [
  {
    name: 'Cow Management',
    code: 'COW',
    description: 'Manage cow records and shed transfers',
    subModules: [
      { name: 'Cow Records', code: 'COW_LIST', description: 'View, add, edit, and delete cows' },
      { name: 'Shed Transfer', code: 'SHED_TRANSFER', description: 'Transfer cows and view history' },
    ],
  },
  {
    name: 'Shed Management',
    code: 'SHED',
    description: 'Manage sheds and sheds list',
    subModules: [
      { name: 'Shed Records', code: 'SHED_LIST', description: 'View, add, edit, and delete sheds' },
    ],
  },
  {
    name: 'Gaushala Management',
    code: 'GAUSHALA',
    description: 'Manage gaushalas',
    subModules: [
      { name: 'Gaushala Records', code: 'GAUSHALA_LIST', description: 'View, add, edit, and delete gaushalas' },
    ],
  },
  {
    name: 'User Management',
    code: 'USER',
    description: 'Manage system users and statuses',
    subModules: [
      { name: 'User Records', code: 'USER_LIST', description: 'View, add, edit, and delete users' },
    ],
  },
  {
    name: 'Role Management',
    code: 'ROLE',
    description: 'Manage user roles',
    subModules: [
      { name: 'Role Records', code: 'ROLE_LIST', description: 'View, add, edit, and delete roles' },
    ],
  },
  {
    name: 'Breed Type Management',
    code: 'BREED_TYPE',
    description: 'Manage cattle breed types',
    subModules: [
      { name: 'Breed Type Records', code: 'BREED_TYPE_LIST', description: 'View, add, edit, and delete breed types' },
    ],
  },
  {
    name: 'Cattle Type Management',
    code: 'TYPE',
    description: 'Manage cattle types',
    subModules: [
      { name: 'Cattle Type Records', code: 'TYPE_LIST', description: 'View, add, edit, and delete cattle types' },
    ],
  },
  {
    name: 'Feed & Fodder Management',
    code: 'FEED_STOCK',
    description: 'Manage cow chara/feed items and stock transactions',
    subModules: [
      { name: 'Feed Items', code: 'FEED_ITEMS', description: 'View, add, edit, and delete feed items' },
      { name: 'Stock Transactions', code: 'STOCK_TRANSACTION', description: 'Record inward, outward, and wastage transactions' },
    ],
  },
  {
    name: 'Medical Stock Management',
    code: 'MEDICAL_STOCK',
    description: 'Manage veterinary medicine inventory and stock ledger',
    subModules: [
      { name: 'Medical Items', code: 'MEDICAL_ITEMS', description: 'View, add, edit, and delete medical items' },
      { name: 'Stock Transactions', code: 'STOCK_TRANSACTION', description: 'Record inward, outward, and disposal transactions' },
    ],
  },
  {
    name: 'Cow Treatment Management',
    code: 'TREATMENT',
    description: 'Manage cow treatments, multi-dose schedules, and veterinary records',
    subModules: [
      { name: 'Treatment Records', code: 'TREATMENT_LIST', description: 'View, add, edit, and manage cow treatments' },
      { name: 'Dose Schedules & Alerts', code: 'DOSE_SCHEDULE', description: 'Manage dose schedules and administer doses' },
    ],
  },
  {
    name: 'Staff & Worker Management',
    code: 'WORKER_MGMT',
    description: 'Manage departments and worker records department-wise',
    subModules: [
      { name: 'Department Records', code: 'DEPARTMENT_LIST', description: 'View, add, edit, and delete departments' },
      { name: 'Worker Records', code: 'WORKER_LIST', description: 'View, add, edit, and manage department-wise worker records' },
    ],
  },
  {
    name: 'Milk Production & Distribution',
    code: 'MILK_MGMT',
    description: 'Manage daily cow milk production, distribution, leftover stock, and disposal',
    subModules: [
      { name: 'Milk Production', code: 'MILK_PRODUCTION', description: 'Record cow-wise daily milk production and alerts' },
      { name: 'Milk Distribution', code: 'MILK_DISTRIBUTION', description: 'Manage milk distribution, fridge stock, and disposal' },
    ],
  },
];

/**
 * Seed default modules if they do not exist yet.
 */
const seedDefaultModules = async () => {
  for (const item of DEFAULT_MODULES) {
    const existing = await Module.findOne({ code: item.code });
    if (!existing) {
      await Module.create(item);
    } else {
      // Ensure missing submodules are added
      let modified = false;
      const existingSubCodes = (existing.subModules || []).map((s) => s.code);
      for (const sub of item.subModules || []) {
        if (!existingSubCodes.includes(sub.code)) {
          existing.subModules.push(sub);
          modified = true;
        }
      }
      if (modified) {
        await existing.save();
      }
    }
  }
};

/**
 * Fetch all modules.
 */
const getAllModules = async (filter = {}) => {
  return Module.find(filter).sort({ name: 1 });
};

/**
 * Fetch a module by id.
 */
const getModuleById = async (id) => {
  const moduleDoc = await Module.findById(id);
  if (!moduleDoc) {
    throw new AppError('Module not found', 404);
  }
  return moduleDoc;
};

/**
 * Create a new module dynamically.
 */
const createModule = async (data) => {
  const { name, code, description, subModules, isActive } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Module name is required', 400);
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new AppError('Module code is required', 400);
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await Module.findOne({ code: normalizedCode });
  if (existing) {
    throw new AppError(`Module with code '${normalizedCode}' already exists`, 409);
  }

  const formattedSubModules = Array.isArray(subModules)
    ? subModules.map((s) => ({
        name: s.name?.trim(),
        code: s.code?.trim().toUpperCase(),
        description: s.description?.trim() || '',
        isActive: s.isActive !== undefined ? s.isActive : true,
      }))
    : [];

  // Validate submodules
  for (const sm of formattedSubModules) {
    if (!sm.name || !sm.code) {
      throw new AppError('Each sub-module must have a valid name and code', 400);
    }
  }

  return Module.create({
    name: name.trim(),
    code: normalizedCode,
    description: description?.trim() || '',
    subModules: formattedSubModules,
    isActive: isActive !== undefined ? isActive : true,
  });
};

/**
 * Update an existing module.
 */
const updateModule = async (id, data) => {
  const moduleDoc = await getModuleById(id);

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Module name cannot be empty', 400);
    }
    moduleDoc.name = data.name.trim();
  }

  if (data.description !== undefined) {
    moduleDoc.description = typeof data.description === 'string' ? data.description.trim() : '';
  }

  if (data.isActive !== undefined) {
    moduleDoc.isActive = Boolean(data.isActive);
  }

  if (Array.isArray(data.subModules)) {
    moduleDoc.subModules = data.subModules.map((s) => ({
      name: s.name?.trim(),
      code: s.code?.trim().toUpperCase(),
      description: s.description?.trim() || '',
      isActive: s.isActive !== undefined ? s.isActive : true,
    }));
  }

  await moduleDoc.save();
  return moduleDoc;
};

/**
 * Delete a module.
 */
const deleteModule = async (id) => {
  const moduleDoc = await getModuleById(id);
  await Module.deleteOne({ _id: moduleDoc._id });
  return moduleDoc;
};

/**
 * Add a sub-module to an existing module.
 */
const addSubModule = async (moduleId, subModuleData) => {
  const moduleDoc = await getModuleById(moduleId);

  const { name, code, description } = subModuleData;
  if (!name || !code) {
    throw new AppError('Sub-module name and code are required', 400);
  }

  const normalizedCode = code.trim().toUpperCase();
  const alreadyExists = moduleDoc.subModules.some((s) => s.code === normalizedCode);
  if (alreadyExists) {
    throw new AppError(`Sub-module with code '${normalizedCode}' already exists in this module`, 409);
  }

  moduleDoc.subModules.push({
    name: name.trim(),
    code: normalizedCode,
    description: description?.trim() || '',
    isActive: true,
  });

  await moduleDoc.save();
  return moduleDoc;
};

/**
 * Remove a sub-module from an existing module.
 */
const removeSubModule = async (moduleId, subModuleCode) => {
  const moduleDoc = await getModuleById(moduleId);
  const normalizedCode = subModuleCode.trim().toUpperCase();

  moduleDoc.subModules = moduleDoc.subModules.filter((s) => s.code !== normalizedCode);
  await moduleDoc.save();
  return moduleDoc;
};

/**
 * Generate default (false) permissions for all active modules and sub-modules.
 */
const getDefaultPermissionsForUser = async () => {
  const allModules = await Module.find({ isActive: true }).sort({ name: 1 });
  const defaultPermissions = [];

  for (const mod of allModules) {
    for (const sub of mod.subModules || []) {
      defaultPermissions.push({
        moduleId: mod._id,
        moduleCode: mod.code,
        subModuleCode: sub.code,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      });
    }
  }

  return defaultPermissions;
};

/**
 * Assign default false permissions to a user across all active modules.
 */
const assignDefaultPermissions = async (userId) => {
  const UserPermission = require('../models/UserPermission');
  const existing = await UserPermission.findOne({ userId });
  if (existing && Array.isArray(existing.permissions) && existing.permissions.length > 0) {
    return existing;
  }

  const defaultPermissions = await getDefaultPermissionsForUser();
  return UserPermission.findOneAndUpdate(
    { userId },
    {
      userId,
      permissions: defaultPermissions,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
};

module.exports = {
  seedDefaultModules,
  getAllModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  addSubModule,
  removeSubModule,
  getDefaultPermissionsForUser,
  assignDefaultPermissions,
};
