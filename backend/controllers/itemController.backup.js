const db = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { search = '', category = 'All', type = 'All', status = 'active' } = req.query;
    const params = [];
    const where = [];

    if (status !== 'All') {
      params.push(status);
      where.push(`i.status = $${params.length}`);
    }
    if (category !== 'All') {
      params.push(category);
      where.push(`i.category = $${params.length}`);
    }
    if (type !== 'All') {
      params.push(type);
      where.push(`i.type = $${params.length}`);
    }
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(i.title ILIKE $${params.length} OR i.location ILIKE $${params.length} OR i.description ILIKE $${params.length})`);
    }

    const result = await db.query(`
      SELECT i.*, u.name AS owner_name, u.email AS owner_email
      FROM items i
      JOIN users u ON u.id=i.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY i.created_at DESC
    `, params);

    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not load items.', detail: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
      FROM items i JOIN users u ON u.id=i.user_id
      WHERE i.id=$1
    `, [req.params.id]);

    if (!result.rowCount) return res.status(404).json({ error: 'Item not found.' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not load item.', detail: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, category, location, type, item_date } = req.body;
    if (!title || !description || !category || !location || !type) {
      return res.status(400).json({ error: 'Title, description, category, location and type are required.' });
    }
    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'Type must be lost or found.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await db.query(`
      INSERT INTO items (user_id,title,description,category,location,type,item_date,image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [
      req.user.id, title.trim(), description.trim(), category.trim(),
      location.trim(), type, item_date || new Date().toISOString().slice(0,10), imageUrl
    ]);

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not create item.', detail: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM items WHERE id=$1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Item not found.' });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own items.' });
    }

    const old = existing.rows[0];
    const { title, description, category, location, type, item_date, status } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : old.image_url;

    const result = await db.query(`
      UPDATE items SET title=$1,description=$2,category=$3,location=$4,type=$5,
      item_date=$6,image_url=$7,status=$8 WHERE id=$9 RETURNING *
    `, [
      title || old.title, description || old.description, category || old.category,
      location || old.location, type || old.type, item_date || old.item_date,
      imageUrl, status || old.status, req.params.id
    ]);
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update item.', detail: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const existing = await db.query('SELECT user_id FROM items WHERE id=$1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Item not found.' });
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own items.' });
    }
    await db.query('DELETE FROM items WHERE id=$1', [req.params.id]);
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete item.', detail: err.message });
  }
};

exports.mine = async (req, res) => {
  const result = await db.query('SELECT * FROM items WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ items: result.rows });
};
// Mark an item as returned or resolved.
exports.resolve = async (req, res) => {
  try {
    const { resolution } = req.body;

    // Only allow the two supported resolution outcomes.
    if (!['returned', 'resolved'].includes(resolution)) {
      return res.status(400).json({
        error: 'Resolution must be returned or resolved.'
      });
    }

    // Find the item.
    const existing = await db.query(
      'SELECT * FROM items WHERE id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    const item = existing.rows[0];

    // Only the item owner or an administrator can resolve it.
    if (
      String(item.user_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'Only the item owner or an administrator can resolve this item.'
      });
    }

    // Do not allow an item to be resolved twice.
    if (item.status === 'resolved') {
      return res.status(400).json({
        error: 'This item has already been resolved.'
      });
    }

    // An item marked as returned must have an approved claim.
    if (resolution === 'returned') {
      const approvedClaim = await db.query(
        `SELECT id
         FROM claims
         WHERE item_id = $1 AND status = 'approved'
         LIMIT 1`,
        [req.params.id]
      );

      if (!approvedClaim.rowCount) {
        return res.status(400).json({
          error: 'A claim must be approved before marking this item as returned.'
        });
      }
    }

    // Store the final status in the existing items table.
    const updated = await db.query(
      `UPDATE items
       SET status = 'resolved'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    res.json({
      message:
        resolution === 'returned'
          ? 'Item marked as returned successfully.'
          : 'Item marked as resolved successfully.',
      item: updated.rows[0],
      resolution
    });
  } catch (err) {
    console.error('Resolve item error:', err);

    res.status(500).json({
      error: 'Could not resolve this item.'
    });
  }
};
