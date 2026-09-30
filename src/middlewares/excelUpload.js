const multer = require('multer');
const path = require('node:path');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'text/plain',
    'application/octet-stream',
  ];

  if (allowedExts.includes(ext) || allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed', 400), false);
  }
};

const multerExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

/**
 * Middleware that accepts an Excel file under any field name ('file', 'excel', etc.)
 * and stores it in memory buffer req.file.buffer.
 */
const uploadExcel = (req, res, next) => {
  multerExcel.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds the 15MB limit', 400));
      }
      return next(new AppError(err.message, 400));
    } else if (err) {
      return next(err);
    }

    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

module.exports = uploadExcel;
