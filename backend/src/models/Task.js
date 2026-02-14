const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class Task {
  static async create(taskData) {
    const {
      clientId,
      title,
      description,
      skillsRequired,
      budgetMin,
      budgetMax,
      budgetType,
      estimatedHours,
      deadline,
      complexity = 'medium',
      attachments,
    } = taskData;

    const query = `
      INSERT INTO tasks (
        client_id, title, description, skills_required, budget_min, budget_max,
        budget_type, estimated_hours, deadline, complexity, attachments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      clientId,
      title,
      description,
      skillsRequired,
      budgetMin,
      budgetMax,
      budgetType,
      estimatedHours,
      deadline,
      complexity,
      attachments || [],
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        t.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        c.avatar_url as client_avatar, c.email as client_email,
        COALESCE(AVG(cr.rating), 0) as client_rating
      FROM tasks t
      JOIN users c ON t.client_id = c.id
      LEFT JOIN client_ratings cr ON c.id = cr.client_id
      WHERE t.id = $1
      GROUP BY t.id, c.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async list(filters = {}) {
    const {
      status,
      skills,
      budgetMin,
      budgetMax,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        t.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        c.avatar_url as client_avatar,
        COUNT(DISTINCT tp.id) as proposal_count,
        COALESCE(AVG(cr.rating), 0) as client_rating
      FROM tasks t
      JOIN users c ON t.client_id = c.id
      LEFT JOIN task_proposals tp ON t.id = tp.task_id
      LEFT JOIN client_ratings cr ON c.id = cr.client_id
      WHERE t.status != 'cancelled'
    `;

    const values = [];

    if (status) {
      query += ` AND t.status = $${values.length + 1}`;
      values.push(status);
    }

    if (skills && skills.length > 0) {
      const skillConditions = skills.map(() => `$${values.length + skills.findIndex((_, i) => true) + 1}`);
      query += ` AND t.skills_required && ARRAY[${skills.map((_, i) => `$${i + 1}`)}]`;
    }

    if (budgetMin) {
      query += ` AND t.budget_max >= $${values.length + 1}`;
    }

    if (budgetMax) {
      query += ` AND t.budget_min <= $${values.length + 1}`;
    }

    if (skills && skills.length > 0) {
      values.push(...skills);
    }

    if (budgetMin) values.push(budgetMin);
    if (budgetMax) values.push(budgetMax);

    query += ' GROUP BY t.id, c.id';

    // Sorting
    switch (sort) {
      case 'newest':
        query += ' ORDER BY t.created_at DESC';
        break;
      case 'oldest':
        query += ' ORDER BY t.created_at ASC';
        break;
      case 'budget_high':
        query += ' ORDER BY t.budget_max DESC NULLS LAST';
        break;
      case 'budget_low':
        query += ' ORDER BY t.budget_min ASC NULLS LAST';
        break;
      case 'deadline':
        query += ' ORDER BY t.deadline ASC NULLS LAST';
        break;
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE status != \'cancelled\'';
    const countValues = [];

    if (status) {
      countQuery += ` AND status = $${countValues.length + 1}`;
      countValues.push(status);
    }

    if (skills && skills.length > 0) {
      countQuery += ` AND skills_required && $${countValues.length + 1}`;
      countValues.push(skills);
    }

    if (budgetMin) {
      countQuery += ` AND budget_max >= $${countValues.length + 1}`;
      countValues.push(budgetMin);
    }

    if (budgetMax) {
      countQuery += ` AND budget_min <= $${countValues.length + 1}`;
      countValues.push(budgetMax);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      title: 'title',
      description: 'description',
      skills_required: 'skillsRequired',
      budget_min: 'budgetMin',
      budget_max: 'budgetMax',
      estimated_hours: 'estimatedHours',
      deadline: 'deadline',
      complexity: 'complexity',
      status: 'status',
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

    values.push(id);

    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    return result.rows[0];
  }

  static async getClientTasks(clientId, filters = {}) {
    const { status, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        t.*,
        COUNT(DISTINCT tp.id) as proposal_count,
        COUNT(DISTINCT ta.id) as assignment_count
      FROM tasks t
      LEFT JOIN task_proposals tp ON t.id = tp.task_id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      WHERE t.client_id = $1
    `;

    const values = [clientId];

    if (status) {
      query += ` AND t.status = $${values.length + 1}`;
      values.push(status);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE client_id = $1';
    const countValues = [clientId];

    if (status) {
      countQuery += ` AND status = $${countValues.length + 1}`;
      countValues.push(status);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async search(query, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const searchQuery = `
      SELECT 
        t.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        c.avatar_url as client_avatar
      FROM tasks t
      JOIN users c ON t.client_id = c.id
      WHERE 
        t.title ILIKE $1 OR 
        t.description ILIKE $1 OR
    `;

    const queryParams = [`%${query}%`];
    const skillParamConditions = [];

    // Search in skills array
    const skillSearch = query.split(' ').map(skill => `$${queryParams.length + 1} = ANY(t.skills_required)`).join(' OR ');
    searchQuery += ` (${skillSearch}`;

    // Add search terms as separate parameters
    query.split(' ').forEach(term => {
      if (term.trim()) {
        queryParams.push(`%${term}%`);
      }
    });

    query.split(' ').forEach(term => {
      if (term.trim()) {
        queryParams.push(term.toLowerCase());
        skillParamConditions.push(`$${queryParams.length}`);
      }
    });

    searchQuery += ` OR t.skills_required && $${queryParams.length + 1}`;
    queryParams.push(query.split(' ').filter(t => t.trim()));

    searchQuery += ` ) AND t.status = 'open'`;

    searchQuery += ' ORDER BY t.created_at DESC';
    searchQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(searchQuery, queryParams);

    const countQuery = `
      SELECT COUNT(*)
      FROM tasks t
      WHERE 
        t.title ILIKE $1 OR 
        t.description ILIKE $1 OR
        t.skills_required && $2
    `;
    const countResult = await pool.query(countQuery, [`%${query}%`, query.split(' ').filter(t => t.trim())]);
    const total = parseInt(countResult.rows[0].count);

    return {
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = Task;
