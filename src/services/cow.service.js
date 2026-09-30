const mongoose = require('mongoose');
const Cow = require('../models/cow.model');
const BreedType = require('../models/BreedType');
const Gaushala = require('../models/Gaushala');
const Type = require('../models/Type');
const Shed = require('../models/Shed');
const User = require('../models/User');
const ShedTransferHistory = require('../models/ShedTransferHistory');
const AppError = require('../utils/AppError');

/**
 * Service to add a new cow.
 * Performs reference checks, uniqueness verification, creation, and population.
 *
 * @param {Object} cowData Validated cow data
 * @returns {Promise<Object>} Populated cow document
 */
const addCow = async (cowData) => {
  // 1. Verify referenced documents exist in MongoDB
  const [breedExists, gaushalaExists, typeExists, userExists] = await Promise.all([
    BreedType.findById(cowData.breed),
    Gaushala.findById(cowData.gaushala_id),
    Type.findById(cowData.type),
    User.findOne({ _id: cowData.addedBy, isDeleted: false }),
  ]);

  if (!breedExists) {
    throw new AppError('Breed type not found', 404);
  }
  if (!gaushalaExists) {
    throw new AppError('Gaushala not found', 404);
  }
  if (!typeExists) {
    throw new AppError('Cow type not found', 404);
  }
  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  // Validate optional references if provided
  if (cowData.shed_id) {
    const shedExists = await Shed.findById(cowData.shed_id);
    if (!shedExists) {
      throw new AppError('Shed not found', 404);
    }
    if (
      shedExists.gaushalaId &&
      shedExists.gaushalaId.toString() !== cowData.gaushala_id.toString()
    ) {
      throw new AppError(
        'The provided shed does not belong to the selected gaushala',
        400,
      );
    }
  }

  if (cowData.dam_id) {
    const damExists = await Cow.findOne({ _id: cowData.dam_id, isDeleted: false });
    if (!damExists) {
      throw new AppError('Dam cow not found', 404);
    }
  }

  if (cowData.sair_id) {
    const sireExists = await Cow.findOne({ _id: cowData.sair_id, isDeleted: false });
    if (!sireExists) {
      throw new AppError('Sire cow not found', 404);
    }
  }

  // 2. Check duplicate tag_id for active cows
  const existingCow = await Cow.findOne({
    tag_id: cowData.tag_id,
    isDeleted: false,
  });
  if (existingCow) {
    throw new AppError('Cow with this tag ID already exists', 409);
  }

  // 3. Create Cow document (handling potential E11000 duplicate key race condition)
  let createdCow;
  try {
    createdCow = await Cow.create({
      breed: cowData.breed,
      gaushala_id: cowData.gaushala_id,
      type: cowData.type,
      shed_id: cowData.shed_id || null,
      tag_id: cowData.tag_id,
      dob: cowData.dob || '',
      calf_name: cowData.calf_name || '',
      isFemale: cowData.isFemale,
      isDeleted: false,
      addedBy: cowData.addedBy,
      calf_weight: cowData.calf_weight ?? 0,
      avatarUrl: cowData.avatarUrl || '',
      dam_id: cowData.dam_id || null,
      sair_id: cowData.sair_id || null,
      delivery_time: cowData.delivery_time || '',
      send_died_date: cowData.send_died_date || '',
      purchase_date: cowData.purchase_date || '',
      remark: cowData.remark || '',
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Cow with this tag ID already exists', 409);
    }
    throw error;
  }

  // 4. Populate related documents (excluding sensitive User credentials)
  const populatedCow = await Cow.findById(createdCow._id)
    .populate('breed')
    .populate('gaushala_id')
    .populate('type')
    .populate('shed_id')
    .populate('addedBy', 'name username emailId roleId gaushalaId')
    .populate('dam_id')
    .populate('sair_id');


  const populatedObj = populatedCow?.toObject ? populatedCow.toObject() : populatedCow;

  return {
    ...populatedObj,
  };
};

/**
 * Helper to construct Cow filter query
 */
const buildCowQuery = (query = {}) => {
  const { gaushala_id, shed_id, breed, type, isActive, isDelete, isDeleted, isDied, search } = query;
  const baseQuery = {};

  if (gaushala_id) baseQuery.gaushala_id = gaushala_id;
  if (shed_id) baseQuery.shed_id = shed_id;
  if (breed) baseQuery.breed = breed;
  if (type) baseQuery.type = type;

  // Active status filter (if 'true'/'false'/boolean, omitted or 'all' includes all)
  if (typeof isActive !== 'undefined' && isActive !== 'all' && isActive !== '') {
    baseQuery.isActive = isActive === 'true' || isActive === true;
  }

  // Delete status filter (if 'true'/'false'/boolean, omitted or 'all' includes all)
  const deleteVal = typeof isDelete !== 'undefined' ? isDelete : isDeleted;
  if (typeof deleteVal !== 'undefined' && deleteVal !== 'all' && deleteVal !== '') {
    const isDel = deleteVal === 'true' || deleteVal === true;
    if (isDel) {
      baseQuery.$or = [{ isDelete: true }, { isDeleted: true }];
    } else {
      baseQuery.isDelete = { $ne: true };
      baseQuery.isDeleted = { $ne: true };
    }
  }

  // Died status filter (if 'true'/'false'/boolean, omitted or 'all' includes all)
  if (typeof isDied !== 'undefined' && isDied !== 'all' && isDied !== '') {
    const isDiedVal = isDied === 'true' || isDied === true;
    if (isDiedVal) {
      baseQuery.isDied = true;
    } else {
      baseQuery.isDied = { $ne: true };
    }
  }

  // Search by tag_id or calf_name if provided
  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    if (baseQuery.$or) {
      baseQuery.$and = [
        { $or: baseQuery.$or },
        { $or: [{ tag_id: searchRegex }, { calf_name: searchRegex }] },
      ];
      delete baseQuery.$or;
    } else {
      baseQuery.$or = [
        { tag_id: searchRegex },
        { calf_name: searchRegex },
      ];
    }
  }

  return baseQuery;
};

/**
 * Helper to calculate total, female (cow), and male (bull) counts.
 *
 * @param {string|null} gaushala_id Optional Gaushala ID to scope counts
 * @param {Object} filterQuery Filter parameters
 * @returns {Promise<{ total: number, female: number, male: number, cow: number, bull: number }>}
 */
const getCowCounts = async (gaushala_id = null, filterQuery = {}) => {
  const baseQuery = buildCowQuery({ ...filterQuery, gaushala_id });

  const [femaleCount, maleCount] = await Promise.all([
    Cow.countDocuments({ ...baseQuery, isFemale: true }),
    Cow.countDocuments({ ...baseQuery, isFemale: false }),
  ]);

  const total = femaleCount + maleCount;

  return {
    total,
    female: femaleCount,
    male: maleCount,
    cow: femaleCount,
    bull: maleCount,
  };
};

/**
 * Service to fetch cows grouped by gender or filtered by gender, including total counts.
 *
 * @param {Object} query Query params (gender, gaushala_id, shed_id, breed, type, isDelete, etc.)
 * @returns {Promise<{ total: number, femaleCount: number, maleCount: number, counts: Object, female: Array, male: Array }>}
 */
const getCowsByGender = async (query = {}) => {
  const { gender, gaushala_id } = query;
  const baseQuery = buildCowQuery(query);

  const populateOptions = [
    { path: 'breed' },
    { path: 'gaushala_id' },
    { path: 'type' },
    { path: 'shed_id' },
    { path: 'addedBy', select: 'name username emailId roleId gaushalaId' },
    { path: 'dam_id' },
    { path: 'sair_id' },
  ];

  const normalizedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : '';

  const [female, male, counts] = await Promise.all([
    normalizedGender === 'male' || normalizedGender === 'false'
      ? Promise.resolve([])
      : Cow.find({ ...baseQuery, isFemale: true })
          .populate(populateOptions)
          .sort({ createdAt: -1 }),
    normalizedGender === 'female' || normalizedGender === 'true'
      ? Promise.resolve([])
      : Cow.find({ ...baseQuery, isFemale: false })
          .populate(populateOptions)
          .sort({ createdAt: -1 }),
    getCowCounts(gaushala_id, query),
  ]);

  return {
    total: counts.total,
    femaleCount: counts.female,
    maleCount: counts.male,
    counts,
    female,
    male,
  };
};

const XLSX = require('xlsx');

const parseDateValue = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return String(val).trim();
};

const parseBooleanField = (val) => {
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  if (['true', 'female', 'f', 'cow', '1', 'yes'].includes(str)) return true;
  if (['false', 'male', 'm', 'bull', '0', 'no'].includes(str)) return false;
  return null;
};

/**
 * Service to import multiple cows from an Excel or CSV buffer.
 *
 * @param {Object} options Options containing fileBuffer, addedBy, and defaultGaushalaId
 * @returns {Promise<{ totalRows: number, importedCount: number, failedCount: number, imported: Array, errors: Array }>}
 */
const importCowsFromExcel = async ({ fileBuffer, addedBy, defaultGaushalaId = null }) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new AppError('A valid Excel file buffer is required', 400);
  }

  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new AppError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.', 400);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AppError('The Excel file does not contain any sheets', 400);
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  // Filter out completely blank rows
  const rows = rawRows.filter((row) => {
    const nonBlankValues = Object.values(row).filter((v) => {
      if (v === '' || v === null || v === undefined) return false;
      if (typeof v === 'string' && v.trim() === '') return false;
      return true;
    });
    return nonBlankValues.length > 0;
  });

  if (!rows || rows.length === 0) {
    throw new AppError('No any data in excel', 400);
  }

  // Preload DB collections including ALL existing tag IDs (both active & deleted)
  const [allGaushalas, allBreeds, allTypes, allSheds, existingCows] = await Promise.all([
    Gaushala.find(),
    BreedType.find(),
    Type.find(),
    Shed.find(),
    Cow.find({}, 'tag_id'),
  ]);

  const existingTagSet = new Set(
    existingCows
      .map((c) => (c.tag_id ? String(c.tag_id).trim().toUpperCase() : null))
      .filter(Boolean),
  );
  const newTagSet = new Set();

  const imported = [];
  const errors = [];
  const validCowsToInsert = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // Excel row number (1-based + 1 header)
    const row = rows[i];

    // 1. tag_id (Required)
    const tag_id = String(row.tag_id || row.tagId || row['Tag ID'] || row['Tag'] || row['tag_id'] || '').trim();
    if (!tag_id) {
      errors.push({ row: rowNumber, tag_id: 'N/A', error: 'tag_id is required' });
      continue;
    }

    const tagUpper = tag_id.toUpperCase();

    // Skip sample/template placeholder rows if user kept them in the sheet
    if (tagUpper.startsWith('SAMPLE-') || tagUpper.startsWith('SAMPLE_') || tagUpper === 'SAMPLE') {
      continue;
    }

    if (existingTagSet.has(tagUpper) || newTagSet.has(tagUpper)) {
      errors.push({ row: rowNumber, tag_id, error: 'Cow with this tag ID already exists' });
      continue;
    }

    // 2. isFemale / Gender (Required)
    const rawGender = row.isFemale ?? row['isFemale'] ?? row['is_female'] ?? row['Gender'] ?? row['gender'] ?? '';
    const isFemale = parseBooleanField(rawGender);
    if (isFemale === null) {
      errors.push({ row: rowNumber, tag_id, error: 'isFemale/gender is required (true/female or false/male)' });
      continue;
    }

    // 3. Gaushala (Required)
    const rawGaushala = String(
      row.gaushala ||
      row.gaushalaId ||
      row.gaushala_id ||
      row['Gaushala'] ||
      row['gaushala'] ||
      row['gaushalaId'] ||
      defaultGaushalaId ||
      '',
    ).trim();
    if (!rawGaushala) {
      errors.push({ row: rowNumber, tag_id, error: 'gaushala is required' });
      continue;
    }

    const matchedGaushala = allGaushalas.find(
      (g) =>
        g._id.toString() === rawGaushala ||
        g.gaushalaName.toLowerCase() === rawGaushala.toLowerCase() ||
        g.gaushalaName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_') === rawGaushala.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_'),
    );
    if (!matchedGaushala) {
      errors.push({ row: rowNumber, tag_id, error: `Gaushala '${rawGaushala}' not found` });
      continue;
    }

    // 4. Breed (Required)
    const rawBreed = String(row.breed || row.breedName || row.breed_id || row['Breed'] || row['breed'] || '').trim();
    if (!rawBreed) {
      errors.push({ row: rowNumber, tag_id, error: 'breed is required' });
      continue;
    }

    const matchedBreed = allBreeds.find(
      (b) => b._id.toString() === rawBreed || b.breedName.toLowerCase() === rawBreed.toLowerCase(),
    );
    if (!matchedBreed) {
      errors.push({ row: rowNumber, tag_id, error: `Breed '${rawBreed}' not found` });
      continue;
    }

    // 5. Type (Required)
    const rawType = String(row.type || row.typeName || row.type_id || row['Type'] || row['type'] || '').trim();
    if (!rawType) {
      errors.push({ row: rowNumber, tag_id, error: 'type is required' });
      continue;
    }

    const matchedType = allTypes.find(
      (t) => t._id.toString() === rawType || t.typeName.toLowerCase() === rawType.toLowerCase(),
    );
    if (!matchedType) {
      errors.push({ row: rowNumber, tag_id, error: `Cow type '${rawType}' not found` });
      continue;
    }

    // 6. Shed (Optional, but if provided, must belong to gaushala)
    const rawShed = String(
      row.shedNumber ||
      row.shed_number ||
      row.shedName ||
      row.shed_name ||
      row.shed_id ||
      row.shed ||
      row['Shed'] ||
      row['shedNumber'] ||
      '',
    ).trim();
    let matchedShed = null;
    if (rawShed && rawShed.toLowerCase() !== 'no_shed') {
      matchedShed = allSheds.find((s) => {
        const isGaushalaMatch = s.gaushalaId?.toString() === matchedGaushala._id.toString();
        const isShedMatch =
          s._id.toString() === rawShed ||
          s.shedNumber.toLowerCase() === rawShed.toLowerCase() ||
          s.shedName.toLowerCase() === rawShed.toLowerCase();
        return isShedMatch && isGaushalaMatch;
      });

      if (!matchedShed) {
        // Check if shed exists in another gaushala
        const shedInOtherGaushala = allSheds.find(
          (s) =>
            s._id.toString() === rawShed ||
            s.shedNumber.toLowerCase() === rawShed.toLowerCase() ||
            s.shedName.toLowerCase() === rawShed.toLowerCase(),
        );
        if (shedInOtherGaushala) {
          errors.push({
            row: rowNumber,
            tag_id,
            error: 'The provided shed does not belong to the selected gaushala',
          });
          continue;
        } else {
          errors.push({ row: rowNumber, tag_id, error: `Shed '${rawShed}' not found` });
          continue;
        }
      }
    }

    // 7. Optional fields
    const calf_name = String(row.calf_name || row.calfName || row['Name'] || row['calf_name'] || '').trim();
    const calf_weight = !isNaN(Number(row.calf_weight ?? row.calfWeight)) ? Number(row.calf_weight ?? row.calfWeight) : 0;
    const dob = parseDateValue(row.dob || row.DOB);
    const purchase_date = parseDateValue(row.purchase_date || row.purchaseDate);
    const delivery_time = String(row.delivery_time || row.deliveryTime || '').trim();
    const remark = String(row.remark || row.remarks || row['Remark'] || row['Remarks'] || '').trim();

    newTagSet.add(tagUpper);

    validCowsToInsert.push({
      breed: matchedBreed._id,
      gaushala_id: matchedGaushala._id,
      type: matchedType._id,
      shed_id: matchedShed ? matchedShed._id : null,
      tag_id,
      calf_name,
      isFemale,
      addedBy,
      calf_weight,
      dob,
      purchase_date,
      delivery_time,
      remark,
      isActive: true,
      isDelete: false,
      isDeleted: false,
      isDied: false,
      rowNumber,
    });
  }

  if (validCowsToInsert.length > 0) {
    try {
      const docsToInsert = validCowsToInsert.map(({ rowNumber, ...doc }) => doc);
      const insertedCows = await Cow.insertMany(docsToInsert, { ordered: false });
      for (let j = 0; j < insertedCows.length; j++) {
        imported.push({
          row: validCowsToInsert[j].rowNumber,
          tag_id: insertedCows[j].tag_id,
          calf_name: insertedCows[j].calf_name,
          _id: insertedCows[j]._id,
          status: 'Imported',
        });
      }
    } catch (insertErr) {
      if (insertErr.insertedDocs && insertErr.insertedDocs.length > 0) {
        for (const doc of insertErr.insertedDocs) {
          const original = validCowsToInsert.find((v) => v.tag_id === doc.tag_id);
          imported.push({
            row: original ? original.rowNumber : 'N/A',
            tag_id: doc.tag_id,
            calf_name: doc.calf_name,
            _id: doc._id,
            status: 'Imported',
          });
        }
      }
      if (insertErr.writeErrors && insertErr.writeErrors.length > 0) {
        for (const writeErr of insertErr.writeErrors) {
          const failedDoc = validCowsToInsert[writeErr.index];
          errors.push({
            row: failedDoc ? failedDoc.rowNumber : writeErr.index + 2,
            tag_id: failedDoc ? failedDoc.tag_id : 'N/A',
            error: writeErr.code === 11000 ? 'Cow with this tag ID already exists' : (writeErr.errmsg || 'Failed to insert cow'),
          });
        }
      } else if (!insertErr.insertedDocs || insertErr.insertedDocs.length === 0) {
        throw insertErr;
      }
    }
  }

  return {
    totalRows: rows.length,
    importedCount: imported.length,
    failedCount: errors.length,
    imported,
    errors,
  };
};

const ExcelJS = require('exceljs');

/**
 * Service to dynamically generate an Excel template pre-loaded with
 * Dropdown data validation for breeds, cow types, gaushalas, and sheds.
 *
 * @param {Object} options Optional gaushalaId filter
 * @returns {Promise<Buffer>} Excel file buffer
 */
const generateCowImportTemplate = async ({ gaushalaId = null } = {}) => {
  const [allGaushalas, allBreeds, allTypes, allSheds] = await Promise.all([
    Gaushala.find().sort({ gaushalaName: 1 }),
    BreedType.find().sort({ breedName: 1 }),
    Type.find().sort({ typeName: 1 }),
    Shed.find().populate('gaushalaId', 'gaushalaName').sort({ shedNumber: 1 }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ayushka Gaushala System';
  workbook.created = new Date();

  // 1. Data Entry Sheet
  const worksheet = workbook.addWorksheet('Cows_Template', {
    views: [{ showGridLines: true }],
  });

  worksheet.columns = [
    { header: 'tag_id', key: 'tag_id', width: 16 },
    { header: 'calf_name', key: 'calf_name', width: 18 },
    { header: 'isFemale', key: 'isFemale', width: 14 },
    { header: 'breed', key: 'breed', width: 18 },
    { header: 'type', key: 'type', width: 18 },
    { header: 'gaushala', key: 'gaushala', width: 26 },
    { header: 'shedNumber', key: 'shedNumber', width: 22 },
    { header: 'dob', key: 'dob', width: 15 },
    { header: 'calf_weight', key: 'calf_weight', width: 15 },
    { header: 'purchase_date', key: 'purchase_date', width: 16 },
    { header: 'delivery_time', key: 'delivery_time', width: 16 },
    { header: 'remark', key: 'remark', width: 35 },
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E88E5' }, // Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  });

  // Helper to convert column index (1-based) to Excel column letters (A, B, ..., Z, AA, AB, ...)
  const getColLetter = (colIdx) => {
    let letter = '';
    let temp = colIdx;
    while (temp > 0) {
      const mod = (temp - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      temp = Math.floor((temp - mod) / 26);
    }
    return letter;
  };

  const sanitizeName = (name) => {
    return String(name || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
  };

  // 2. Reference Data Sheet (for Dropdowns)
  const refSheet = workbook.addWorksheet('Dropdown_Options', {
    views: [{ showGridLines: true }],
  });

  const genders = ['female', 'male'];
  const breedNames = allBreeds.map((b) => b.breedName).filter(Boolean);
  const typeNames = allTypes.map((t) => t.typeName).filter(Boolean);
  const gaushalaNames = allGaushalas.map((g) => g.gaushalaName).filter(Boolean);

  // Set initial columns for Gender, Breeds, Types, Gaushalas
  refSheet.getCell('A1').value = 'Gender';
  refSheet.getCell('B1').value = 'Breeds';
  refSheet.getCell('C1').value = 'Cow Types';
  refSheet.getCell('D1').value = 'Gaushalas';

  // Fill Gender
  genders.forEach((val, idx) => {
    refSheet.getCell(`A${idx + 2}`).value = val;
  });

  // Fill Breeds
  breedNames.forEach((val, idx) => {
    refSheet.getCell(`B${idx + 2}`).value = val;
  });

  // Fill Cow Types
  typeNames.forEach((val, idx) => {
    refSheet.getCell(`C${idx + 2}`).value = val;
  });

  // Fill Gaushalas
  gaushalaNames.forEach((val, idx) => {
    refSheet.getCell(`D${idx + 2}`).value = val;
  });

  // For each Gaushala, create a dedicated Sheds column and register an Excel Defined Name
  // This enables dynamic cascading dropdowns: Shed list changes based on selected Gaushala
  allGaushalas.forEach((g, gIdx) => {
    const colIdx = 5 + gIdx; // starts at Col E (5)
    const colLetter = getColLetter(colIdx);
    const sanitizedGName = sanitizeName(g.gaushalaName);

    refSheet.getCell(`${colLetter}1`).value = `Sheds_${sanitizedGName}`;

    // Find sheds belonging to this gaushala
    const gSheds = allSheds.filter((s) => {
      const gId = s.gaushalaId?._id ? s.gaushalaId._id.toString() : s.gaushalaId?.toString();
      return gId === g._id.toString();
    });

    const shedList = gSheds.map((s) => s.shedNumber).filter(Boolean);
    const listToInsert = shedList.length > 0 ? shedList : ['No_Shed'];

    listToInsert.forEach((shedNum, sIdx) => {
      refSheet.getCell(`${colLetter}${sIdx + 2}`).value = shedNum;
    });

    const endRow = listToInsert.length + 1;
    // Register Defined Name in workbook for Excel INDIRECT formula mapping
    workbook.definedNames.add(`Dropdown_Options!$${colLetter}$2:$${colLetter}$${endRow}`, sanitizedGName);
  });

  // Style reference header row
  const refHeader = refSheet.getRow(1);
  refHeader.height = 24;
  refHeader.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF455A64' }, // Grey-Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Define data validations on Cows_Template
  const genderRange = `Dropdown_Options!$A$2:$A$${genders.length + 1}`;
  const breedRange = breedNames.length > 0 ? `Dropdown_Options!$B$2:$B$${breedNames.length + 1}` : null;
  const typeRange = typeNames.length > 0 ? `Dropdown_Options!$C$2:$C$${typeNames.length + 1}` : null;
  const gaushalaRange = gaushalaNames.length > 0 ? `Dropdown_Options!$D$2:$D$${gaushalaNames.length + 1}` : null;

  // Add Data Validations to rows 2 to 500
  for (let rowIdx = 2; rowIdx <= 500; rowIdx++) {
    // Column C: isFemale
    worksheet.getCell(`C${rowIdx}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [genderRange],
      showErrorMessage: true,
      errorTitle: 'Invalid Gender',
      error: 'Please select female or male from the dropdown list.',
    };

    // Column D: breed
    if (breedRange) {
      worksheet.getCell(`D${rowIdx}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [breedRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Breed',
        error: 'Please select a valid Breed from the dropdown list.',
      };
    }

    // Column E: type
    if (typeRange) {
      worksheet.getCell(`E${rowIdx}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [typeRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Type',
        error: 'Please select a valid Cow Type from the dropdown list.',
      };
    }

    // Column F: gaushala
    if (gaushalaRange) {
      worksheet.getCell(`F${rowIdx}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [gaushalaRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Gaushala',
        error: 'Please select a valid Gaushala from the dropdown list.',
      };
    }

    // Column G: shedNumber (Dynamic Cascading Dropdown using INDIRECT formula)
    if (allGaushalas.length > 0) {
      worksheet.getCell(`G${rowIdx}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`INDIRECT(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(F${rowIdx}, " ", "_"), "-", "_"), ".", "_"), "/", "_"))`],
        showErrorMessage: true,
        errorTitle: 'Invalid Shed',
        error: 'Please select a valid Shed belonging to the selected Gaushala.',
      };
    }
  }

  return await workbook.xlsx.writeBuffer();
};

/**
 * Service to update an existing cow.
 *
 * @param {string} cowId ID of the cow to update
 * @param {Object} updateData Validated update payload
 * @returns {Promise<Object>} Populated updated cow document
 */
const updateCow = async (cowId, updateData) => {
  // 1. Check if cow exists
  const existingCow = await Cow.findOne({ _id: cowId, isDeleted: false });
  if (!existingCow) {
    throw new AppError('Cow not found', 404);
  }

  // 2. Validate references if changing
  const targetGaushalaId = updateData.gaushala_id || existingCow.gaushala_id;

  if (updateData.breed) {
    const breedExists = await BreedType.findById(updateData.breed);
    if (!breedExists) {
      throw new AppError('Breed type not found', 404);
    }
  }

  if (updateData.gaushala_id) {
    const gaushalaExists = await Gaushala.findById(updateData.gaushala_id);
    if (!gaushalaExists) {
      throw new AppError('Gaushala not found', 404);
    }
  }

  if (updateData.type) {
    const typeExists = await Type.findById(updateData.type);
    if (!typeExists) {
      throw new AppError('Cow type not found', 404);
    }
  }

  // Validate shed if provided or if gaushala changed
  if (updateData.shed_id !== undefined) {
    if (updateData.shed_id) {
      const shedExists = await Shed.findById(updateData.shed_id);
      if (!shedExists) {
        throw new AppError('Shed not found', 404);
      }
      if (
        shedExists.gaushalaId &&
        targetGaushalaId &&
        shedExists.gaushalaId.toString() !== targetGaushalaId.toString()
      ) {
        throw new AppError('The provided shed does not belong to the selected gaushala', 400);
      }
    }
  } else if (updateData.gaushala_id && existingCow.shed_id) {
    // Gaushala changed, but shed_id was not explicitly passed: check if current shed belongs to new gaushala
    const currentShed = await Shed.findById(existingCow.shed_id);
    if (
      currentShed &&
      currentShed.gaushalaId &&
      currentShed.gaushalaId.toString() !== updateData.gaushala_id.toString()
    ) {
      throw new AppError('Existing shed does not belong to the newly selected gaushala. Please provide a valid shed_id or null.', 400);
    }
  }

  if (updateData.dam_id) {
    if (updateData.dam_id.toString() === cowId.toString()) {
      throw new AppError('A cow cannot be its own dam', 400);
    }
    const damExists = await Cow.findOne({ _id: updateData.dam_id, isDeleted: false });
    if (!damExists) {
      throw new AppError('Dam cow not found', 404);
    }
  }

  if (updateData.sair_id) {
    if (updateData.sair_id.toString() === cowId.toString()) {
      throw new AppError('A cow cannot be its own sire', 400);
    }
    const sireExists = await Cow.findOne({ _id: updateData.sair_id, isDeleted: false });
    if (!sireExists) {
      throw new AppError('Sire cow not found', 404);
    }
  }

  // 3. Check tag_id uniqueness if tag_id changed
  if (updateData.tag_id && updateData.tag_id !== existingCow.tag_id) {
    const duplicateTag = await Cow.findOne({
      tag_id: updateData.tag_id,
      _id: { $ne: cowId },
      isDeleted: false,
    });
    if (duplicateTag) {
      throw new AppError('Cow with this tag ID already exists', 409);
    }
  }

  // 4. Update the cow document
  Object.assign(existingCow, updateData);
  await existingCow.save();

  // 5. Populate and return
  const updatedCow = await Cow.findById(cowId)
    .populate('breed')
    .populate('gaushala_id')
    .populate('type')
    .populate('shed_id')
    .populate('dam_id')
    .populate('sair_id')
    .populate('addedBy', 'name');

  return updatedCow;
};

/**
 * Service to soft-delete a cow.
 *
 * @param {string} cowId ID of the cow to soft-delete
 * @param {string|ObjectId} userId ID of the authenticated user performing the deletion
 * @returns {Promise<{ id: string }>} Result containing the deleted cow id
 */
const deleteCow = async (cowId, userId) => {
  if (!cowId || !mongoose.isValidObjectId(cowId)) {
    throw new AppError('Invalid Cow ID format', 400);
  }

  const cow = await Cow.findById(cowId);
  if (!cow) {
    throw new AppError('Cow not found', 404);
  }

  if (cow.isDelete === true || cow.isDeleted === true) {
    throw new AppError('Cow is already deleted', 400);
  }

  await Cow.findByIdAndUpdate(
    cowId,
    {
      $set: {
        isActive: false,
        isDelete: true,
        isDeleted: true,
        deletedBy: userId,
      },
    },
    { new: true },
  );

  return { id: cowId.toString() };
};

/**
 * Service to mark a cow as died.
 *
 * @param {string} cowId ID of the cow to mark as died
 * @param {string} sendDiedDate Date string when the cow died
 * @returns {Promise<{ id: string, send_died_date: string }>} Result
 */
const markCowAsDied = async (cowId, sendDiedDate) => {
  if (!cowId || !mongoose.isValidObjectId(cowId)) {
    throw new AppError('Invalid Cow ID format', 400);
  }

  if (!sendDiedDate || (typeof sendDiedDate === 'string' && !sendDiedDate.trim())) {
    throw new AppError('send_died_date is required', 400);
  }

  const parsedDate = new Date(sendDiedDate);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid date format for send_died_date', 400);
  }

  const cow = await Cow.findById(cowId);
  if (!cow) {
    throw new AppError('Cow not found', 404);
  }

  if (cow.isDelete === true || cow.isDeleted === true) {
    throw new AppError('Cannot mark deleted cow as died', 400);
  }

  if (cow.isDied === true) {
    throw new AppError('Cow is already marked as died', 400);
  }

  const formattedDate = typeof sendDiedDate === 'string' ? sendDiedDate.trim() : parsedDate.toISOString().split('T')[0];

  await Cow.findByIdAndUpdate(
    cowId,
    {
      $set: {
        isActive: false,
        isDied: true,
        send_died_date: formattedDate,
      },
    },
    { new: true },
  );

  return {
    id: cowId.toString(),
    send_died_date: formattedDate,
  };
};

/**
 * Service to activate or deactivate a cow.
 *
 * @param {string} cowId ID of the cow
 * @param {boolean|string|undefined} explicitStatus Optional explicit isActive status
 * @returns {Promise<{ id: string, isActive: boolean }>} Result
 */
const toggleCowStatus = async (cowId, explicitStatus) => {
  if (!cowId || !mongoose.isValidObjectId(cowId)) {
    throw new AppError('Invalid Cow ID format', 400);
  }

  const cow = await Cow.findById(cowId);
  if (!cow) {
    throw new AppError('Cow not found', 404);
  }

  if (cow.isDelete === true || cow.isDeleted === true) {
    throw new AppError('Cannot change status of a deleted cow', 400);
  }

  if (cow.isDied === true) {
    throw new AppError('Cannot change status of a died cow', 400);
  }

  let newStatus;
  if (explicitStatus !== undefined && explicitStatus !== null && explicitStatus !== '') {
    if (typeof explicitStatus === 'boolean') {
      newStatus = explicitStatus;
    } else if (explicitStatus === 'true' || explicitStatus === 'false') {
      newStatus = explicitStatus === 'true';
    } else {
      throw new AppError('isActive must be a boolean (true or false)', 400);
    }
  } else {
    newStatus = !cow.isActive;
  }

  await Cow.findByIdAndUpdate(
    cowId,
    {
      $set: {
        isActive: newStatus,
      },
    },
    { new: true },
  );

  return {
    id: cowId.toString(),
    isActive: newStatus,
  };
};

/**
 * Transfer cow(s) to a new shed and record transfer history.
 *
 * @param {Object} transferData
 * @param {string|Array<string>} [transferData.cowId]
 * @param {Array<string>} [transferData.cowIds]
 * @param {string} transferData.toShedId
 * @param {string} [transferData.fromShedId]
 * @param {string} [transferData.gaushalaId]
 * @param {string} transferData.transferredBy
 * @param {Date|string} [transferData.transferDate]
 * @param {string} [transferData.reason]
 * @returns {Promise<Object>} Transfer result with updated cows and history records
 */
const transferShed = async ({
  cowId,
  cowIds,
  toShedId,
  fromShedId,
  gaushalaId,
  transferredBy,
  transferDate,
  reason,
}) => {
  // 1. Validate gaushalaId
  if (!gaushalaId || !mongoose.Types.ObjectId.isValid(gaushalaId)) {
    throw new AppError('Valid gaushalaId is required', 400);
  }

  const gaushala = await Gaushala.findById(gaushalaId);
  if (!gaushala) {
    throw new AppError('Gaushala not found', 404);
  }

  // 2. Validate destination shed
  if (!toShedId || !mongoose.Types.ObjectId.isValid(toShedId)) {
    throw new AppError('Valid destination shed ID (toShedId) is required', 400);
  }

  const toShed = await Shed.findById(toShedId);
  if (!toShed) {
    throw new AppError('Destination shed not found', 404);
  }

  // Check that new shed is within the entered gaushala
  if (!toShed.gaushalaId || toShed.gaushalaId.toString() !== gaushalaId.toString()) {
    throw new AppError(
      `The destination shed (${toShed.shedName || toShed.shedNumber || toShed._id}) does not belong to the entered gaushala`,
      400,
    );
  }

  // 3. Validate transferredBy user
  if (!transferredBy || !mongoose.Types.ObjectId.isValid(transferredBy)) {
    throw new AppError('Valid transferredBy user ID is required', 400);
  }

  const userExists = await User.findOne({ _id: transferredBy, isDeleted: false });
  if (!userExists) {
    throw new AppError('TransferredBy user not found', 404);
  }

  // 4. Normalize cow IDs
  let rawIds = [];
  if (Array.isArray(cowIds) && cowIds.length > 0) {
    rawIds = cowIds;
  } else if (cowId) {
    rawIds = Array.isArray(cowId) ? cowId : [cowId];
  }

  const targetCowIds = rawIds
    .map((id) => (typeof id === 'string' ? id.trim() : id?.toString()))
    .filter(Boolean);

  if (targetCowIds.length === 0) {
    throw new AppError('At least one cow ID is required for shed transfer', 400);
  }

  // 5. Validate all cow IDs format
  for (const id of targetCowIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Cow ID format: ${id}`, 400);
    }
  }

  const effectiveTransferDate = transferDate ? new Date(transferDate) : new Date();
  const effectiveReason = typeof reason === 'string' ? reason.trim() : '';

  const transferredRecords = [];
  const updatedCows = [];

  for (const singleCowId of targetCowIds) {
    const cow = await Cow.findById(singleCowId);

    if (!cow) {
      throw new AppError(`Cow not found with ID: ${singleCowId}`, 404);
    }

    if (cow.isDelete === true || cow.isDeleted === true) {
      throw new AppError(`Cannot transfer deleted cow (Tag: ${cow.tag_id || singleCowId}). The cow is marked as deleted.`, 400);
    }

    if (cow.isDied === true) {
      throw new AppError(`Cannot transfer deceased cow (Tag: ${cow.tag_id || singleCowId})`, 400);
    }

    // Verify cow is under the entered gaushalaId
    if (!cow.gaushala_id || cow.gaushala_id.toString() !== gaushalaId.toString()) {
      throw new AppError(
        `Cow (Tag: ${cow.tag_id || singleCowId}) does not belong to the entered gaushala`,
        400,
      );
    }

    // Check if cow is already in the destination shed
    if (cow.shed_id && cow.shed_id.toString() === toShed._id.toString()) {
      const shedLabel = toShed.shedName
        ? (toShed.shedNumber ? `${toShed.shedName} (${toShed.shedNumber})` : toShed.shedName)
        : (toShed.shedNumber || toShed._id);
      throw new AppError(
        `Cow (Tag: ${cow.tag_id || singleCowId}) is already in shed ${shedLabel}`,
        400,
      );
    }

    const previousShedId = fromShedId || cow.shed_id || null;

    // Update cow shed and gaushala
    cow.shed_id = toShed._id;
    cow.gaushala_id = gaushalaId;
    await cow.save();

    // Create ShedTransferHistory record
    const historyEntry = await ShedTransferHistory.create({
      cow_id: cow._id,
      from_shed_id: previousShedId,
      to_shed_id: toShed._id,
      gaushala_id: gaushalaId,
      transferredBy,
      transferDate: effectiveTransferDate,
      reason: effectiveReason,
    });

    // Populate created history entry
    const populatedHistory = await ShedTransferHistory.findById(historyEntry._id)
      .populate({
        path: 'cow_id',
        select: 'tag_id calf_name breed type isFemale avatarUrl isDied',
        populate: [
          { path: 'breed', select: 'breedName' },
          { path: 'type', select: 'typeName' },
        ],
      })
      .populate('from_shed_id', 'shedName shedNumber')
      .populate('to_shed_id', 'shedName shedNumber')
      .populate('gaushala_id', 'gaushalaName')
      .populate('transferredBy', 'name username emailId');

    transferredRecords.push(populatedHistory);
    updatedCows.push(cow);
  }

  if (targetCowIds.length === 1 && !Array.isArray(cowIds)) {
    return {
      history: transferredRecords[0],
      cow: updatedCows[0],
    };
  }

  return {
    transferredCount: transferredRecords.length,
    transfers: transferredRecords,
    cows: updatedCows,
  };
};

/**
 * Get shed transfer history with filtering and pagination.
 *
 * @param {Object} queryParams
 * @returns {Promise<Object>} History records and pagination metadata
 */
const getShedTransferHistory = async (queryParams = {}) => {
  const {
    cow_id,
    cowId,
    gaushala_id,
    gaushalaId,
    from_shed_id,
    fromShedId,
    to_shed_id,
    toShedId,
    startDate,
    endDate,
    start_date,
    end_date,
    page,
    limit,
  } = queryParams;

  const filter = {};

  const effectiveCowId = cow_id || cowId;
  if (effectiveCowId && mongoose.Types.ObjectId.isValid(effectiveCowId)) {
    filter.cow_id = effectiveCowId;
  }

  const effectiveGaushalaId = gaushala_id || gaushalaId;
  if (effectiveGaushalaId && mongoose.Types.ObjectId.isValid(effectiveGaushalaId)) {
    filter.gaushala_id = effectiveGaushalaId;
  }

  const effectiveFromShed = from_shed_id || fromShedId;
  if (effectiveFromShed && mongoose.Types.ObjectId.isValid(effectiveFromShed)) {
    filter.from_shed_id = effectiveFromShed;
  }

  const effectiveToShed = to_shed_id || toShedId;
  if (effectiveToShed && mongoose.Types.ObjectId.isValid(effectiveToShed)) {
    filter.to_shed_id = effectiveToShed;
  }

  const fromDate = startDate || start_date;
  const toDate = endDate || end_date;
  if (fromDate || toDate) {
    filter.transferDate = {};
    if (fromDate) {
      filter.transferDate.$gte = new Date(fromDate);
    }
    if (toDate) {
      filter.transferDate.$lte = new Date(toDate);
    }
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || (page ? 10 : 0);

  let query = ShedTransferHistory.find(filter)
    .sort({ transferDate: -1, createdAt: -1 })
    .populate({
      path: 'cow_id',
      select: 'tag_id calf_name breed type isFemale avatarUrl isDied',
      populate: [
        { path: 'breed', select: 'breedName' },
        { path: 'type', select: 'typeName' },
      ],
    })
    .populate('from_shed_id', 'shedName shedNumber')
    .populate('to_shed_id', 'shedName shedNumber')
    .populate('gaushala_id', 'gaushalaName')
    .populate('transferredBy', 'name username emailId');

  const total = await ShedTransferHistory.countDocuments(filter);

  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const records = await query.exec();

  return {
    records,
    total,
    page: pageNum,
    limit: limitNum > 0 ? limitNum : total,
    totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
  };
};

/**
 * Get shed transfer history for a specific cow.
 *
 * @param {string} cowId
 * @param {Object} [queryParams]
 * @returns {Promise<Object>} History records for the specific cow
 */
const getCowShedHistory = async (cowId, queryParams = {}) => {
  if (!cowId || !mongoose.Types.ObjectId.isValid(cowId)) {
    throw new AppError('Valid Cow ID format is required', 400);
  }

  const cow = await Cow.findById(cowId);

  if (!cow) {
    throw new AppError('Cow not found', 404);
  }

  return await getShedTransferHistory({
    ...queryParams,
    cow_id: cowId,
  });
};

module.exports = {
  addCow,
  updateCow,
  deleteCow,
  markCowAsDied,
  toggleCowStatus,
  getCowsByGender,
  getCowCounts,
  importCowsFromExcel,
  generateCowImportTemplate,
  transferShed,
  getShedTransferHistory,
  getCowShedHistory,
};

