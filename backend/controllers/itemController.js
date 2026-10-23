const db = require('../config/db');

// ==================================================
// GET ALL ITEMS
// GET /api/items
// ==================================================

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        i.*,
        u.name AS owner_name
      FROM items i
      LEFT JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC
    `);

    return res.status(200).json({
      items: result.rows
    });
  } catch (error) {
    console.error('Get all items error:', error);

    return res.status(500).json({
      error: 'Could not load items.'
    });
  }
};
// GET ONE ITEM
// GET /api/items/:id

exports.getOne = async (req, res) => {
  const itemId = Number(req.params.id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({
      error: 'Invalid item ID.'
    });
  }

  const sql = `
    SELECT
      i.*,
      u.name AS owner_name
    FROM items AS i
    LEFT JOIN users AS u ON u.id = i.user_id
    WHERE i.id = $1
  `;

  try {
    console.log('GET ONE SQL:', JSON.stringify(sql));
    console.log('GET ONE ITEM ID:', itemId);

    const result = await db.query(sql, [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found.'
      });
    }

    return res.status(200).json({
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Get item error:', err.message);
    console.error('PostgreSQL error code:', err.code);
    console.error('PostgreSQL error position:', err.position);
    console.error('PostgreSQL error detail:', err.detail);
    console.error('PostgreSQL error hint:', err.hint);

    return res.status(500).json({
      error: 'Could not load item.'
    });
  }
};

// ==================================================
// GET ITEMS BELONGING TO THE LOGGED-IN USER
// GET /api/items/mine
// ==================================================

exports.getMine = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'You must log in to view your items.'
      });
    }

    const result = await db.query(
      `
        SELECT
          i.*,
          u.name AS owner_name
        FROM items AS i
        LEFT JOIN users AS u ON u.id = i.user_id
        WHERE i.user_id = $1
        ORDER BY i.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      items: result.rows
    });
  } catch (error) {
    console.error('Get my items error:', error.message);

    return res.status(500).json({
      error: 'Could not load your items.'
    });
  }
};
// ==================================================
// CREATE ITEM
// POST /api/items
// ==================================================

exports.create = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      location,
      date_lost_found,
      image_url
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'You must log in to post an item.'
      });
    }

    if (
      !title ||
      !description ||
      !category ||
      !type ||
      !location
    ) {
      return res.status(400).json({
        error: 'Please provide all required item details.'
      });
    }

    const result = await db.query(
      `
        INSERT INTO items (
          title,
          description,
          category,
          type,
          location,
          date_lost_found,
          image_url,
          user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        title.trim(),
        description.trim(),
        category,
        type,
        location.trim(),
        date_lost_found || null,
        image_url || null,
        userId
      ]
    );

    return res.status(201).json({
      message: 'Item posted successfully.',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Create item error:', error);

    return res.status(500).json({
      error: 'Could not create item.'
    });
  }
};


// ==================================================
// UPDATE ITEM
// PUT /api/items/:id
// ==================================================

exports.update = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const userId = req.user?.id;

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({
        error: 'Invalid item ID.'
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'You must log in to update an item.'
      });
    }

    const {
      title,
      description,
      category,
      type,
      location,
      date_lost_found,
      image_url
    } = req.body;

    const result = await db.query(
      `
        UPDATE items
        SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          type = COALESCE($4, type),
          location = COALESCE($5, location),
          date_lost_found = COALESCE($6, date_lost_found),
          image_url = COALESCE($7, image_url)
        WHERE id = $8
          AND user_id = $9
        RETURNING *
      `,
      [
        title ?? null,
        description ?? null,
        category ?? null,
        type ?? null,
        location ?? null,
        date_lost_found ?? null,
        image_url ?? null,
        itemId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found or you are not allowed to update it.'
      });
    }

    return res.status(200).json({
      message: 'Item updated successfully.',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Update item error:', error);

    return res.status(500).json({
      error: 'Could not update item.'
    });
  }
};


// ==================================================
// DELETE ITEM
// DELETE /api/items/:id
// ==================================================

exports.remove = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const userId = req.user?.id;

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({
        error: 'Invalid item ID.'
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'You must log in to delete an item.'
      });
    }

    const result = await db.query(
      `
        DELETE FROM items
        WHERE id = $1
          AND user_id = $2
        RETURNING id
      `,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found or you are not allowed to delete it.'
      });
    }

    return res.status(200).json({
      message: 'Item deleted successfully.'
    });
  } catch (error) {
    console.error('Delete item error:', error);

    return res.status(500).json({
      error: 'Could not delete item.'
    });
  }
};