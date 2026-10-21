const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const exists = await db.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email is already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name,email,password_hash,phone)
       VALUES ($1,$2,$3,$4)
       RETURNING id,name,email,phone,role,created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, phone || null]
    );

    const user = result.rows[0];
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.', detail: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email || '']);
    if (!result.rowCount) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password || '', user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const safeUser = {
      id: user.id, name: user.name, email: user.email,
      phone: user.phone, role: user.role, created_at: user.created_at
    };
    res.json({ user: safeUser, token: tokenFor(safeUser) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.', detail: err.message });
  }
};

exports.me = async (req, res) => {
  const result = await db.query(
    'SELECT id,name,email,phone,role,created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: result.rows[0] });
};
