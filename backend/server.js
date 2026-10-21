const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Existing uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API health check
app.get('/', (_req, res) => {
  res.json({
    status: 'Reconnect API is running successfully.',
    version: '2.0.0'
  });
});

// Existing routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);

// New messaging routes
app.use('/api/messages', messageRoutes);

// New notification routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);


// Handle unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found.'
    });
  }

  next();
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);

  res.status(err.status || 400).json({
    error: err.message || 'Request failed.'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});