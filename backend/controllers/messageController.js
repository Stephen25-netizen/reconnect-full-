const { pool } = require('../config/db');

// Create or retrieve a conversation about an item.
exports.createConversation = async (req, res) => {
    try {
        const itemId = Number(req.params.itemId);
        const currentUserId = Number(req.user.id);

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ error: 'Invalid item ID.' });
        }

        // The item must exist and remain active.
        const itemResult = await pool.query(
            `SELECT id, user_id, status, title
             FROM items
             WHERE id = $1`,
            [itemId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found.' });
        }

        const item = itemResult.rows[0];
        const ownerId = Number(item.user_id);

        if (ownerId === currentUserId) {
            return res.status(400).json({
                error: 'You cannot start a conversation with yourself about your own item.'
            });
        }

        if (item.status !== 'active') {
            return res.status(400).json({
                error: 'Messaging is only available for active items.'
            });
        }

        // The two participants are stored in a consistent order.
        const participantOne = Math.min(currentUserId, ownerId);
        const participantTwo = Math.max(currentUserId, ownerId);

        const result = await pool.query(
            `INSERT INTO conversations
                (item_id, participant_one, participant_two)
             VALUES ($1, $2, $3)
             ON CONFLICT (item_id, participant_one, participant_two)
             DO UPDATE SET updated_at = conversations.updated_at
             RETURNING *`,
            [itemId, participantOne, participantTwo]
        );

        return res.status(201).json({
            message: 'Conversation ready.',
            conversation: result.rows[0]
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        return res.status(500).json({
            error: 'Unable to create conversation.'
        });
    }
};


// List conversations belonging to the logged-in user.
exports.listConversations = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const result = await pool.query(
            `SELECT
                c.id,
                c.item_id,
                i.title AS item_title,
                c.participant_one,
                c.participant_two,
                c.created_at,
                c.updated_at,
                CASE
                    WHEN c.participant_one = $1 THEN u2.name
                    ELSE u1.name
                END AS other_participant_name,
                (
                    SELECT m.message_text
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 1
                ) AS last_message,
                (
                    SELECT COUNT(*)::int
                    FROM messages m
                    WHERE m.conversation_id = c.id
                      AND m.sender_id <> $1
                      AND m.is_read = FALSE
                ) AS unread_count
             FROM conversations c
             JOIN items i ON i.id = c.item_id
             JOIN users u1 ON u1.id = c.participant_one
             JOIN users u2 ON u2.id = c.participant_two
             WHERE c.participant_one = $1
                OR c.participant_two = $1
             ORDER BY c.updated_at DESC, c.id DESC`,
            [userId]
        );

        return res.json({ conversations: result.rows });
    } catch (error) {
        console.error('List conversations error:', error);
        return res.status(500).json({
            error: 'Unable to load conversations.'
        });
    }
};


// Retrieve messages from a conversation the user belongs to.
exports.getMessages = async (req, res) => {
    try {
        const conversationId = Number(req.params.conversationId);
        const userId = Number(req.user.id);

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: 'Invalid conversation ID.'
            });
        }

        const access = await pool.query(
            `SELECT id
             FROM conversations
             WHERE id = $1
               AND (participant_one = $2 OR participant_two = $2)`,
            [conversationId, userId]
        );

        if (access.rows.length === 0) {
            return res.status(404).json({
                error: 'Conversation not found.'
            });
        }

        const result = await pool.query(
            `SELECT
                m.id,
                m.conversation_id,
                m.sender_id,
                u.name AS sender_name,
                m.message_text,
                m.is_read,
                m.created_at
             FROM messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC, m.id ASC`,
            [conversationId]
        );

        return res.json({ messages: result.rows });
    } catch (error) {
        console.error('Get messages error:', error);
        return res.status(500).json({
            error: 'Unable to load messages.'
        });
    }
};


// Send a private message.
exports.sendMessage = async (req, res) => {
    try {
        const conversationId = Number(req.params.conversationId);
        const senderId = Number(req.user.id);
        const messageText =
            typeof req.body.message_text === 'string'
                ? req.body.message_text.trim()
                : '';

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: 'Invalid conversation ID.'
            });
        }

        if (!messageText || messageText.length > 5000) {
            return res.status(400).json({
                error: 'Message must contain between 1 and 5000 characters.'
            });
        }

        const conversationResult = await pool.query(
            `SELECT c.id, c.item_id, c.participant_one,
                    c.participant_two, i.status
             FROM conversations c
             JOIN items i ON i.id = c.item_id
             WHERE c.id = $1
               AND (c.participant_one = $2 OR c.participant_two = $2)`,
            [conversationId, senderId]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Conversation not found.'
            });
        }

        const conversation = conversationResult.rows[0];

        if (conversation.status !== 'active') {
            return res.status(400).json({
                error: 'Messaging is unavailable because this item is no longer active.'
            });
        }

        const recipientId =
            Number(conversation.participant_one) === senderId
                ? Number(conversation.participant_two)
                : Number(conversation.participant_one);

        const result = await pool.query(
            `INSERT INTO messages
                (conversation_id, sender_id, message_text)
             VALUES ($1, $2, $3)
             RETURNING id, conversation_id, sender_id,
                       message_text, is_read, created_at`,
            [conversationId, senderId, messageText]
        );

        await pool.query(
            `UPDATE conversations
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [conversationId]
        );

        await pool.query(
            `INSERT INTO notifications
                (user_id, type, title, message,
                 related_item_id, related_conversation_id)
             VALUES ($1, 'new_message', 'New message',
                     'You have received a new message.',
                     $2, $3)`,
            [recipientId, conversation.item_id, conversationId]
        );

        return res.status(201).json({
            message: 'Message sent successfully.',
            sentMessage: result.rows[0]
        });
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({
            error: 'Unable to send message.'
        });
    }
};


// Mark messages from the other participant as read.
exports.markMessagesRead = async (req, res) => {
    try {
        const conversationId = Number(req.params.conversationId);
        const userId = Number(req.user.id);

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return res.status(400).json({
                error: 'Invalid conversation ID.'
            });
        }

        const access = await pool.query(
            `SELECT id
             FROM conversations
             WHERE id = $1
               AND (participant_one = $2 OR participant_two = $2)`,
            [conversationId, userId]
        );

        if (access.rows.length === 0) {
            return res.status(404).json({
                error: 'Conversation not found.'
            });
        }

        await pool.query(
            `UPDATE messages
             SET is_read = TRUE
             WHERE conversation_id = $1
               AND sender_id <> $2
               AND is_read = FALSE`,
            [conversationId, userId]
        );

        return res.json({
            message: 'Messages marked as read.'
        });
    } catch (error) {
        console.error('Mark messages read error:', error);
        return res.status(500).json({
            error: 'Unable to update message status.'
        });
    }
};