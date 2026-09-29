const cowService = require('../services/cow.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller to handle POST /api/v1/cows
 */
const addCow = asyncHandler(async (req, res) => {
  const cowData = req.validatedData || req.body;
  const createdCow = await cowService.addCow(cowData);

  res.status(201).json({
    success: true,
    message: 'Cow added successfully',
    data: createdCow,
  });
});

module.exports = {
  addCow,
};
