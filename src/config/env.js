const path = require('node:path');
const dotenv = require('dotenv');

// Ensure .env is loaded from project root regardless of IISNode working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resolveMongoUri = () => {
  const isLive = process.env.NODE_ENV === 'production' ? true : false;
  let uri = isLive ? process.env.MONGODB_URI_PRODUCTION : process.env.MONGODB_URI_TEST;

  if (!uri || uri === 'null' || uri === 'undefined' || uri.trim() === '') {
    uri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI_PRODUCTION;
  }

  return uri && uri !== 'null' && uri !== 'undefined' ? uri.trim() : '';
};

// const requiredVariables = ['MONGODB_URI'];
// const missingVariables = requiredVariables.filter(
//   (variable) => !process.env[variable],
// );

// if (missingVariables.length > 0) {
//   throw new Error(
//     `Missing required environment variable(s): ${missingVariables.join(', ')}`,
//   );
// }

const positiveInteger = (value, fallback, variable) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${variable} must be a positive integer`);
  }
  return parsed;
};

const parsePort = (value, fallback = 5000) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  // Support named pipes on Windows IIS (used by iisnode, e.g. \\.\pipe\...)
  if (typeof value === 'string' && (value.startsWith('\\\\.\\pipe\\') || Number.isNaN(Number(value)))) {
    return value;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive integer or valid pipe');
  }
  return parsed;
};

const corsOrigin = process.env.CORS_ORIGIN || '*';

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT, 5000),
  mongoUri: resolveMongoUri(),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL?.trim() || '',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || '',
  corsOrigin:
    corsOrigin === '*'
      ? '*'
      : corsOrigin.split(',').map((origin) => origin.trim()),
  rateLimitWindowMs: positiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS,
    900000,
    'RATE_LIMIT_WINDOW_MS',
  ),
  rateLimitMax: positiveInteger(
    process.env.RATE_LIMIT_MAX,
    100,
    'RATE_LIMIT_MAX',
  ),
};
