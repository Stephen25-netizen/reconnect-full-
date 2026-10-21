const db = require('../config/db');

// --------------------------------------------------
// LIST ITEMS
// --------------------------------------------------

exports.list = async (req, res) => {
  try {
    const {
      search = '',
      category = 'All',
      type = 'All',
      status = 'active'
    } = req.query;

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
      where.push(
        `(i.title ILIKE $${params.length}
          OR i.location ILIKE $${params.length}
          OR i.description ILIKE $${params.length})`
      );
    }

    const result = await db.query(
      `SELECT i.*, u.name AS owner_name
       FROM items i
       JOIN users u ON u.id = i.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('List items error:', err);

    res.status(500).json({
      error: 'Could not load items.'
    });
  }
};

// --------------------------------------------------
// GET ONE ITEM
// --------------------------------------------------

exports.getOne = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*,
              u.name AS owner_name,
              u.email AS owner_email,
              u.phone AS owner_phone
       FROM items i
       JOIN users u ON u.id = i.user_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Get item error:', err);

    res.status(500).json({
      error: 'Could not load item.'
    });
  }
};

// --------------------------------------------------
// CREATE ITEM AND CHECK FOR MATCHES
// --------------------------------------------------

exports.create = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      type,
      item_date
    } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category?.trim() ||
      !location?.trim() ||
      !type
    ) {
      return res.status(400).json({
        error: 'Title, description, category, location and type are required.'
      });
    }

    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be lost or found.'
      });
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const result = await db.query(
      `INSERT INTO items
        (user_id, title, description, category, location,
         type, item_date, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description.trim(),
        category.trim(),
        location.trim(),
        type,
        item_date || new Date().toISOString().slice(0, 10),
        imageUrl
      ]
    );

    const item = result.rows[0];

    // Run matching after saving the listing.
    // The notification helper handles its own errors.
    await notifyPossibleMatches(item);

    res.status(201).json({ item });
  } catch (err) {
    console.error('Create item error:', err);

    res.status(500).json({
      error: 'Could not create item.'
    });
  }
};

// --------------------------------------------------
// UPDATE ITEM
// --------------------------------------------------

exports.update = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT * FROM items WHERE id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    const old = existing.rows[0];

    if (
      String(old.user_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'You can only edit your own items.'
      });
    }

    const {
      title,
      description,
      category,
      location,
      type,
      item_date
    } = req.body;

    if (type && !['lost', 'found'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be lost or found.'
      });
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : old.image_url;

    // Do not allow this endpoint to bypass claim/resolution
    // rules by directly changing the item's status.
    const result = await db.query(
      `UPDATE items
       SET title = $1,
           description = $2,
           category = $3,
           location = $4,
           type = $5,
           item_date = $6,
           image_url = $7
       WHERE id = $8
       RETURNING *`,
      [
        title?.trim() || old.title,
        description?.trim() || old.description,
        category?.trim() || old.category,
        location?.trim() || old.location,
        type || old.type,
        item_date || old.item_date,
        imageUrl,
        req.params.id
      ]
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Update item error:', err);

    res.status(500).json({
      error: 'Could not update item.'
    });
  }
};

// --------------------------------------------------
// DELETE ITEM
// --------------------------------------------------

exports.remove = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT user_id FROM items WHERE id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    if (
      String(existing.rows[0].user_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'You can only delete your own items.'
      });
    }

    await db.query(
      'DELETE FROM items WHERE id = $1',
      [req.params.id]
    );

    res.json({
      message: 'Item deleted successfully.'
    });
  } catch (err) {
    console.error('Delete item error:', err);

    res.status(500).json({
      error: 'Could not delete item.'
    });
  }
};

// --------------------------------------------------
// GET CURRENT USER'S ITEMS
// --------------------------------------------------

exports.mine = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM items
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('Get my items error:', err);

    res.status(500).json({
      error: 'Could not load your items.'
    });
  }
};

// --------------------------------------------------
// MARK ITEM AS RETURNED OR RESOLVED
// --------------------------------------------------

exports.resolve = async (req, res) => {
  try {
    const { resolution } = req.body;

    if (!['returned', 'resolved'].includes(resolution)) {
      return res.status(400).json({
        error: 'Resolution must be returned or resolved.'
      });
    }

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

    if (
      String(item.user_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'Only the item owner or an administrator can resolve this item.'
      });
    }

    if (item.status === 'resolved') {
      return res.status(400).json({
        error: 'This item has already been resolved.'
      });
    }

    if (resolution === 'returned') {
      const approvedClaim = await db.query(
        `SELECT id
         FROM claims
         WHERE item_id = $1
           AND status = 'approved'
         LIMIT 1`,
        [req.params.id]
      );

      if (!approvedClaim.rowCount) {
        return res.status(400).json({
          error: 'A claim must be approved before marking this item as returned.'
        });
      }
    }

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