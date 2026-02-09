const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

class Review {
  static async createAgentRating(reviewsData) {
    const {
      agentId,
      clientId,
      taskId,
      rating,
      review,
      communicationRating,
      qualityRating,
      timelinessRating,
    } = reviewsData;

    const query = `
      INSERT INTO agent_ratings (
        agent_id, client_id, task_id, rating, review, 
        communication_rating, quality_rating, timeliness_rating
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (task_id) 
      DO UPDATE SET 
        rating = EXCLUDED.rating,
        review = EXCLUDED.review,
        communication_rating = EXCLUDED.communication_rating,
        quality_rating = EXCLUDED.quality_rating,
        timeliness_rating = EXCLUDED.timeliness_rating
      RETURNING *
    `;

    const values = [
      agentId,
      clientId,
      taskId,
      rating,
      review,
      communicationRating,
      qualityRating,
      timelinessRating,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async createClientRating(reviewsData) {
    const {
      clientId,
      agentId,
      taskId,
      rating,
      review,
      paymentPromptness,
      clarityRating,
    } = reviewsData;

    const query = `
      INSERT INTO client_ratings (
        client_id, agent_id, task_id, rating, review, 
        payment_promptness, clarity_rating
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (task_id) 
      DO UPDATE SET 
        rating = EXCLUDED.rating,
        review = EXCLUDED.review,
        payment_promptness = EXCLUDED.payment_promptness,
        clarity_rating = EXCLUDED.clarity_rating
      RETURNING *
    `;

    const values = [
      clientId,
      agentId,
      taskId,
      rating,
      review,
      paymentPromptness,
      clarityRating,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAgentRatings(agentId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        ar.*,
        c.first_name as client_first_name, c.last_name as client_last_name,
        c.avatar_url as client_avatar,
        t.title as task_title
      FROM agent_ratings ar
      JOIN users c ON ar.client_id = c.id
      LEFT JOIN tasks t ON ar.task_id = t.id
      WHERE ar.agent_id = $1
      ORDER BY ar.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [agentId, limit, offset]);

    // Get average rating
    const avgResult = await pool.query(
      `SELECT 
        AVG(rating) as average_rating,
        AVG(communication_rating) as avg_communication,
        AVG(quality_rating) as avg_quality,
        AVG(timeliness_rating) as avg_timeliness,
        COUNT(*) as total_reviews
       FROM agent_ratings 
       WHERE agent_id = $1`,
      [agentId]
    );

    return {
      ratings: result.rows,
      stats: avgResult.rows[0],
      pagination: {
        page,
        limit,
      },
    };
  }

  static async findClientRatings(clientId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        cr.*,
        a.first_name as agent_first_name, a.last_name as agent_last_name,
        a.avatar_url as agent_avatar,
        t.title as task_title
      FROM client_ratings cr
      JOIN users a ON cr.agent_id = a.id
      LEFT JOIN tasks t ON cr.task_id = t.id
      WHERE cr.client_id = $1
      ORDER BY cr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [clientId, limit, offset]);

    // Get average rating
    const avgResult = await pool.query(
      `SELECT 
        AVG(rating) as average_rating,
        AVG(payment_promptness) as avg_payment_promptness,
        AVG(clarity_rating) as avg_clarity,
        COUNT(*) as total_reviews
       FROM client_ratings 
       WHERE client_id = $1`,
      [clientId]
    );

    return {
      ratings: result.rows,
      stats: avgResult.rows[0],
      pagination: {
        page,
        limit,
      },
    };
  }

  static async findByTaskTask(taskId) {
    const query = `
      SELECT 
        'agent' as review_type,
        ar.rating, ar.review, ar.created_at,
        c.first_name as reviewer_first_name, c.last_name as reviewer_last_name
      FROM agent_ratings ar
      JOIN users c ON ar.client_id = c.id
      WHERE ar.task_id = $1
      
      UNION ALL
      
      SELECT 
        'client' as review_type,
        cr.rating, cr.review, cr.created_at,
        a.first_name as reviewer_first_name, a.last_name as reviewer_last_name
      FROM client_ratings cr
      JOIN users a ON cr.agent_id = a.id
      WHERE cr.task_id = $1
      
      ORDER BY created_at
    `;

    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  static async getAgentStats(agentId) {
    const query = `
      SELECT 
        COALESCE(AVG(rating), 0) as average_rating,
        COALESCE(AVG(communication_rating), 0) as avg_communication,
        COALESCE(AVG(quality_rating), 0) as avg_quality,
        COALESCE(AVG(timeliness_rating), 0) as avg_timeliness,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
      FROM agent_ratings
      WHERE agent_id = $1
    `;

    const result = await pool.query(query, [agentId]);

    if (result.rows.length === 0) {
      return {
        average_rating: 0,
        avg_communication: 0,
        avg_quality: 0,
        avg_timeliness: 0,
        total_reviews: 0,
        positive_reviews: 0,
        negative_reviews: 0,
      };
    }

    return result.rows[0];
  }

  static async getClientStats(clientId) {
    const query = `
      SELECT 
        COALESCE(AVG(rating), 0) as average_rating,
        COALESCE(AVG(payment_promptness), 0) as avg_payment_promptness,
        COALESCE(AVG(clarity_rating), 0) as avg_clarity,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
      FROM client_ratings
      WHERE client_id = $1
    `;

    const result = await pool.query(query, [clientId]);

    if (result.rows.length === 0) {
      return {
        average_rating: 0,
        avg_payment_promptness: 0,
        avg_clarity: 0,
        total_reviews: 0,
        positive_reviews: 0,
        negative_reviews: 0,
      };
    }

    return result.rows[0];
  }
}

module.exports = Review;
