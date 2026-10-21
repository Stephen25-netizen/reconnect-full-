const router = require('express').Router();
const path = require('path');
const fs = require('fs');

const auth = require('../middleware/auth');
const claimProofUpload = require('../middleware/claimProofUpload');
const c = require('../controllers/claimController');
const db = require('../config/db');

// All claim routes require authentication.
router.use(auth);

// Submit a claim with optional proof image.
router.post(
  '/item/:itemId',
  claimProofUpload.single('proof_image'),
  c.create
);

// Retrieve claims.
router.get('/mine', c.mine);
router.get('/received', c.forOwner);

// Serve private claim-proof images only to authorized users.
router.get('/proof/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    // Accept only generated image filenames, not arbitrary paths.
    if (!/^\d+-[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid image filename.' });
    }

    const result = await db.query(
      `SELECT c.id, c.claimant_id, c.proof_image_url, i.user_id AS owner_id
       FROM claims c
       JOIN items i ON i.id = c.item_id
       WHERE c.proof_image_url = $1`,
      [`/private-uploads/${filename}`]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Proof image not found.' });
    }

    const claim = result.rows[0];
    const isClaimant = String(claim.claimant_id) === String(req.user.id);
    const isOwner = String(claim.owner_id) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isClaimant && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You cannot access this proof image.' });
    }

    const filePath = path.join(
      __dirname,
      '..',
      'private-uploads',
      filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Proof image file not found.' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Proof image access error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve proof image.' });
  }
});

// Approve or reject claims.
router.patch('/:id', c.update);

module.exports = router;