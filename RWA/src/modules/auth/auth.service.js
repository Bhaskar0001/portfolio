const User = require('./user.model');
const ApiError = require('../../utils/ApiError');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const register = async (userData) => {
    const { email, phone } = userData;

    // Check if user exists
    const existingUser = await User.findOne({
        $or: [{ email }, { phone }]
    });

    if (existingUser) {
        throw new ApiError(400, 'User with this email or phone already exists');
    }

    const user = await User.create(userData);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { user, accessToken, refreshToken };
};

const login = async (loginId, password) => {
    // loginId can be email or phone
    const user = await User.findOne({
        $or: [{ email: loginId }, { phone: loginId }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, 'Invalid email/phone or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Your account is deactivated');
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { user, accessToken, refreshToken };
};

const refreshToken = async (token) => {
    if (!token) {
        throw new ApiError(401, 'Refresh token is required');
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (userId) => {
    const user = await User.findById(userId);
    if (user) {
        user.refreshToken = undefined;
        await user.save();
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout
};
