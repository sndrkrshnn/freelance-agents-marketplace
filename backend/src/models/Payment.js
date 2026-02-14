const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const stripeConfig = require('../config/stripe');

const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

class Payment {
  static async createEscrow(paymentData) {
    const {
      taskId,
      clientId,
      agentId,
      amount,
      stripePaymentIntentId,
    } = paymentData;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate fee
      const feeAmount = amount * PLATFORM_FEE_PERCENTAGE;

      // Create payment record
      const paymentResult = await client.query(
        `INSERT INTO payments (
          task_id, client_id, agent_id, amount, fee_amount, 
          stripe_payment_intent_id, status, payment_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'escrow', 'deposit')
        RETURNING *`,
        [taskId, clientId, agentId, amount, feeAmount, stripePaymentIntentId]
      );

      const payment = paymentResult.rows[0];

      // Create transaction records
      await client.query(
        `INSERT INTO transactions (user_id, payment_id, amount, transaction_type, description, balance_after)
         SELECT $1, $2, $3, 'debit', $4, (
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) - $3
         ) FROM transactions WHERE user_id = $1
        `,
        [clientId, payment.id, amount, `Escrow payment for task ${taskId}`]
      );

      await client.query('COMMIT');

      return payment.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async releaseToAgent(paymentId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get payment details
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
        [paymentId]
      );

      if (paymentResult.rows.length === 0) {
        throw new AppError(404, 'Payment not found');
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== 'escrow') {
        throw new AppError(400, 'Payment cannot be released');
      }

      const agentAmount = payment.amount - payment.fee_amount;

      // Update payment status
      await client.query(
        'UPDATE payments SET status = \'released\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [paymentId]
      );

      // Create credit transaction for agent
      await client.query(
        `INSERT INTO transactions (user_id, payment_id, amount, transaction_type, description, balance_after)
         SELECT $1, $2, $3, 'credit', $4, (
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) + $3
         ) FROM transactions WHERE user_id = $1
        `,
        [payment.agent_id, paymentId, agentAmount, `Payment received for task ${payment.task_id}`]
      );

      // Update agent stats
      await client.query(
        'UPDATE agent_profiles SET completed_tasks = completed_tasks + 1, total_earnings = total_earnings + $1 WHERE user_id = $2',
        [agentAmount, payment.agent_id]
      );

      // Update task status
      await client.query(
        'UPDATE tasks SET status = \'completed\' WHERE id = $1',
        [payment.task_id]
      );

      await client.query('COMMIT');

      // Create Stripe transfer (in background, don't fail if this fails)
      try {
        await stripeConfig.createTransfer(
          agentAmount,
          payment.agent_id, // This should be a Stripe Connect account ID
          { payment_id: paymentId }
        );
      } catch (stripeError) {
        // Log but don't fail the payment release
        console.error('Stripe transfer failed:', stripeError);
      }

      return payment.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async refund(paymentId, reason = '') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get payment details
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
        [paymentId]
      );

      if (paymentResult.rows.length === 0) {
        throw new AppError(404, 'Payment not found');
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== 'escrow') {
        throw new AppError(400, 'Payment cannot be refunded');
      }

      // Refund via Stripe
      if (payment.stripe_payment_intent_id) {
        await stripeConfig.refundPayment(payment.stripe_payment_intent_id);
      }

      // Update payment status
      await client.query(
        'UPDATE payments SET status = \'refunded\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [paymentId]
      );

      // Create credit transaction for client (refund)
      await client.query(
        `INSERT INTO transactions (user_id, payment_id, amount, transaction_type, description, balance_after)
         SELECT $1, $2, $3, 'credit', $4, (
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) + $3
         ) FROM transactions WHERE user_id = $1
        `,
        [payment.client_id, paymentId, payment.amount, `Refund for task ${payment.task_id}${reason ? ': ' + reason : ''}`]
      );

      // Update task status
      await client.query(
        'UPDATE tasks SET status = \'cancelled\' WHERE id = $1',
        [payment.task_id]
      );

      await client.query('COMMIT');

      return payment.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        p.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        a.first_name as agent_first_name, a.last_name as agent_last_name,
        t.title as task_title
      FROM payments p
      JOIN users c ON p.client_id = c.id
      JOIN users a ON p.agent_id = a.id
      LEFT JOIN tasks t ON p.task_id = t.id
      WHERE p.id = $1
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
        p.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        a.first_name as agent_first_name, a.last_name as agent_last_name
      FROM payments p
      JOIN users c ON p.client_id = c.id
      JOIN users a ON p.agent_id = a.id
      WHERE p.task_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  static async findByUser(userId, filters = {}) {
    const { type, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*, t.title as task_title
      FROM payments p
      LEFT JOIN tasks t ON p.task_id = t.id
      WHERE (p.client_id = $1 OR p.agent_id = $1)
    `;

    const values = [userId];

    if (type === 'sent') {
      query += ' AND p.client_id = $1';
    } else if (type === 'received') {
      query += ' AND p.agent_id = $1';
    }

    query += ' ORDER BY p.created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return {
      payments: result.rows,
      pagination: {
        page,
        limit,
      },
    };
  }

  static async createStripePaymentIntent(amount, taskId) {
    try {
      const paymentIntent = await stripeConfig.createPaymentIntent(amount, 'usd', {
        taskId,
      });

      return paymentIntent;
    } catch (error) {
      throw new AppError(500, `Failed to create payment intent: ${error.message}`);
    }
  }

  static async getUserBalance(userId) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) as balance
      FROM transactions
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return parseFloat(result.rows[0].balance);
  }

  static async getTransactions(userId, filters = {}) {
    const { type, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        t.*,
        p.task_id, p.status as payment_status
      FROM transactions t
      LEFT JOIN payments p ON t.payment_id = p.id
      WHERE t.user_id = $1
    `;

    const values = [userId];

    if (type === 'credit') {
      query += ' AND t.transaction_type = \'credit\'';
    } else if (type === 'debit') {
      query += ' AND t.transaction_type = \'debit\'';
    }

    query += ' ORDER BY t.created_at DESC';

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE user_id = $1';
    const countValues = [userId];

    if (type) {
      countQuery += ` AND transaction_type = $${countValues.length + 1}`;
      countValues.push(type);
    }

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = Payment;
