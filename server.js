require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const authMiddleware = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

function orderUserIds(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// auth routes

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// users

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE id != $1',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// conversations

app.post('/api/conversations', authMiddleware, async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required.' });
  }

  const [userOneId, userTwoId] = orderUserIds(req.userId, otherUserId);

  try {
    const existing = await pool.query(
      `SELECT * FROM conversations WHERE user_one_id = $1 AND user_two_id = $2`,
      [userOneId, userTwoId]
    );
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    const created = await pool.query(
      `INSERT INTO conversations (user_one_id, user_two_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userOneId, userTwoId]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error('Conversation error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         c.id AS conversation_id,
         CASE WHEN c.user_one_id = $1 THEN u2.username ELSE u1.username END AS other_username,
         CASE WHEN c.user_one_id = $1 THEN c.user_two_id ELSE c.user_one_id END AS other_user_id,
         m.content AS last_message,
         m.created_at AS last_message_at
       FROM conversations c
       JOIN users u1 ON c.user_one_id = u1.id
       JOIN users u2 ON c.user_two_id = u2.id
       LEFT JOIN LATERAL (
         SELECT content, created_at
         FROM messages
         WHERE messages.conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE c.user_one_id = $1 OR c.user_two_id = $1
       ORDER BY m.created_at DESC NULLS LAST`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// messages

app.post('/api/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (content, user_id, conversation_id)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [content, req.userId, conversationId]
    );

    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.userId]);
    const fullMessage = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      conversationId: Number(conversationId),
    };

    io.to(`conversation:${conversationId}`).emit('newMessage', fullMessage);

    res.status(201).json(fullMessage);
  } catch (err) {
    console.error('Post message error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.get('/api/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  try {
    const result = await pool.query(
      `SELECT messages.id, messages.content, messages.created_at, users.username
       FROM messages
       JOIN users ON messages.user_id = users.id
       WHERE messages.conversation_id = $1
       ORDER BY messages.created_at ASC`,
      [conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// socket.io setup

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  const userId = socket.userId;

  // mark this user online (increment their connection count)
  const count = onlineUsers.get(userId) || 0;
  onlineUsers.set(userId, count + 1);

  if (count === 0) {
    io.emit('userOnline', userId); // only announce if they weren't already online
  }

  // send the full current online list to this newly-connected socket
  socket.emit('onlineUsers', Array.from(onlineUsers.keys()));

  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    const current = onlineUsers.get(userId) || 1;
    if (current <= 1) {
      onlineUsers.delete(userId);
      io.emit('userOffline', userId);
    } else {
      onlineUsers.set(userId, current - 1);
    }
  });
});
// Checking user status if online or not
const onlineUsers = new Map();

io.use((socket,next)=>{
  const token = socket.handshake.auth.token;
  if(!token){
    return next(new Error('No token provided'));
  }
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    
    next();
  } 
  catch(err){
    next(new Error('Invalid token'));
  }
})


server.listen(3001, () => {
  console.log('Server is running on port 3001');
});