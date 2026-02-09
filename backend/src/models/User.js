const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errorHandler');

class User {
  static async create({ email, password, userType, firstName, lastName, bio }) {
    const hashedPassword = await bcrypt.hash(password, 12);

    const query = `
      INSERT INTO users (email, password_hash, user_type, first_name, last_name, bio)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, user_type, first_name, last_name, bio, avatar_url, created_at
    `;

    const values = [email, hashedPassword, userType, firstName, lastName, bio];
    const result = await pool.query(query, values);

    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, user_type, first_name, last_name, bio, avatar_url, 
             is_verified, is_active, created_at
      FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async findByIdWithAgentProfile(id) {
    const query = `
      SELECT 
        u.id, u.email, u.user_type, u.first_name, u.last_name, u.bio, u.avatar_url,
        u.is_verified, u.is_active, u.created_at,
        ap.id as profile_id, ap.title, ap.skills, ap.portfolio_url, ap.github_url,
        ap.linkedin_url, ap.website_url, ap.hourly_rate, ap.availability_status,
        ap.experience_years, ap.education, ap.certifications, ap.completed_tasks
      FROM users u
      LEFT JOIN agent_profiles ap ON u.id = ap.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = {
      first_name: 'firstName',
      last_name: 'lastName',
      bio: 'bio',
      avatar_url: 'avatar',
      is_verified: 'isVerified',
    };

    for (const [dbField, jsField] of Object.entries(allowedFields)) {
      if (updates[jsField] !== undefined) {
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(updates[jsField]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, user_type, first_name, last_name, bio, avatar_url, created_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const query = `
      UPDATE users 
      SET password_hash = $1
      WHERE id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
  }

  static async validatePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async list(filters = {}) {
    const { userType, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, user_type, first_name, last_name, avatar_url, created_at
      FROM users
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (userType) {
      query += ` AND user_type = $${paramIndex}`;
      values.push(userType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (userType) {
      countQuery += ` AND user_type = $${countParamIndex}`;
      countValues.push(userType);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    return result.rows[0];
  }
}

module.exports = User;
