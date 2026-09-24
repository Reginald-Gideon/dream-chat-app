const bcyrpt = require('bcrypt');
const pool = require('./db');

async function createTestUser() {
    const email = 'test@example.com';
    const password = 'password123';
    const username = 'testuser';

    const hashedPassword = await bcyrpt.hash(password, 10);
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, username) 
        VALUES ($1, $2, $3) RETURNING *`,
        [email, hashedPassword, username]
    );
    console.log('Test user created:', result.rows[0]);
    process.exit(0);
}
createTestUser()