const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return new Error('Too many retries. Redis caching disabled.');
      }
      return Math.min(retries * 50, 500);
    }
  }
});

let isConnected = false;

client.on('error', (err) => {
  if (isConnected) console.log('Redis Connection Error:', err.message);
  isConnected = false;
});

client.on('connect', () => {
  console.log('Redis successfully connected! ⚡');
  isConnected = true;
});

// Immediately-invoked function to connect
(async () => {
  try {
    await client.connect();
  } catch(e) {
    console.log('Redis is not running. App will proceed without caching.');
  }
})();

// Create a safe wrapper so the app doesn't crash or hang if Redis is down
const redisClient = {
  get: async (key) => {
    if (!isConnected) return null;
    try { return await client.get(key); } catch(e) { return null; }
  },
  setEx: async (key, time, value) => {
    if (!isConnected) return;
    try { await client.setEx(key, time, value); } catch(e) {}
  },
  del: async (keys) => {
    if (!isConnected) return;
    try { await client.del(keys); } catch(e) {}
  },
  keys: async (pattern) => {
    if (!isConnected) return [];
    try { return await client.keys(pattern); } catch(e) { return []; }
  }
};

module.exports = redisClient;