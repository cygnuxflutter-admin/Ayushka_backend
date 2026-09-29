const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const login = asyncHandler(async (req, res) => {
	const { emailId, username, identifier, password } = req.body || {};
	const loginIdentifier = emailId || username || identifier;

	if (
		typeof loginIdentifier !== 'string' ||
		!loginIdentifier.trim() ||
		typeof password !== 'string' ||
		!password
	) {
		throw new AppError('Email/username and password are required', 400);
	}
	if (!env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) {
		throw new AppError('Login token signing is not configured', 503);
	}

	const normalizedIdentifier = loginIdentifier.trim();
	const query = normalizedIdentifier.includes('@')
		? { emailId: normalizedIdentifier.toLowerCase() }
		: { username: normalizedIdentifier };

	const user = await User.findOne({
		...query,
		isDeleted: false,
		isActive: true,
	}).select('+password').populate('roleId', 'roleName');

	if (!user || !(await user.comparePassword(password))) {
		throw new AppError('Invalid email/username or password', 401);
	}
	const accessToken = jwt.sign(
		{ userId: user._id.toString(), roleId: user.roleId._id, role: user.roleId.roleName },
		env.jwtSecret,
		{ expiresIn: env.jwtExpiresIn },
	);

	res.status(200).json({
		success: true,
		data: {
			user,
			accessToken,
			tokenType: 'Bearer',
			expiresIn: env.jwtExpiresIn,
		},
	});
});

const register = asyncHandler(async (req, res) => {
	res.status(501).json({
		success: false,
		message: 'Registration is not implemented',
	});
});

module.exports = { login, register};