const db = require('../config/db');

// Load the existing matching/notification function if available.
let notifyPossibleMatches = null;

try {
  const matching = require('../services/matchingService');

  if (typeof matching.notifyPossibleMatches === 'function') {
    notifyPossibleMatches = matching.notifyPossibleMatches;
  }
} catch (err) {
  console.warn(
    'Matching service not loaded. Item posting will still work:',
    err.message
  );
}

// List items with optional search and filters
exports.list = async (req, res) => {
  try {
    const {
      search = '',
      category = 'All',
      type = 'All',
      status = 'active',
      date = '',
      location = ''
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

    if (location.trim()) {
      params.push(`%${location.trim()}%`);
      where.push(`i.location ILIKE $${params.length}`);
    }

    if (date.trim()) {
      params.push(date.trim());
      where.push(`i.item_date = $${params.length}`);
    }

    const result = await db.query(
      `
        SELECT i.*, u.name AS owner_name, u.email AS owner_email
        FROM items i
        JOIN users u ON u.id = i.user_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY i.created_at DESC
      `,
      params
    );

    return res.json({ items: result.rows });
  } catch (err) {
    console.error('List items error:', err.message);

    return res.status(500).json({
      error: 'Could not load items.'
    });
  }
};

// Get one item's details
exports.getOne = async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT i.*, u.name AS owner_name, u.email AS owner_email
        FROM items i
        JOIN users u ON u.id = i.user_id
        WHERE i.id = $1
      `,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    return res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Get item error:', err.message);

    return res.status(500).json({
      error: 'Could not load item.'
    });
  }
};

// Create a lost or found item
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

    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload at least one photo of the item.'
      });
    }

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

    const imageUrl = `/uploads/${req.file.filename}`;

    const result = await db.query(
      `
        INSERT INTO items (
          user_id,
          title,
          description,
          category,
          location,
          type,
          item_date,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
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

    // A notification problem must not undo a successfully created item.
    if (notifyPossibleMatches) {
      try {
        await notifyPossibleMatches(item);
      } catch (notificationError) {
        console.error(
          'Possible-match notification error:',
          notificationError.message
        );
      }
    }

    return res.status(201).json({ item });
  } catch (err) {
    console.error('Create item error:', err);

    return res.status(500).json({
      error: 'Could not create item.',
      detail: err.message
    });
  }
};

// Update an item
exports.update = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT * FROM items WHERE id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ error: 'Item not found.' });
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
      item_date,
      status
    } = req.body;

    if (type && !['lost', 'found'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be lost or found.'
      });
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : old.image_url;

    const result = await db.query(
      `
        UPDATE items
        SET title = $1,
            description = $2,
            category = $3,
            location = $4,
            type = $5,
            item_date = $6,
            image_url = $7,
            status = $8
        WHERE id = $9
        RETURNING *
      `,
      [
        title || old.title,
        description || old.description,
        category || old.category,
        location || old.location,
        type || old.type,
        item_date || old.item_date,
        imageUrl,
        status || old.status,
        req.params.id
      ]
    );

    return res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Update item error:', err.message);

    return res.status(500).json({
      error: 'Could not update item.'
    });
  }
};

// Delete an item
exports.remove = async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT user_id FROM items WHERE id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if (
      String(existing.rows[0].user_id) !== String(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'You can only delete your own items.'
      });
    }

    await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);

    return res.json({
      message: 'Item deleted successfully.'
    });
  } catch (err) {
    console.error('Delete item error:', err.message);

    return res.status(500).json({
      error: 'Could not delete item.'
    });
  }
};

// List the logged-in user's items
exports.mine = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    return res.json({ items: result.rows });
  } catch (err) {
    console.error('My items error:', err.message);

    return res.status(500).json({
      error: 'Could not load your items.'
    });
  }
};