const mongoose = require('mongoose');
const env = require('./env');
const Gaushala = require('../models/Gaushala');
const Role = require('../models/Role');
const Shed = require('../models/Shed');
const BreedType = require('../models/BreedType');
const Type = require('../models/Type');
const User = require('../models/User');
const Cow = require('../models/cow.model');
const models = [
  Gaushala,
  Role,
  Shed,
  BreedType,
  Type,
  User,
  Cow,
];

const seedDefaultData = async () => {
  const [role, gaushala] = await Promise.all([
    Role.findOneAndUpdate(
      { roleName: 'Admin' },
      { $setOnInsert: { roleName: 'Admin' } },
      { new: true, upsert: true },
    ),
    Gaushala.findOneAndUpdate(
      { gaushalaName: 'ayushka_navsari' },
      { $setOnInsert: { gaushalaName: 'ayushka_navsari' } },
      { new: true, upsert: true },
    ),
  ]);

  const admin = await User.findOne({
    username: 'admin_ayushka',
    isDeleted: false,
  });
  if (admin) {
    return;
  }

  const previousAdmin = await User.findOne({
    username: 'admin',
    emailId: env.defaultAdminEmail,
    isDeleted: false,
  });
  if (previousAdmin) {
    previousAdmin.username = 'admin_ayushka';
    await previousAdmin.save();
    return;
  }

  if (!env.defaultAdminEmail || !env.defaultAdminPassword) {
    console.log(
      'Default admin user not seeded; configure DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD',
    );
    return;
  }

  await User.create({
    name: 'admin_ayushka',
    gaushalaId: gaushala._id,
    roleId: role._id,
    emailId: env.defaultAdminEmail,
    username: 'admin_ayushka',
    password: env.defaultAdminPassword,
    isActive: true,
  });
};

const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri, { autoIndex: false });
  await mongoose.connection.createCollections();
  await Promise.all(models.map((model) => model.createIndexes()));

  // Explicitly initialize Cow collection and indexes safely
  try {
    await Cow.createCollection();
  } catch (error) {
    if (error.code !== 48 && error.codeName !== 'NamespaceExists') {
      throw error;
    }
  }
  await Cow.createIndexes();
  console.log('Cow collection initialized successfully');

  await seedDefaultData();
  console.log('MongoDB connected; collections and indexes are ready');
};

module.exports = connectDatabase;
