const { pool } = require('../config/db');

const sql = `

-- =========================================
-- 1. USERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 2. ITEMS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL
        CHECK (type IN ('lost', 'found')),
    item_date DATE NOT NULL DEFAULT CURRENT_DATE,
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'claimed', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 3. CLAIMS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL
        REFERENCES items(id) ON DELETE CASCADE,
    claimant_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (item_id, claimant_id)
);


-- =========================================
-- 4. CONVERSATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,

    item_id INTEGER NOT NULL
        REFERENCES items(id) ON DELETE CASCADE,

    participant_one INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    participant_two INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (participant_one <> participant_two),

    UNIQUE (item_id, participant_one, participant_two)
);


-- =========================================
-- 5. MESSAGES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,

    conversation_id INTEGER NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,

    sender_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    message_text TEXT NOT NULL
        CHECK (
            LENGTH(TRIM(message_text)) > 0
            AND LENGTH(message_text) <= 5000
        ),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 6. NOTIFICATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    related_item_id INTEGER
        REFERENCES items(id) ON DELETE SET NULL,

    related_conversation_id INTEGER
        REFERENCES conversations(id) ON DELETE CASCADE,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 7. PERFORMANCE INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_items_type
ON items(type);

CREATE INDEX IF NOT EXISTS idx_items_category
ON items(category);

CREATE INDEX IF NOT EXISTS idx_items_status
ON items(status);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_one
ON conversations(participant_one);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_two
ON conversations(participant_two);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(conversation_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read);

`;

async function initializeDatabase() {
    try {
        await pool.query(sql);

        console.log('Database tables created successfully.');
        console.log('Messaging tables are ready.');
        console.log('Notification tables are ready.');

    } catch (err) {
        console.error('Database initialization failed:', err.message);
        process.exitCode = 1;

    } finally {
        await pool.end();
    }
}

initializeDatabase();