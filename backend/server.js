const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Environment variables load karna
dotenv.config();

// Initialize Redis Client Connection
require('./utils/redisClient');

const app = express();
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const http = require('http');
const { Server } = require('socket.io');

// Share online users map across the app
app.set('onlineUsers', new Map());

// 🛡️ Security: Agar backend Cloudflare, Nginx ya kisi cloud provider (Render/Heroku) ke piche hai
// Toh yeh zaroori hai, warna Rate Limiter sabko ek hi Proxy IP samajh kar block kar dega!
app.set('trust proxy', 1);

const chatCleanup = require('./services/chatCleanup'); // Auto-Destruct Service
const { startCronJob } = require('./jobs/cleanupJob'); // Auto-Cleanup DB Job

// ==========================================
// 🚀 CORS CONFIGURATION (UPDATED & FIXED)
// ==========================================
// CORS must be the VERY FIRST middleware so OPTIONS preflight requests are handled immediately!
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://vartalap.live',
  'https://www.vartalap.live',
  process.env.FRONTEND_URL 
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow flexible matching for subdomains if needed, or stick to explicit whitelist
    return callback(new Error('CORS policy violation'));
  },
  credentials: true
}));

// 🔒 Security: Use Helmet to set secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.disable('x-powered-by'); // Hide server info

const server = http.createServer(app);

// 📝 Logging: Track all incoming HTTP requests to detect anomalies or attacks
app.use(morgan('combined')); // 'combined' format IP address, Date, URL, Status aur User-Agent print karta hai

// Middleware
app.use(express.json({ limit: '1mb' })); // 🔒 Security: Limit body size to prevent OOM attacks
app.use(cookieParser()); // 🍪 Ye cookies ko read karne ke liye zaroori hai!

// 🔒 Security: Prevent NoSQL Injection attacks by sanitizing incoming data 
app.use(mongoSanitize());

// 🔒 Security: Prevent XSS attacks (Cross-site script injection)
app.use(xss());

// 🔒 Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// CORS Block removed from here as it was moved to the very top of the middleware stack.

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

// 🔒 Security: Rate limit auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per window
  message: { message: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Pass 'io' to all routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🔒 Security: Verify JWT token before allowing Socket.IO connections
io.use(async (socket, next) => {
  // Extract token from HttpOnly cookie
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

  // Fallback to auth payload if token is passed manually (e.g. mobile apps / Postman)
  if (!token) {
    token = socket.handshake.auth?.token;
  }

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    // 🛡️ Security: Check if token is blacklisted (Logged out)
    const BlacklistToken = require('./models/BlacklistToken');
    const isBlacklisted = await BlacklistToken.findOne({ token });
    if (isBlacklisted) {
      return next(new Error("Authentication error: Token is blacklisted/logged out"));
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
    // 🔒 Security: Only allow joining your OWN room
    if (socket.userId && socket.userId === userId) {
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      io.emit('user_online', userId);
      socket.emit('online_users_list', Array.from(onlineUsers.keys()));
    }
  });

  socket.on('disconnect', () => {
    // O(1) Check: Sirf tabhi delete karo jab current socket ID Map me ho
    // (Yeh multiple tabs wale bug ko bhi rokkega)
    if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', socket.userId);
    }
  });

  // ==========================================
  // 💬 CHAT ROOM SOCKET LOGIC
  // ==========================================
  socket.on('join_chat_room', async (roomId) => {
    try {
      const ChatRoom = require('./models/ChatRoom');
      const User = require('./models/User');
      
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const user = await User.findById(socket.userId);
      if (!user || user.isBanned) return;

      const isParticipant = room.participants.some(p => p.toString() === socket.userId);
      
      // 🛡️ SECURITY: Sirf participants ya admins hi room ke socket mein jud sakte hain!
      if (!isParticipant && !user.isAdmin) {
        console.log(`[SECURITY] Blocked unauthorized join attempt to room ${roomId} by user ${socket.userId}`);
        return;
      }

      socket.join(`room_${roomId}`);
    } catch (err) {
      console.error("Socket join_chat_room error:", err);
    }
  });

  socket.on('leave_chat_room', (roomId) => {
    socket.leave(`room_${roomId}`);
  });

  socket.on('send_chat_message', async (data) => {
    try {
        // data contains: roomId, text, codeSnippet, media (array), senderId
        const ChatMessage = require('./models/ChatMessage');
        const ChatRoom = require('./models/ChatRoom');

        // 🛡️ SECURITY Check before accepting message
        const room = await ChatRoom.findById(data.roomId);
        if (!room) return;

        // Is the socket sender actually part of this room?
        const isParticipant = room.participants.some(p => p.toString() === socket.userId);
        if (!isParticipant) {
            console.log(`[SECURITY] Blocked unauthorized socket message attempt from user ${socket.userId} in room ${data.roomId}`);
            return;
        }
        
        const newMessage = new ChatMessage({
            room: data.roomId,
            sender: socket.userId,
            text: data.text || '',
            codeSnippet: data.codeSnippet || '',
            media: data.media || [],
            replyTo: data.replyToId || null
        });

        await newMessage.save();

        // Populate sender info before emitting to everyone in the room
        await newMessage.populate('sender', 'username profilePic');
        if (newMessage.replyTo) {
            await newMessage.populate({ path: 'replyTo', populate: { path: 'sender', select: 'username profilePic' } });
        }

        // Broadcast the message to the specific room
        io.to(`room_${data.roomId}`).emit('receive_chat_message', newMessage);

    } catch (err) {
        console.error("Socket error saving chat message:", err);
    }
  });

  // ==========================================
  // 🎤 VOICE PARTY WEBRTC SIGNALING
  // ==========================================
  socket.on('join-voice-room', async (roomId, userId) => {
    try {
      // 🛡️ SECURITY: Verify that the voice room actually exists and is active
      const VoiceRoom = require('./models/VoiceRoom');
      const room = await VoiceRoom.findById(roomId);
      if (!room || !room.isActive) {
        return;
      }

      socket.join(`voice-${roomId}`);
      // Notify others in the room that a new user connected so they can initiate a WebRTC offer
      socket.to(`voice-${roomId}`).emit('user-connected-voice', { socketId: socket.id, userId });
    } catch (err) {
      console.error("Socket join voice room error:", err);
    }
  });

  socket.on('voice-offer', (payload) => {
    io.to(payload.targetSocketId).emit('voice-offer', {
      callerSocketId: socket.id,
      sdp: payload.sdp
    });
  });

  socket.on('voice-answer', (payload) => {
    io.to(payload.callerSocketId).emit('voice-answer', {
      answererSocketId: socket.id,
      sdp: payload.sdp
    });
  });

  socket.on('voice-candidate', (payload) => {
    io.to(payload.targetSocketId).emit('voice-candidate', {
      senderSocketId: socket.id,
      candidate: payload.candidate
    });
  });

  socket.on('leave-voice-room', (roomId) => {
    socket.leave(`voice-${roomId}`);
    socket.to(`voice-${roomId}`).emit('user-disconnected-voice', socket.id);
  });

  // Handle sudden disconnect for voice rooms
  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('voice-')) {
        socket.to(room).emit('user-disconnected-voice', socket.id);
      }
    });
  });
});

// Uploaded images ko public (static) banane ke liye
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔒 Security: Anti-CSRF Middleware
app.use((req, res, next) => {
  // Sirf data change karne wali requests (POST, PUT, DELETE, PATCH) par check lagao
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // 1. Custom Header Check
    if (req.headers['x-csrf-protection'] !== '1') {
      return res.status(403).json({ message: "Forbidden: Possible CSRF Attack blocked! 🛡️" });
    }

    // 2. Strict Origin/Referer Validation
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: "Forbidden: Cross-Site Request Forgery (Origin mismatch) blocked! 🛡️" });
    }
    
    if (!origin && referer) {
      try {
        const refererUrl = new URL(referer);
        if (!allowedOrigins.includes(refererUrl.origin)) {
          return res.status(403).json({ message: "Forbidden: Cross-Site Request Forgery (Referer mismatch) blocked! 🛡️" });
        }
      } catch (e) {}
    }
  }
  next();
});

// Routes import karna
const authRoute = require('./routes/auth');
const communityRoute = require('./routes/community');
const postRoute = require('./routes/post');
const commentRoute = require('./routes/Comment');
const userRoute = require('./routes/user');
const searchRoute = require('./routes/search');
const notificationRoute = require('./routes/notifications');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin'); // Import Admin router
const uploadRoute = require('./routes/upload');
const chatRoute = require('./routes/chat'); // Temporary Chat Rooms
const eventRoute = require('./routes/event');
const voiceRoute = require('./routes/voice');
const systemMessageRoute = require('./routes/systemMessages');

// 🔒 Security: Global Rate Limiter for all other API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes for generic API calls
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply global rate limiter to all /api routes
app.use('/api', apiLimiter);

// API Routes ko use karna
app.use('/api/auth', authLimiter, authRoute); // 🔒 Strict Rate limited
app.use('/api/communities', communityRoute);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes); // Mount Admin Router
app.use('/api/posts', postRoute);
app.use('/api/comments', commentRoute);
app.use('/api/users', userRoute);
app.use('/api/search', searchRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/chat', chatRoute);
app.use('/api/events', eventRoute);
app.use('/api/voice', voiceRoute);
app.use('/api/system-messages', systemMessageRoute);

// Basic Route
app.get('/', (req, res) => {
    res.send('Vartalap API is running!');
});

// 🚨 404 Not Found Middleware (Catch-all for invalid routes)
app.use((req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// 🛠️ Global Error Handling Middleware
app.use((err, req, res, next) => {
  // Agar status code pehle se set nahi hai (e.g., 200), toh use 500 (Internal Server Error) set karein
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  res.json({
    message: err.message,
    // 🔒 Security: Production mein stack trace hide karna zaroori hai taaki hackers ko backend structure ka pata na chale
    stack: process.env.NODE_ENV === 'production' ? '🥞 Stack trace hidden' : err.stack,
  });
});
// mongodb
// MongoDB Connection
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB successfully connected! 🚀');

    // Seed Default System Message if none exist
    const SystemMessage = require('./models/SystemMessage');
    const User = require('./models/User');
    const msgCount = await SystemMessage.countDocuments();
    if (msgCount === 0) {
      let admin = await User.findOne({ isAdmin: true });
      if (!admin) admin = await User.findOne();
      
      if (admin) {
        await SystemMessage.create({
          title: "Welcome to Vartalap! 🎉",
          content: "Welcome to our new community platform! This is the global inbox where you will receive important updates, feature announcements, and news directly from the admins. Enjoy your stay!",
          createdBy: admin._id
        });
        console.log("Seeded default System Message.");
      }
    }

    server.listen(PORT, () => {
      console.log(`Server & Socket.IO running on port ${PORT} ⚡`);
      // 🧹 Initialize the Auto-Destruct Sweeper
      chatCleanup.initializeCleanupSweep();
      // 🧹 Initialize Auto DB Cleanup Cron Job
      startCronJob();
    });
  })
  .catch((err) => console.log('Database connection error:', err));