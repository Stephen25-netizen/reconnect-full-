const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/claimController');

router.post('/item/:itemId', auth, c.create);
router.get('/mine', auth, c.mine);
router.get('/received', auth, c.forOwner);
router.patch('/:id', auth, c.update);

module.exports = router;
