const User = require('../models/User');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const AgentProfile = require('../models/AgentProfile');
const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Get admin dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user counts
    const userCounts = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users
      WHERE is_active = true
      GROUP BY user_type
    `);

    const userStats = {};
    userCounts.rows.forEach((row) => {
      userStats[row.user_type] = parseInt(row.count);
    });

    // Get task counts by status
    const taskCounts = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);

    const taskStats = {};
    taskCounts.rows.forEach((row) => {
      taskStats[row.status] = parseInt(row.count);
    });

    // Get payment statistics
    const paymentStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      GROUP BY status
    `);

    const paymentData = {};
    let totalRevenue = 0;

    paymentStats.rows.forEach((row) => {
      paymentData[row.status] = {
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount) || 0,
      };
      if (row.status === 'released') {
        totalRevenue += parseFloat(row.total_amount) || 0;
      }
    });

    // Get platform fees (10% of released payments)
    const platformFees = await pool.query(`
      SELECT COALESCE(SUM(fee_amount), 0) as total_fees
      FROM payments
      WHERE status = 'released'
    `);

    // Get recent registrations
    const recentUsers = await pool.query(`
      SELECT id, email, user_type, first_name, last_name, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get recent tasks
    const recentTasks = await pool.query(`
      SELECT id, title, client_id, status, budget_min, budget_max, created_at
      FROM tasks
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        users: {
          total: Object.values(userStats).reduce((a, b) => a + b, 0),
          ...userStats,
        },
        tasks: {
          total: Object.values(taskStats).reduce((a, b) => a + b, 0),
          ...taskStats,
        },
        payments: {
          totalRevenue,
          platformFees: parseFloat(platformFees.rows[0]?.total_fees || 0),
          ...paymentData,
        },
        recentUsers: recentUsers.rows,
        recentTasks: recentTasks.rows,
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    throw error;
  }
};

/**
 * Get all users
 */
exports.getUsers = async (req, res) => {
  try {
    const { userType, page = 1, limit = 20 } = req.query;

    const result = await User.list({
      userType,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get users error:', error);
    throw error;
  }
};

/**
 * Get user details
 */
exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdWithAgentProfile(userId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    throw error;
  }
};

/**
 * Update user status (activate/deactivate)
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
      [isActive, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    logger.info(`User status updated: ${userId} -> active: ${isActive}`);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    throw error;
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.delete(userId);

    logger.info(`User deleted: ${userId}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    throw error;
  }
};

/**
 * Get all tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const result = await Task.list({
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get tasks error:', error);
    throw error;
  }
};

/**
 * Update task status
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const updatedTask = await Task.update(taskId, { status });

    logger.info(`Task status updated: ${taskId} -> ${status}`);

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    logger.error('Update task status error:', error);
    throw error;
  }
};

/**
 * Get platform earnings
 */
exports.getEarnings = async (req, res) => {
  try {
    const { startDate, endDate, period = '30d' } = req.query;

    let dateFilter = '';
    const queryParams = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      queryParams.push(startDate, endDate);
    } else {
      // Default to last 30 days
      const days = parseInt(period) || 30;
      dateFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`;
    }

    const earningsQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(fee_amount) as daily_fees,
        COUNT(*) as transactions
      FROM payments
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await pool.query(earningsQuery, queryParams);

    // Calculate totals
    const totalFees = result.rows.reduce((sum, row) => sum + parseFloat(row.daily_fees || 0), 0);
    const totalTransactions = result.rows.reduce((sum, row) => sum + parseInt(row.transactions || 0), 0);

    res.json({
      success: true,
      data: {
        daily: result.rows,
        summary: {
          totalFees,
          totalTransactions,
        },
      },
    });
  } catch (error) {
    logger.error('Get earnings error:', error);
    throw error;
  }
};

/**
 * Get activity logs
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const { userId, action, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        al.*,
        u.email,
        u.first_name,
        u.last_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    }

    if (action) {
      query += ` AND al.action LIKE $${paramIndex}`;
      values.push(`%${action}%`);
      paramIndex++;
    }

    query += ' ORDER BY al.created_at DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM activity_logs WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (userId) {
      countQuery += ` AND user_id = $${countParamIndex}`;
      countValues.push(userId);
      countParamIndex++;
    }

    if (action) {
      countQuery += ` AND action LIKE $${countParamIndex}`;
      countValues.push(`%${action}%`);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    throw error;
  }
};
