const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

const corsOrigin = process.env.CORS_ORIGIN || '*';

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: positiveInteger(process.env.PORT, 5000, 'PORT'),
  mongoUri: process.env.LIVE === 'true' ? process.env.MONGODB_URI_PRODUCTION : process.env.MONGODB_URI_TEST,
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
