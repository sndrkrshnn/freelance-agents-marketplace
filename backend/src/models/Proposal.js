const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class Proposal {
  static async create(proposalData) {
    const {
      taskId,
      agentId,
      proposedAmount,
      proposedDurationDays,
      coverLetter,
    } = proposalData;

    const query = `
      INSERT INTO task_proposals (
        task_id, agent_id, proposed_amount, proposed_duration_days, cover_letter
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (task_id, agent_id) 
      DO UPDATE SET 
        proposed_amount = EXCLUDED.proposed_amount,
        proposed_duration_days = EXCLUDED.proposed_duration_days,
        cover_letter = EXCLUDED.cover_letter,
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      taskId,
      agentId,
      proposedAmount,
      proposedDurationDays,
      coverLetter,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        tp.*,
        a.first_name as agent_first_name, a.last_name as agent_last_name,
        a.avatar_url as agent_avatar,
        ap.title as agent_title, ap.hourly_rate as agent_hourly_rate,
        ap.skills as agent_skills,
        COALESCE(AVG(ar.rating), 0) as agent_rating,
        COUNT(DISTINCT ar.id) as agent_review_count,
        t.title as task_title, t.budget_min, t.budget_max, t.skills_required as task_skills
      FROM task_proposals tp
      JOIN users a ON tp.agent_id = a.id
      JOIN agent_profiles ap ON a.id = ap.user_id
      LEFT JOIN agent_ratings ar ON a.id = ar.agent_id
      JOIN tasks t ON tp.task_id = t.id
      WHERE tp.id = $1
      GROUP BY tp.id, a.id, ap.id, t.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async findByTask(taskId) {
    const query = `
      SELECT 
        tp.*,
        a.first_name as agent_first_name, a.last_name as agent_last_name,
        a.avatar_url as agent_avatar,
        ap.title as agent_title, ap.hourly_rate as agent_hourly_rate,
        ap.skills as agent_skills,
        COALESCE(AVG(ar.rating), 0) as agent_rating,
        COUNT(DISTINCT ar.id) as agent_review_count
      FROM task_proposals tp
      JOIN users a ON tp.agent_id = a.id
      JOIN agent_profiles ap ON a.id = ap.user_id
      LEFT JOIN agent_ratings ar ON a.id = ar.agent_id
      WHERE tp.task_id = $1
      GROUP BY tp.id, a.id, ap.id
      ORDER BY tp.created_at DESC
    `;

    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  static async findByAgent(agentId, filters = {}) {
    const { status, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        tp.*,
        t.title as task_title, t.budget_min, t.budget_max, t.skills_required,
        c.first_name as client_first_name, c.last_name as client_last_name,
        c.avatar_url as client_avatar
      FROM task_proposals tp
      JOIN tasks t ON tp.task_id = t.id
      JOIN users c ON t.client_id = c.id
      WHERE tp.agent_id = $1
    `;

    const values = [agentId];

    if (status) {
      query += ` AND tp.status = $${values.length + 1}`;
      values.push(status);
    }

    query += ' ORDER BY tp.created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM task_proposals WHERE agent_id = $1';
    const countValues = [agentId];

    if (status) {
      countQuery += ` AND status = $${countValues.length + 1}`;
      countValues.push(status);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      proposals: result.rows,
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

    const allowedFields = {
      status: 'status',
      proposed_amount: 'proposedAmount',
      proposed_duration_days: 'proposedDurationDays',
      cover_letter: 'coverLetter',
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
      UPDATE task_proposals
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Proposal not found');
    }

    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM task_proposals WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Proposal not found');
    }

    return result.rows[0];
  }

  static async acceptProposal(proposalId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get the proposal
      const proposalResult = await client.query(
        'SELECT * FROM task_proposals WHERE id = $1 FOR UPDATE',
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        throw new AppError(404, 'Proposal not found');
      }

      const proposal = proposalResult.rows[0];

      if (proposal.status !== 'pending') {
        throw new AppError(400, 'Proposal cannot be accepted');
      }

      // Update proposal status
      await client.query(
        'UPDATE task_proposals SET status = \'accepted\' WHERE id = $1',
        [proposalId]
      );

      // Reject all other proposals for this task
      await client.query(
        'UPDATE task_proposals SET status = \'rejected\' WHERE task_id = $1 AND id != $2',
        [proposal.task_id, proposalId]
      );

      // Update task status
      await client.query(
        'UPDATE tasks SET status = \'in_progress\' WHERE id = $1',
        [proposal.task_id]
      );

      // Create task assignment
      const assignmentResult = await client.query(
        `INSERT INTO task_assignments (task_id, agent_id, proposal_id, agreed_amount, agreed_deadline)
         SELECT $1, $2, $3, $4, COALESCE(t.deadline, CURRENT_TIMESTAMP + INTERVAL '30 days')
         FROM tasks t WHERE t.id = $1
         RETURNING *`,
        [proposal.task_id, proposal.agent_id, proposalId, proposal.proposed_amount]
      );

      await client.query('COMMIT');

      return {
        proposal: proposalResult.rows[0],
        assignment: assignmentResult.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async withdraw(proposalId, agentId) {
    const query = `
      UPDATE task_proposals
      SET status = 'withdrawn'
      WHERE id = $1 AND agent_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [proposalId, agentId]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Proposal not found or not owned by agent');
    }

    return result.rows[0];
  }
}

module.exports = Proposal;
