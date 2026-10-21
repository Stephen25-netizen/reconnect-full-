const db = require('../config/db');

// Get administrator dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM items)::int AS total_items,
        (SELECT COUNT(*) FROM claims)::int AS total_claims,
        (SELECT COUNT(*) FROM messages)::int AS total_messages,
        (SELECT COUNT(*) FROM items WHERE status = 'active')::int
          AS active_items,
        (SELECT COUNT(*) FROM claims WHERE status = 'pending')::int
          AS pending_claims
    `);

    return res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error('Admin statistics error:', err.message);
    return res.status(500).json({
      error: 'Unable to load administrator statistics.'
    });
  }
};

// List registered users without exposing password hashes
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, phone, role, created_at
      FROM users
      ORDER BY created_at DESC NULLS LAST, id DESC
    `);

    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err.message);
    return res.status(500).json({
      error: 'Unable to load registered users.'
    });
  }
};

// List all items
exports.getItems = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        i.id,
        i.title,
        i.description,
        i.category,
        i.location,
        i.type,
        i.status,
        i.created_at,
        i.user_id,
        u.name AS owner_name,
        u.email AS owner_email
      FROM items i
      LEFT JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC NULLS LAST, i.id DESC
    `);

    return res.json({ items: result.rows });
  } catch (err) {
    console.error('Admin items error:', err.message);
    return res.status(500).json({
      error: 'Unable to load item listings.'
    });
  }
};

// List all claims
exports.getClaims = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id,
        c.item_id,
        c.claimant_id,
        c.message,
        c.identifying_details,
        c.status,
        c.created_at,
        i.title AS item_title,
        u.name AS claimant_name,
        u.email AS claimant_email
      FROM claims c
      LEFT JOIN items i ON i.id = c.item_id
      LEFT JOIN users u ON u.id = c.claimant_id
      ORDER BY c.created_at DESC NULLS LAST, c.id DESC
    `);

    return res.json({ claims: result.rows });
  } catch (err) {
    console.error('Admin claims error:', err.message);
    return res.status(500).json({
      error: 'Unable to load claims.'
    });
  }
};
// Approve a pending claim
exports.approveClaim = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE claims
       SET status = 'approved'
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Claim not found or already reviewed.'
      });
    }

    return res.json({
      message: 'Claim approved successfully.',
      claim: result.rows[0]
    });
  } catch (err) {
    console.error('Approve claim error:', err.message);
    return res.status(500).json({
      error: 'Unable to approve claim.'
    });
  }
};


// Reject a pending claim
exports.rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE claims
       SET status = 'rejected'
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Claim not found or already reviewed.'
      });
    }

    return res.json({
      message: 'Claim rejected successfully.',
      claim: result.rows[0]
    });
  } catch (err) {
    console.error('Reject claim error:', err.message);
    return res.status(500).json({
      error: 'Unable to reject claim.'
    });
  }
};