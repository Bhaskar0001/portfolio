const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const register = catchAsync(async (req, res) => {
    const result = await authService.register(req.body);

    // Set refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json(
        new ApiResponse(201, {
            user: result.user,
            accessToken: result.accessToken
        }, 'User registered successfully')
    );
});

const login = catchAsync(async (req, res) => {
    const { loginId, password } = req.body;
    const result = await authService.login(loginId, password);

    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(
        new ApiResponse(200, {
            user: result.user,
            accessToken: result.accessToken
        }, 'Login successful')
    );
});

const refreshAccessToken = catchAsync(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await authService.refreshToken(token);

    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(
        new ApiResponse(200, {
            accessToken: result.accessToken
        }, 'Token refreshed successfully')
    );
});

const logout = catchAsync(async (req, res) => {
    await authService.logout(req.user._id);

    res.clearCookie('refreshToken');
    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

const getMe = catchAsync(async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.user, 'Profile fetched successfully'));
});

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    getMe
};
