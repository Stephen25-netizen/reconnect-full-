const router = require('express').Router();

const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/itemController');

// Public routes
router.get('/', c.list);

// Authenticated routes — specific paths must come before /:id
router.get('/mine', auth, c.mine);
router.post('/', auth, upload.single('image'), c.create);
router.put('/:id', auth, upload.single('image'), c.update);
router.patch('/:id/resolve', auth, c.resolve);
router.delete('/:id', auth, c.remove);

// Keep the general ID route after /mine
router.get('/:id', c.getOne);

module.exports = router;