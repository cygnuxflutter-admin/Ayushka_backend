const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Upload single file and return absolute & relative URL along with file metadata.
 */
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file provided for upload', 400);
  }

  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  const relativePath = `/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url: fileUrl,
      relativePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  });
});

module.exports = {
  uploadFile,
};
