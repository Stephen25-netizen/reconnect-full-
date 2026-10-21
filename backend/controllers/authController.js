const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function tokenFor(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required.'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({
        error: 'Name and email are required.'
      });
    }

    const exists = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (exists.rowCount) {
      return res.status(409).json({
        error: 'Email is already registered.'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, role, created_at`,
      [cleanName, cleanEmail, hash, phone || null]
    );

    const user = result.rows[0];

    return res.status(201).json({
      user,
      token: tokenFor(user)
    });
  } catch (err) {
    console.error('Registration error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Email is already registered.'
      });
    }

    return res.status(500).json({
      error: 'Registration failed.'
    });
  }
};

// Log in an existing user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at
    };

    return res.json({
      user: safeUser,
      token: tokenFor(safeUser)
    });
  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      error: 'Login failed.'
    });
  }
};

// Get the currently authenticated user
exports.me = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    return res.json({
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Get current user error:', err);

    return res.status(500).json({
      error: 'Unable to retrieve user.'
    });
  }
};