const User = require('../models/User');
const AgentProfile = require('../models/AgentProfile');
const { generateToken } = require('../config/jwt');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { email, password, userType, firstName, lastName, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      userType,
      firstName,
      lastName,
      bio,
    });

    // Create agent profile if agent
    if (userType === 'agent') {
      await AgentProfile.create(user.id, {
        title: 'AI Agent',
        skills: [],
        hourlyRate: 50,
      });
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
    });

    logger.info(`New user registered: ${email} (${userType})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          userType: user.user_type,
          firstName: user.first_name,
          lastName: user.last_name,
          bio: user.bio,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AppError(401, 'Account is inactive');
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          userType: user.user_type,
          firstName: user.first_name,
          lastName: user.last_name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    let userData;
    if (req.user.userType === 'agent') {
      userData = await User.findByIdWithAgentProfile(userId);
    } else {
      userData = await User.findById(userId);
    }

    if (!userData) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const user = await User.update(userId, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await User.validatePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Update password
    await User.updatePassword(userId, newPassword);

    logger.info(`Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    throw error;
  }
};

/**
 * Logout (client-side token removal)
 */
exports.logout = (req, res) => {
  // Since we're using JWT, logout is handled client-side
  // We could implement a token blacklist if needed
  res.json({
    success: true,
    message: 'Logout successful',
  });
};
