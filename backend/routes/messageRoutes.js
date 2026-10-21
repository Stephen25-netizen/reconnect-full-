const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.use(auth);

// Start a conversation about an item
router.post('/item/:itemId', messageController.createConversation);

// Get all conversations
router.get('/conversations', messageController.listConversations);

// Get messages in a conversation
router.get(
  '/conversations/:conversationId/messages',
  messageController.getMessages
);

// Send a message
router.post(
  '/conversations/:conversationId/messages',
  messageController.sendMessage
);

// Mark messages as read
router.patch(
  '/conversations/:conversationId/read',
  messageController.markMessagesRead
);

module.exports = router;