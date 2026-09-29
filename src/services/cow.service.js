const Cow = require('../models/cow.model');
const BreedType = require('../models/BreedType');
const Gaushala = require('../models/Gaushala');
const Type = require('../models/Type');
const Shed = require('../models/Shed');
const User = require('../models/User');
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

  return populatedCow;
};

module.exports = {
  addCow,
};
