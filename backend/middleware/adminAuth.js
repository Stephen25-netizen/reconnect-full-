const pool = require('../config/db');

module.exports = async function adminAuth(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User account not found.'
      });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({
        error: 'Administrator access required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);

    return res.status(500).json({
      error: 'Unable to verify administrator access.'
    });
  }
};