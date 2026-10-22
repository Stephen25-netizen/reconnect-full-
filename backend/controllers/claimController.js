const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.create = async (req, res) => {
  let uploadedFile = req.file;

  try {
    const { message, identifying_details } = req.body;

    // Validate the claim message
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Please provide a claim message.'
      });
    }

    // Require details explaining how the claimant identifies the item
    if (!identifying_details || !identifying_details.trim()) {
      return res.status(400).json({
        error: 'Please provide identifying details to help prove ownership.'
      });
    }

    // Confirm that the item exists
    const item = await db.query(
      'SELECT id, user_id, status FROM items WHERE id = $1',
      [req.params.itemId]
    );

    if (!item.rowCount) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    // Prevent users from claiming their own items
    if (String(item.rows[0].user_id) === String(req.user.id)) {
      return res.status(400).json({
        error: 'You cannot claim your own item.'
      });
    }

    // Only active items can receive claims
    if (item.rows[0].status !== 'active') {
      return res.status(400).json({
        error: 'This item is no longer active.'
      });
    }

    // Save the uploaded image path, if one was provided
    const proofImageUrl = uploadedFile
  ? `/private-uploads/${uploadedFile.filename}`
  : null;
    // Save the claim and ownership evidence
    const result = await db.query(
      `INSERT INTO claims (
        item_id,
        claimant_id,
        message,
        identifying_details,
        proof_image_url
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        req.params.itemId,
        req.user.id,
        message.trim(),
        identifying_details.trim(),
        proofImageUrl
      ]
    );

    return res.status(201).json({
      message: 'Claim submitted successfully.',
      claim: result.rows[0]
    });

  } catch (err) {
    // Delete the uploaded file if the database operation fails
    if (uploadedFile) {
  fs.unlink(
    path.join(__dirname, '..', 'private-uploads', uploadedFile.filename),
    () => {}
  );
}

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'You have already submitted a claim for this item.'
      });
    }

    console.error('Create claim error:', err);

    return res.status(500).json({
      error: 'Could not submit claim.'
    });
  }
};


// Get claims submitted by the logged-in user
exports.mine = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        c.*,
        i.title,
        i.type,
        i.image_url,
        u.name AS owner_name
      FROM claims c
      JOIN items i ON i.id = c.item_id
      JOIN users u ON u.id = i.user_id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ claims: result.rows });

  } catch (err) {
    console.error('Get my claims error:', err);
    res.status(500).json({
      error: 'Could not retrieve your claims.'
    });
  }
};
// Get claims submitted against items owned by the logged-in user
exports.forOwner = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        c.*,
        i.title,
        i.type,
        i.image_url,
        i.user_id,
        u.name AS claimant_name
      FROM claims c
      JOIN items i ON i.id = c.item_id
      JOIN users u ON u.id = c.claimant_id
      WHERE i.user_id = $1
      ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    return res.json({ claims: result.rows });

  } catch (err) {
    console.error('Get received claims error:', err.message);
console.error('SQL error position:', err.position);
console.error('SQL query being executed:', `
SELECT
  c.*,
  i.title,
  i.type,
  i.image_url,
  i.user_id,
  u.name AS claimant_name
FROM claims c
JOIN items i ON i.id = c.item_id
JOIN users u ON u.id = c.claimant_id
WHERE i.user_id = $1
ORDER BY c.created_at DESC
`);
    return res.status(500).json({
      error: 'Could not retrieve received claims.'
    });
  }
};

// Approve or reject a claim
// Approve or reject a claim safely
exports.update = async (req, res) => {
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'Status must be approved or rejected.'
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the claim and its item while processing the decision.
    const claimResult = await client.query(
      `SELECT
         c.id,
         c.item_id,
         c.claimant_id,
         c.status AS claim_status,
         i.user_id AS owner_id,
         i.status AS item_status
       FROM claims c
       JOIN items i ON i.id = c.item_id
       WHERE c.id = $1
       FOR UPDATE OF c, i`,
      [req.params.id]
    );

    if (!claimResult.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Claim or associated item not found.'
      });
    }

    const claim = claimResult.rows[0];

    // Only the item owner or an administrator may decide.
    if (
      String(claim.owner_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        error: 'Not authorized to update this claim.'
      });
    }

    // Decisions can be made only once.
    if (claim.claim_status !== 'pending') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'This claim has already been decided.'
      });
    }

    if (status === 'approved') {
      // Only active items can receive an approved claim.
      if (claim.item_status !== 'active') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: 'This item is no longer available for claiming.'
        });
      }

      // Locking the item prevents concurrent approvals through
      // this transaction from approving competing claims.
      const otherApproved = await client.query(
        `SELECT id
         FROM claims
         WHERE item_id = $1
           AND status = 'approved'
           AND id <> $2
         LIMIT 1`,
        [claim.item_id, claim.id]
      );

      if (otherApproved.rowCount) {
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

    const updated = await client.query(
      `UPDATE claims
       SET status = $1
       WHERE id = $2
         AND status = 'pending'
       RETURNING *`,
      [status, claim.id]
    );

    if (!updated.rowCount) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'The claim was already updated.'
      });
    }

    await client.query('COMMIT');

    return res.json({
      message: `Claim ${status} successfully.`,
      claim: updated.rows[0]
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Claim transaction rollback error:', rollbackError);
    }

    console.error('Update claim error:', err);

    return res.status(500).json({
      error: 'Could not update the claim.'
    });
  } finally {
    client.release();
  }
};