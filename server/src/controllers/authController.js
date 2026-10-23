const { User } = require('../models/User');
const { ApiError } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { signAuthToken } = require('../utils/token');
const { toPublicUser } = require('../utils/userResponse');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, shopName, shopAddress } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    shopName,
    shopAddress: shopAddress || '',
  });

  const token = signAuthToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: toPublicUser(user),
      token,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAuthToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: toPublicUser(user),
      token,
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: toPublicUser(req.user),
    },
  });
});

module.exports = {
  register,
  login,
  getMe,
};
