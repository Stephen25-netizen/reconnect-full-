const db = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { message } = req.body;
    const item = await db.query('SELECT id,user_id,status FROM items WHERE id=$1', [req.params.itemId]);
    if (!item.rowCount) return res.status(404).json({ error: 'Item not found.' });
    if (item.rows[0].user_id === req.user.id) return res.status(400).json({ error: 'You cannot claim your own item.' });
    if (item.rows[0].status !== 'active') return res.status(400).json({ error: 'This item is no longer active.' });
    if (!message) return res.status(400).json({ error: 'Please provide a claim message.' });

    const result = await db.query(`
      INSERT INTO claims (item_id,claimant_id,message)
      VALUES ($1,$2,$3)
      RETURNING *
    `, [req.params.itemId, req.user.id, message.trim()]);

    res.status(201).json({ claim: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You have already submitted a claim for this item.' });
    res.status(500).json({ error: 'Could not submit claim.', detail: err.message });
  }
};

exports.mine = async (req, res) => {
  const result = await db.query(`
    SELECT c.*, i.title, i.type, i.image_url, u.name AS owner_name
    FROM claims c
    JOIN items i ON i.id=c.item_id
    JOIN users u ON u.id=i.user_id
    WHERE c.claimant_id=$1
    ORDER BY c.created_at DESC
  `, [req.user.id]);
  res.json({ claims: result.rows });
};

exports.forOwner = async (req, res) => {
  const result = await db.query(`
    SELECT c.*, i.title, i.user_id, u.name AS claimant_name, u.email AS claimant_email, u.phone AS claimant_phone
    FROM claims c
    JOIN items i ON i.id=c.item_id
    JOIN users u ON u.id=c.claimant_id
    WHERE i.user_id=$1
    ORDER BY c.created_at DESC
  `, [req.user.id]);
  res.json({ claims: result.rows });
};

exports.update = async (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected.' });
  }

  const claim = await db.query(`
    SELECT c.*, i.user_id, i.id AS item_id
    FROM claims c JOIN items i ON i.id=c.item_id
    WHERE c.id=$1
  `, [req.params.id]);

  if (!claim.rowCount) return res.status(404).json({ error: 'Claim not found.' });
  if (claim.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this claim.' });
  }

  const updated = await db.query('UPDATE claims SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (status === 'approved') {
    await db.query('UPDATE items SET status=$1 WHERE id=$2', ['claimed', claim.rows[0].item_id]);
  }
  res.json({ claim: updated.rows[0] });
};
