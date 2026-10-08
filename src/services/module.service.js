const Module = require('../models/Module');
const AppError = require('../utils/AppError');

const DEFAULT_MODULES = require('../seeds/defaultModules.seed');

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
 * Bulk create or update modules dynamically via API.
 */
const bulkCreateModules = async (modulesList) => {
  if (!Array.isArray(modulesList) || modulesList.length === 0) {
    throw new AppError('A non-empty array of modules is required', 400);
  }

  const results = [];
  for (const item of modulesList) {
    const { name, code, description, subModules, isActive } = item;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Each module must have a valid name', 400);
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new AppError('Each module must have a valid code', 400);
    }

    const normalizedCode = code.trim().toUpperCase();
    const formattedSubModules = Array.isArray(subModules)
      ? subModules.map((s) => ({
          name: s.name?.trim(),
          code: s.code?.trim().toUpperCase(),
          description: s.description?.trim() || '',
          isActive: s.isActive !== undefined ? s.isActive : true,
        }))
      : [];

    let moduleDoc = await Module.findOne({ code: normalizedCode });
    if (moduleDoc) {
      moduleDoc.name = name.trim();
      if (description !== undefined) {
        moduleDoc.description = typeof description === 'string' ? description.trim() : '';
      }
      if (isActive !== undefined) {
        moduleDoc.isActive = Boolean(isActive);
      }

      const existingSubCodes = (moduleDoc.subModules || []).map((s) => s.code);
      for (const sub of formattedSubModules) {
        if (!existingSubCodes.includes(sub.code)) {
          moduleDoc.subModules.push(sub);
        }
      }
      await moduleDoc.save();
      results.push(moduleDoc);
    } else {
      const created = await Module.create({
        name: name.trim(),
        code: normalizedCode,
        description: description?.trim() || '',
        subModules: formattedSubModules,
        isActive: isActive !== undefined ? isActive : true,
      });
      results.push(created);
    }
  }

  return results;
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
  bulkCreateModules,
  updateModule,
  deleteModule,
  addSubModule,
  removeSubModule,
  getDefaultPermissionsForUser,
  assignDefaultPermissions,
};
