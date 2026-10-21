const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// Protect every route: authentication first, then admin authorization.
router.use(auth, adminAuth);

// Dashboard data
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/items', adminController.getItems);
router.get('/claims', adminController.getClaims);

// Claim review
router.patch('/claims/:id/approve', adminController.approveClaim);
router.patch('/claims/:id/reject', adminController.rejectClaim);

module.exports = router;