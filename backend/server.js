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

const app = express();
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

// 🔒 Security: Use Helmet to set secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.disable('x-powered-by'); // Hide server info

const server = http.createServer(app);


// 📝 Logging: Track all incoming HTTP requests to detect anomalies or attacks
app.use(morgan('combined')); // 'combined' format IP address, Date, URL, Status aur User-Agent print karta hai

// Middleware
app.use(express.json({ limit: '1mb' })); // 🔒 Security: Limit body size to prevent OOM attacks
app.use(cookieParser()); // 🍪 Ye cookies ko read karne ke liye zaroori hai!

// 🔒 Security: Restrict CORS to known frontend origins only
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL // Add your production URL in .env
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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

// Online user tracking
const onlineUsers = new Map(); // userId -> socketId

// 🔒 Security: Verify JWT token before allowing Socket.IO connections
io.use((socket, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

io.on('connection', (socket) => {
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

// 🔒 Security: Anti-CSRF Middleware
app.use((req, res, next) => {
  // Sirf data change karne wali requests (POST, PUT, DELETE, PATCH) par check lagao
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (req.headers['x-csrf-protection'] !== '1') {
      return res.status(403).json({ message: "Forbidden: Possible CSRF Attack blocked! 🛡️" });
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
const reportRoute = require('./routes/report');
const uploadRoute = require('./routes/upload');

// API Routes ko use karna
app.use('/api/auth', authLimiter, authRoute); // 🔒 Rate limited
app.use('/api/communities', communityRoute);
app.use('/api/posts', postRoute);
app.use('/api/comments', commentRoute);
app.use('/api/users', userRoute);
app.use('/api/search', searchRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/reports', reportRoute);
app.use('/api/upload', uploadRoute);

// Basic Route
app.get('/', (req, res) => {
    res.send('Reddit Clone API is running!');
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

// MongoDB Connection (Yeh block sabse important hai database ke liye)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB successfully connected! 🚀'))
  .catch((err) => console.log('Database connection error:', err));

const PORT = process.env.PORT || 5000;

// Server Start karna
server.listen(PORT, () => {
    console.log(`Server & Socket.IO running on port ${PORT} ⚡`);
});