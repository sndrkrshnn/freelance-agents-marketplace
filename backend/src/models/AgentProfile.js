const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class AgentProfile {
  static async create(userId, profileData) {
    const {
      title,
      skills,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      websiteUrl,
      hourlyRate,
      availabilityStatus,
      experienceYears,
      education,
      certifications,
    } = profileData;

    const query = `
      INSERT INTO agent_profiles (
        user_id, title, skills, portfolio_url, github_url, linkedin_url, 
        website_url, hourly_rate, availability_status, experience_years, 
        education, certifications
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      userId,
      title,
      skills,
      portfolioUrl || null,
      githubUrl || null,
      linkedinUrl || null,
      websiteUrl || null,
      hourlyRate,
      availabilityStatus || 'available',
      experienceYears || 0,
      education || null,
      certifications || [],
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM agent_profiles WHERE user_id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        ap.*,
        u.id as user_id, u.email, u.first_name, u.last_name, u.avatar_url, u.bio
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async update(userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      title: 'title',
      skills: 'skills',
      portfolio_url: 'portfolioUrl',
      github_url: 'githubUrl',
      linkedin_url: 'linkedinUrl',
      website_url: 'websiteUrl',
      hourly_rate: 'hourlyRate',
      availability_status: 'availabilityStatus',
      experience_years: 'experienceYears',
      education: 'education',
      certifications: 'certifications',
    };

    for (const [dbField, jsField] of Object.entries(fieldMap)) {
      if (updates[jsField] !== undefined) {
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(updates[jsField]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    values.push(userId);

    const query = `
      UPDATE agent_profiles
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async list(filters = {}) {
    const {
      skills,
      minRating,
      maxRate,
      availability,
      sort = 'rating',
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ap.id as profile_id, ap.user_id, ap.title, ap.skills, ap.hourly_rate,
        ap.availability_status, ap.experience_years, ap.completed_tasks,
        ap.portfolio_url, ap.github_url, ap.website_url,
        u.email, u.first_name, u.last_name, u.avatar_url, u.bio, u.created_at,
        COALESCE(AVG(ar.rating), 0) as average_rating,
        COUNT(DISTINCT ar.id) as review_count
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      LEFT JOIN agent_ratings ar ON u.id = ar.agent_id
      WHERE u.is_active = true AND u.user_type = 'agent'
    `;

    const values = [];
    let paramIndex = 1;

    // Skill filtering
    if (skills && skills.length > 0) {
      const skillConditions = skills.map(() => `$${paramIndex++}`);
      query += ` AND ap.skills && ARRAY[${skillConditions.join(',')}]`;
      values.push(...skills);
    }

    // Availability filtering
    if (availability) {
      query += ` AND ap.availability_status = $${paramIndex}`;
      values.push(availability);
      paramIndex++;
    }

    // Max rate filtering
    if (maxRate) {
      query += ` AND ap.hourly_rate <= $${paramIndex}`;
      values.push(maxRate);
      paramIndex++;
    }

    // Group by and having for rating
    query += `
      GROUP BY ap.id, u.id
    `;

    // Min rating filtering (HAVING clause)
    if (minRating) {
      query += ` HAVING COALESCE(AVG(ar.rating), 0) >= $${paramIndex}`;
      values.push(minRating);
      paramIndex++;
    }

    // Sorting
    switch (sort) {
      case 'rating':
        query += ' ORDER BY average_rating DESC';
        break;
      case 'rate_low':
        query += ' ORDER BY ap.hourly_rate ASC NULLS LAST';
        break;
      case 'rate_high':
        query += ' ORDER BY ap.hourly_rate DESC NULLS LAST';
        break;
      case 'newest':
        query += ' ORDER BY u.created_at DESC';
        break;
      default:
        query += ' ORDER BY average_rating DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT ap.user_id)
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      WHERE u.is_active = true AND u.user_type = 'agent'
    `;

    const countValues = [];
    let countParamIndex = 1;

    if (skills && skills.length > 0) {
      const skillConditions = skills.map(() => `$${countParamIndex++}`);
      countQuery += ` AND ap.skills && ARRAY[${skillConditions.join(',')}]`;
      countValues.push(...skills);
    }

    if (availability) {
      countQuery += ` AND ap.availability_status = $${countParamIndex}`;
      countValues.push(availability);
      countParamIndex++;
    }

    if (maxRate) {
      countQuery += ` AND ap.hourly_rate <= $${countParamIndex}`;
      countValues.push(maxRate);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      agents: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getTopAgents(limit = 10) {
    const query = `
      SELECT 
        ap.id as profile_id, ap.user_id, ap.title, ap.skills, ap.hourly_rate,
        ap.completed_tasks, ap.portfolio_url,
        u.first_name, u.last_name, u.avatar_url,
        COALESCE(AVG(ar.rating), 0) as average_rating,
        COUNT(DISTINCT ar.id) as review_count
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      LEFT JOIN agent_ratings ar ON u.id = ar.agent_id
      WHERE u.is_active = true AND u.user_type = 'agent'
      GROUP BY ap.id, u.id
      ORDER BY average_rating DESC, ap.completed_tasks DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async updateStats(userId, earnings = 0, completedTask = false) {
    let query = '';
    const values = [];
    let paramIndex = 1;

    if (earnings > 0) {
      query = `
        UPDATE agent_profiles
        SET total_earnings = total_earnings + $1
        WHERE user_id = $2
        RETURNING *
      `;
      values.push(earnings, userId);
    } else if (completedTask) {
      query = `
        UPDATE agent_profiles
        SET completed_tasks = completed_tasks + 1
        WHERE user_id = $1
        RETURNING *
      `;
      values.push(userId);
    }

    if (query) {
      const result = await pool.query(query, values);
      return result.rows[0];
    }

    return null;
  }
}

module.exports = AgentProfile;
