const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');
const logger = require('../config/logger');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header required.',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);

      // Verify user still exists and is active
      const result = await pool.query(
        'SELECT id, email, user_type, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User account is inactive',
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        userType: user.user_type,
      };

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

exports.checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id;

      let query = '';
      let params = [resourceId];

      switch (resourceType) {
        case 'task':
          query = 'SELECT client_id FROM tasks WHERE id = $1';
          break;
        case 'proposal':
          query = 'SELECT agent_id FROM task_proposals WHERE id = $1';
          break;
        case 'profile':
          query = 'SELECT user_id FROM agent_profiles WHERE id = $1';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
          });
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      const ownerField = resourceType === 'task' ? 'client_id' : 'agent_id';
      constOwnerId = resourceType === 'profile' ? result.rows[0].user_id : result.rows[0][ownerField];

      // Admins can access everything
      if (req.user.userType === 'admin') {
        return next();
      }

      if (defaultOwnerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource',
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking ownership',
      });
    }
  };
};

// For the fix in checkOwnership - I need to use the correct variable
exports.checkOwnershipFixed = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id;

      let query = '';
      let params = [resourceId];

      switch (resourceType) {
        case 'task':
          query = 'SELECT client_id FROM tasks WHERE id = $1';
          break;
        case 'proposal':
          query = 'SELECT agent_id FROM task_proposals WHERE id = $1';
          break;
        case 'profile':
          query = 'SELECT user_id FROM agent_profiles WHERE id = $1';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
          });
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      let ownerId;
      if (resourceType === 'task') {
        ownerId = result.rows[0].client_id;
      } else if (resourceType === 'profile') {
        ownerId = result.rows[0].user_id;
      } else {
        ownerId = result.rows[0].agent_id;
      }

      // Admins can access everything
      if (req.user.userType === 'admin') {
        return next();
      }

      if (ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource',
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking ownership',
      });
    }
  };
};
