const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');

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
		{
			userId: user._id.toString(),
			roleId: user.roleId?._id || user.roleId,
			role: user.roleId?.roleName,
		},
		env.jwtSecret,
		{ expiresIn: env.jwtExpiresIn },
	);

	const refreshToken = jwt.sign(
		{
			userId: user._id.toString(),
			type: 'refresh',
		},
		env.jwtRefreshSecret || env.jwtSecret,
		{ expiresIn: env.jwtRefreshExpiresIn },
	);

	res.status(200).json({
		success: true,
		message: 'Login successful',
		data: {
			user,
			accessToken,
			refreshToken,
			tokenType: 'Bearer',
			expiresIn: env.jwtExpiresIn,
			refreshTokenExpiresIn: env.jwtRefreshExpiresIn,
		},
	});
});

const refreshToken = asyncHandler(async (req, res) => {
	const token =
		req.body?.refreshToken ||
		req.body?.refresh_token ||
		req.headers?.['x-refresh-token'] ||
		(req.get('authorization')?.startsWith('Bearer ')
			? req.get('authorization').split(' ')[1]
			: null);

	if (!token || typeof token !== 'string' || !token.trim()) {
		throw new AppError('Refresh token is required', 400);
	}

	const secret = env.jwtRefreshSecret || env.jwtSecret;
	if (!secret || Buffer.byteLength(secret) < 32) {
		throw new AppError('Token verification is not configured', 503);
	}

	let claims;
	try {
		claims = jwt.verify(token.trim(), secret);
	} catch (err) {
		throw new AppError('Invalid or expired refresh token', 401);
	}

	if (!claims?.userId || !mongoose.isValidObjectId(claims.userId)) {
		throw new AppError('Invalid or expired refresh token', 401);
	}

	const user = await User.findOne({
		_id: claims.userId,
		isDeleted: false,
		isActive: true,
	}).populate('roleId', 'roleName');

	if (!user) {
		throw new AppError('User is not active', 401);
	}

	const newAccessToken = jwt.sign(
		{
			userId: user._id.toString(),
			roleId: user.roleId?._id || user.roleId,
			role: user.roleId?.roleName,
		},
		env.jwtSecret,
		{ expiresIn: env.jwtExpiresIn },
	);

	const newRefreshToken = jwt.sign(
		{
			userId: user._id.toString(),
			type: 'refresh',
		},
		env.jwtRefreshSecret || env.jwtSecret,
		{ expiresIn: env.jwtRefreshExpiresIn },
	);

	res.status(200).json({
		success: true,
		message: 'Token refreshed successfully',
		data: {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
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

/**
 * Controller to handle forget / change password.
 * 1. Admin can directly change password without using old password.
 * 2. Regular user must provide both old password and new password.
 */
const forgotPassword = asyncHandler(async (req, res) => {
	const body = req.body || {};
	const userId = body.userId || body.user_id || body.id || req.params?.id;
	const emailId = body.emailId || body.email;
	const username = body.username || body.identifier;
	const oldPassword = body.oldPassword || body.old_password || body.currentPassword || body.current_password;
	const newPassword = body.newPassword || body.new_password || body.password;
	const confirmPassword = body.confirmPassword || body.confirm_password;

	const updatedUser = await userService.forgotPassword({
		requester: req.user,
		userId,
		emailId,
		username,
		oldPassword,
		newPassword,
		confirmPassword,
	});

	res.status(200).json({
		success: true,
		message: 'Password updated successfully',
		data: updatedUser,
	});
});

module.exports = {
	login,
	refreshToken,
	register,
	forgotPassword,
	forgetPassword: forgotPassword,
	changePassword: forgotPassword,
	resetPassword: forgotPassword,
};