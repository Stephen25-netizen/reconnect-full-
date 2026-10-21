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
        (SELECT COUNT(*) FROM items WHERE status = 'active')::int AS active_items,
        (SELECT COUNT(*) FROM claims WHERE status = 'pending')::int AS pending_claims
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
        u.name AS owner_name
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

// List claims for authorized administrators
exports.getClaims = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id,
        c.item_id,
        c.claimant_id,
        c.message,
        c.status,
        c.created_at,
        i.title AS item_title,
        u.name AS claimant_name
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

// Approve or reject a claim transactionally
async function reviewClaim(req, res, newStatus) {
  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    const claimResult = await client.query(
      `SELECT id, item_id, status
       FROM claims
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!claimResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Claim not found.'
      });
    }

    const claim = claimResult.rows[0];

    const itemResult = await client.query(
      `SELECT id, status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [claim.item_id]
    );

    if (!itemResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    const item = itemResult.rows[0];

    if (claim.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This claim has already been reviewed.'
      });
    }

    if (newStatus === 'approved') {
      if (item.status !== 'active') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'This item is not active and cannot receive an approved claim.'
        });
      }

      const existingApproval = await client.query(
        `SELECT id
         FROM claims
         WHERE item_id = $1
           AND status = 'approved'
           AND id <> $2
         LIMIT 1`,
        [claim.item_id, claim.id]
      );

      if (existingApproval.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Another claim has already been approved for this item.'
        });
      }

      await client.query(
        `UPDATE items
         SET status = 'claimed'
         WHERE id = $1`,
        [claim.item_id]
      );
    }

    const updatedClaim = await client.query(
      `UPDATE claims
       SET status = $1
       WHERE id = $2
       RETURNING id, item_id, status`,
      [newStatus, claim.id]
    );

    await client.query('COMMIT');

    return res.json({
      message: `Claim ${newStatus} successfully.`,
      claim: updatedClaim.rows[0]
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error(`Admin claim ${newStatus} error:`, err.message);

    return res.status(500).json({
      error: `Unable to ${newStatus} claim.`
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

exports.approveClaim = (req, res) =>
  reviewClaim(req, res, 'approved');

exports.rejectClaim = (req, res) =>
  reviewClaim(req, res, 'rejected');