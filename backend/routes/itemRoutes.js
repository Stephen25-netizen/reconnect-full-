const router = require('express').Router();

const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/itemController');

// Public routes
router.get('/', c.getAll);

// Authenticated route — place BEFORE /:id
router.get('/mine', auth, c.getMine);

// Public item details
router.get('/:id', c.getOne);

// Authenticated item management
router.post('/', auth, upload.single('image'), c.create);
router.put('/:id', auth, upload.single('image'), c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;