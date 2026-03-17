const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const xss = require('xss'); // ✅ Naya safe package import kiya

// Environment variables load karna
dotenv.config();

// Initialize Redis Client Connection
require('./utils/redisClient');

const app = express();
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
// const xssClean = require('xss-clean'); // ❌ Is purane package ko hata diya
const hpp = require('hpp');
const http = require('http');
const { Server } = require('socket.io');

// Share online users map across the app
app.set('onlineUsers', new Map());

// 🛡️ Security: Trust proxy for Render/Cloudflare
app.set('trust proxy', 1);

const chatCleanup = require('./services/chatCleanup'); // Auto-Destruct Service
const { startCronJob } = require('./jobs/cleanupJob'); // Auto-Cleanup DB Job

// ==========================================
// 🚀 CORS CONFIGURATION
// ==========================================
// 🚀 CORS Configuration (Simplest & Most Robust)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://vartalap.live',
  'https://www.vartalap.live',
  'https://api.vartalap.live' // API origin ko bhi safety ke liye add kar do
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // 2. Check if origin is in our whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error("CORS Blocked Origin:", origin); // Logs mein origin check karne ke liye
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-protection', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

// 🔒 Security: Use Helmet with pop-up support
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.disable('x-powered-by'); 

const server = http.createServer(app);

app.use(morgan('combined'));

// Middleware
app.use(express.json({ limit: '1mb' })); 
app.use(cookieParser()); 

// 🔒 Security: Prevent NoSQL Injection
// app.use(mongoSanitize());

// ==========================================
// 🛡️ MODERN XSS PROTECTION (FIXED CRASH)
// ==========================================
/*app.use((req, res, next) => {
  // Body sanitize karna
  if (req.body) {
    const cleanBody = xss(JSON.stringify(req.body));
    req.body = JSON.parse(cleanBody);
  }
  // Query sanitize karna (Read-only error se bachne ke liye individual cleaning)
  if (req.query) {
    try {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = xss(req.query[key]);
        }
      });
    } catch (e) {
      console.log("XSS: Query sanitization skipped for some fields to prevent crash");
    }
  }
  next();
});*/

// 🔒 Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// ==========================================
// 🔌 SOCKET.IO CONFIGURATION
// ==========================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { message: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.use(async (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie;
  let token = null;
  
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.token;
  }

  if (!token) {
    token = socket.handshake.auth?.token;
  }

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const BlacklistToken = require('./models/BlacklistToken');
    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) {
      return next(new Error("Authentication error: Token is blacklisted"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

io.on('connection', (socket) => {
  const onlineUsers = app.get('onlineUsers');

  socket.on('join_personal_room', (userId) => {
    if (socket.userId && socket.userId === userId) {
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      io.emit('user_online', userId);
      socket.emit('online_users_list', Array.from(onlineUsers.keys()));
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', socket.userId);
    }
  });

  socket.on('join_chat_room', async (roomId) => {
    try {
      const ChatRoom = require('./models/ChatRoom');
      const User = require('./models/User');
      const room = await ChatRoom.findById(roomId);
      if (!room) return;
      const user = await User.findById(socket.userId);
      if (!user || user.isBanned) return;
      const isParticipant = room.participants.some(p => p.toString() === socket.userId);
      if (!isParticipant && !user.isAdmin) return;
      socket.join(`room_${roomId}`);
    } catch (err) {
      console.error("Socket join_chat_room error:", err);
    }
  });

  socket.on('send_chat_message', async (data) => {
    try {
        const ChatMessage = require('./models/ChatMessage');
        const ChatRoom = require('./models/ChatRoom');
        const room = await ChatRoom.findById(data.roomId);
        if (!room) return;
        const isParticipant = room.participants.some(p => p.toString() === socket.userId);
        if (!isParticipant) return;
        
        const newMessage = new ChatMessage({
            room: data.roomId,
            sender: socket.userId,
            text: data.text || '',
            codeSnippet: data.codeSnippet || '',
            media: data.media || [],
            replyTo: data.replyToId || null
        });
        await newMessage.save();
        await newMessage.populate('sender', 'username profilePic');
        io.to(`room_${data.roomId}`).emit('receive_chat_message', newMessage);
    } catch (err) {
        console.error("Socket error saving chat message:", err);
    }
  });

  // Voice WebRTC Logic
  socket.on('join-voice-room', async (roomId, userId) => {
    try {
      const VoiceRoom = require('./models/VoiceRoom');
      const room = await VoiceRoom.findById(roomId);
      if (!room || !room.isActive) return;
      socket.join(`voice-${roomId}`);
      socket.to(`voice-${roomId}`).emit('user-connected-voice', { socketId: socket.id, userId });
    } catch (err) { console.error(err); }
  });

  socket.on('voice-offer', (payload) => {
    io.to(payload.targetSocketId).emit('voice-offer', { callerSocketId: socket.id, sdp: payload.sdp });
  });

  socket.on('voice-answer', (payload) => {
    io.to(payload.callerSocketId).emit('voice-answer', { answererSocketId: socket.id, sdp: payload.sdp });
  });

  socket.on('voice-candidate', (payload) => {
    io.to(payload.targetSocketId).emit('voice-candidate', { senderSocketId: socket.id, candidate: payload.candidate });
  });

  socket.on('leave-voice-room', (roomId) => {
    socket.leave(`voice-${roomId}`);
    socket.to(`voice-${roomId}`).emit('user-disconnected-voice', socket.id);
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('voice-')) {
        socket.to(room).emit('user-disconnected-voice', socket.id);
      }
    });
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔒 Security: Anti-CSRF Middleware
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (req.headers['x-csrf-protection'] !== '1') {
      return res.status(403).json({ message: "Forbidden: Possible CSRF Attack blocked! 🛡️" });
    }
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: "Forbidden: Origin mismatch! 🛡️" });
    }
  }
  next();
});

// Routes
const authRoute = require('./routes/auth');
const communityRoute = require('./routes/community');
const postRoute = require('./routes/post');
const commentRoute = require('./routes/Comment');
const userRoute = require('./routes/user');
const searchRoute = require('./routes/search');
const notificationRoute = require('./routes/notifications');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin');
const uploadRoute = require('./routes/upload');
const chatRoute = require('./routes/chat');
const eventRoute = require('./routes/event');
const voiceRoute = require('./routes/voice');
const systemMessageRoute = require('./routes/systemMessages');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300, 
  message: { message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoute); 
app.use('/api/communities', communityRoute);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoute);
app.use('/api/comments', commentRoute);
app.use('/api/users', userRoute);
app.use('/api/search', searchRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/chat', chatRoute);
app.use('/api/events', eventRoute);
app.use('/api/voice', voiceRoute);
app.use('/api/system-messages', systemMessageRoute);

app.get('/', (req, res) => {
    res.send('Vartalap API is running!');
});

app.use((req, res, next) => {
  res.status(404).json({ message: "Route Not Found" });
});

// 🛠️ Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err); // Render logs ke liye zaroori hai
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞 Stack trace hidden' : err.stack,
  });
});

// MongoDB Connection
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB successfully connected! 🚀');
    server.listen(PORT, () => {
      console.log(`Server & Socket.IO running on port ${PORT} ⚡`);
      chatCleanup.initializeCleanupSweep();
      startCronJob();
    });
  })
  .catch((err) => console.log('Database connection error:', err));