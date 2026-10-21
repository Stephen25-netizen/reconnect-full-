const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// Protect all administrator routes
router.use(auth, adminAuth);

// Dashboard statistics
router.get('/stats', adminController.getStats);

// Registered users
router.get('/users', adminController.getUsers);

// Lost and found items
router.get('/items', adminController.getItems);

// Claims
router.get('/claims', adminController.getClaims);

// Approve a claim
router.patch(
  '/claims/:id/approve',
  adminController.approveClaim
);

// Reject a claim
router.patch(
  '/claims/:id/reject',
  adminController.rejectClaim
);

module.exports = router;