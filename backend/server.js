const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Environment variables load karna
dotenv.config();

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Assuming default Vite port, adjust if needed
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Pass 'io' to all routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Online user tracking
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  socket.on('join_personal_room', (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    
    // Broadcast that this user is now online
    io.emit('user_online', userId);
    
    // Send the current list of online users to the character who just connected
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      io.emit('user_offline', disconnectedUserId);
    }
  });
});

// Uploaded images ko public (static) banane ke liye
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes import karna
const authRoute = require('./routes/auth');
const communityRoute = require('./routes/community');
const postRoute = require('./routes/post');
const commentRoute = require('./routes/Comment');
const userRoute = require('./routes/user');
const searchRoute = require('./routes/search');
const notificationRoute = require('./routes/notifications');

// API Routes ko use karna
app.use('/api/auth', authRoute);
app.use('/api/communities', communityRoute);
app.use('/api/posts', postRoute);
app.use('/api/comments', commentRoute);
app.use('/api/users', userRoute);
app.use('/api/search', searchRoute);
app.use('/api/notifications', notificationRoute);


// Basic Route
app.get('/', (req, res) => {
    res.send('Reddit Clone API is running!');
});

// MongoDB Connection (Yeh block sabse important hai database ke liye)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB successfully connected! 🚀'))
  .catch((err) => console.log('Database connection error:', err));

const PORT = process.env.PORT || 5000;

// Server Start karna
server.listen(PORT, () => {
    console.log(`Server & Socket.IO running on port ${PORT} ⚡`);
});