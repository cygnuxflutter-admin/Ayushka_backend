const mongoose = require('mongoose');
const env = require('../config/env');
const Module = require('../models/Module');
const defaultModules = require('./defaultModules.seed');

const seedModules = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    console.log('Connected.');

    console.log(`Starting to sync ${defaultModules.length} default modules...`);
    for (const item of defaultModules) {
      const existing = await Module.findOne({ code: item.code });
      if (!existing) {
        await Module.create(item);
        console.log(`+ Created module: ${item.name} (${item.code})`);
      } else {
        let modified = false;
        const existingSubCodes = (existing.subModules || []).map((s) => s.code);
        for (const sub of item.subModules || []) {
          if (!existingSubCodes.includes(sub.code)) {
            existing.subModules.push(sub);
            modified = true;
            console.log(`  + Added sub-module ${sub.name} (${sub.code}) to ${item.code}`);
          }
        }
        if (modified) {
          await existing.save();
        } else {
          console.log(`  = Module already up to date: ${item.code}`);
        }
      }
    }

    const totalCount = await Module.countDocuments();
    console.log(`Sync completed! Total modules in database: ${totalCount}`);
  } catch (error) {
    console.error('Error seeding modules:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

if (require.main === module) {
  seedModules();
}

module.exports = seedModules;
