const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const token = header.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
