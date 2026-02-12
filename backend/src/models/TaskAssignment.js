const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class TaskAssignment {
  /**
   * Create a task assignment
   */
  static async create(assignmentData) {
    const {
      taskId,
      agentId,
      proposalId,
      agreedAmount,
      agreedDeadline,
    } = assignmentData;

    const query = `
      INSERT INTO task_assignments (
        task_id, agent_id, proposal_id, agreed_amount, agreed_deadline
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [taskId, agentId, proposalId, agreedAmount, agreedDeadline];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find active assignment by task ID
   */
  static async findActive(taskId) {
    const query = `
      SELECT 
        ta.*,
        a.first_name as agent_first_name,
        a.last_name as agent_last_name,
        a.email as agent_email,
        ap.title as agent_title
      FROM task_assignments ta
      JOIN users a ON ta.agent_id = a.id
      LEFT JOIN agent_profiles ap ON a.id = ap.user_id
      WHERE ta.task_id = $1 AND ta.status IN ('active', 'in_progress')
    `;

    const result = await pool.query(query, [taskId]);
    return result.rows[0] || null;
  }

  /**
   * Find assignment by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        ta.*,
        t.title as task_title,
        t.status as task_status,
        a.first_name as agent_first_name,
        a.last_name as agent_last_name,
        ap.title as agent_title
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users a ON ta.agent_id = a.id
      LEFT JOIN agent_profiles ap ON a.id = ap.user_id
      WHERE ta.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get assignments by agent ID
   */
  static async findByAgentId(agentId, status) {
    let query = `
      SELECT 
        ta.*,
        t.title as task_title,
        t.description as task_description,
        t.budget_min,
        t.budget_max,
        c.first_name as client_first_name,
        c.last_name as client_last_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users c ON t.client_id = c.id
      WHERE ta.agent_id = $1
    `;

    const values = [agentId];

    if (status) {
      query += ` AND ta.status = $2`;
      values.push(status);
    }

    query += ` ORDER BY ta.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Update assignment by task ID
   */
  static async updateByTaskId(taskId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(taskId);
    values.push(paramIndex);

    const query = `
      UPDATE task_assignments
      SET ${fields.join(', ')}
      WHERE task_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update assignment
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(id);
    values.push(paramIndex);

    const query = `
      UPDATE task_assignments
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Complete assignment
   */
  static async complete(id) {
    const query = `
      UPDATE task_assignments
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Cancel assignment
   */
  static async cancel(id, reason) {
    const query = `
      UPDATE task_assignments
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = TaskAssignment;
