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

// --- AUTH ---

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
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
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
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
// --Backend 

// --- USERS ---

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

// --- CONVERSATIONS ---

app.post('/api/conversations', authMiddleware, async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required.' });
  }

  const [userOneId, userTwoId] = orderUserIds(req.userId, otherUserId);

   try {
    // must be friends first
    const friendship = await pool.query(
      `SELECT * FROM friendships
       WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
         AND status = 'accepted'`,
      [req.userId, otherUserId]
    );
    if (friendship.rows.length === 0) {
      return res.status(403).json({ message: 'You must be friends to start a conversation.' });
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
// Send a friend request
app.post('/api/friends/request', authMiddleware, async (req, res) => {
  const { addresseeId } = req.body;
  if (!addresseeId) return res.status(400).json({ message: 'addresseeId is required.' });
  if (addresseeId === req.userId) return res.status(400).json({ message: "You can't friend yourself." });

  try {
    // check if a friendship already exists in either direction
    const existing = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [req.userId, addresseeId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'A friend request already exists.', status: existing.rows[0].status });
    }

    const result = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [req.userId, addresseeId]
    );

    io.to(`user:${addresseeId}`).emit('friendRequestReceived', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Respond to a friend request (accept or decline)
app.patch('/api/friends/:friendshipId', authMiddleware, async (req, res) => {
  const { friendshipId } = req.params;
  const { status } = req.body; // 'accepted' or 'declined'

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Status must be accepted or declined.' });
  }

  try {
    // only the addressee can respond to a request sent to them
    const result = await pool.query(
      `UPDATE friendships SET status = $1
       WHERE id = $2 AND addressee_id = $3 AND status = 'pending'
       RETURNING *`,
      [status, friendshipId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Request not found or already handled.' });
    }

    const updated = result.rows[0];
    io.to(`user:${updated.requester_id}`).emit('friendRequestResponded', updated);
    res.json(updated);
  } catch (err) {
    console.error('Respond to request error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// List my friends (accepted only) and anyone I could still friend
app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    const friends = await pool.query(
      `SELECT u.id, u.username
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'`,
      [req.userId]
    );
    res.json(friends.rows);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// List pending requests sent TO me
app.get('/api/friends/requests', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id AS friendship_id, u.id AS requester_id, u.username
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// --- MESSAGES (scoped to a conversation) ---

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
      user_id: req.userId,
      read_at: null,
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
     `SELECT messages.id, messages.content, messages.created_at, messages.read_at, messages.edited_at, messages.user_id, users.username
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
// Backend
// Edit a message — only the sender can edit their own message
app.patch('/api/messages/:messageId', authMiddleware, async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }

  try {
    const result = await pool.query(
      `UPDATE messages
       SET content = $1, edited_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, content, edited_at, conversation_id`,
      [content, messageId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    const updated = result.rows[0];
    io.to(`conversation:${updated.conversation_id}`).emit('messageEdited', updated);

    res.json(updated);
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Delete a message — only the sender can delete their own message
app.delete('/api/messages/:messageId', authMiddleware, async (req, res) => {
  const { messageId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id, conversation_id`,
      [messageId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    const deleted = result.rows[0];
    io.to(`conversation:${deleted.conversation_id}`).emit('messageDeleted', {
      id: deleted.id,
      conversationId: deleted.conversation_id,
    });

    res.status(200).json({ message: 'Message deleted.' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
// --- READ RECEIPTS ---

app.patch('/api/conversations/:conversationId/read', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  try {
    await pool.query(
      `UPDATE messages
       SET read_at = NOW()
       WHERE conversation_id = $1
         AND user_id != $2
         AND read_at IS NULL`,
      [conversationId, req.userId]
    );

    io.to(`conversation:${conversationId}`).emit('messagesRead', {
      conversationId: Number(conversationId),
      readerId: req.userId,
    });

    res.status(200).json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
//Create groups
app.post('/api/groups',authMiddleware,async (req,res)=>{
  const {name,memberIds}=req.body;
  if(!name || !name.trim()){
    return res.status(400).json({message:'Groups name is required.'})
  }
  try{
    const group = await pool.query(
      `INSERT INTO groups (name,created_by) VALUES ($1,$2) RETURNING *`,
      [name,req.userId]
    )
    const groupId = group.rows[0].id;
    //creator joins automatically
    await pool.query(
      `INSERT INTO groups_members (group_id,user_id) VALUES ($1,$2)`,
      [groupId,req.userId]
    )
    //add initial members, but only if they are actually friends 
    if(Array.isArray(memberIds)){
      for (const memberId of memberIds){
        const friendship = await pool.query(
          `SELECT * FROM friendships
           WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
             AND status = 'accepted'`,
          [req.userId, memberId]
        );
        if(friendship.rows.length>0){
          await pool.query(
            `INSERT INTO group_members (group_id,user_id) VALUES ($1,$2)
            ON CONFLICT DO NOTHING`,
            [groupId,memberId]
          )
        }
      }
  }
  res.status(201).json(group.rows[0]);

}catch(err){
console.error('Create group error:',err);
res.status(500).json({message:'Internal server error.'});
  }
})
//listing groups
app.get('/api/groups', authMiddleware, async (req, res) => {
  try{
    const result = await pool.query(
      `SELECT g.id, g.name, g.created_by
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1`,
      [req.userId]
    );
    res.json(result.rows);
  }
  catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
})
//sending group messages
app.post('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }

  try {
    // confirm the sender is actually a member
    const membership = await pool.query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }

    const result = await pool.query(
      `INSERT INTO messages (content, user_id, group_id)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [content, req.userId, groupId]
    );

    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.userId]);
    const fullMessage = {
      ...result.rows[0],
      username: userResult.rows[0].username,
      user_id: req.userId,
      groupId: Number(groupId),
    };

    io.to(`group:${groupId}`).emit('newGroupMessage', fullMessage);

    res.status(201).json(fullMessage);
  } catch (err) {
    console.error('Post group message error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
//fetching group messages
app.get('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await pool.query(
      `SELECT messages.id, messages.content, messages.created_at, messages.user_id, users.username
       FROM messages
       JOIN users ON messages.user_id = users.id
       WHERE messages.group_id = $1
       ORDER BY messages.created_at ASC`,
      [groupId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get group messages error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});
// --- SOCKET.IO SETUP ---

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('No token provided'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log('New connection, userId:', userId);

  const count = onlineUsers.get(userId) || 0;
  onlineUsers.set(userId, count + 1);

  if (count === 0) {
    io.emit('userOnline', userId);
  }

  socket.emit('onlineUsers', Array.from(onlineUsers.keys()));

  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });
socket.join(`user:${userId}`);
  socket.on('disconnect', () => {
    const current = onlineUsers.get(userId) || 1;
    if (current <= 1) {
      onlineUsers.delete(userId);
      io.emit('userOffline', userId);
    } else {
      onlineUsers.set(userId, current - 1);
    }
  });
  socket.on('joinGroup', (groupId) => {
  socket.join(`group:${groupId}`);
});
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});