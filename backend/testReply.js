const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
      email: 'sahil.tyagi615@gmail.com', // fallback
      password: 'password123'
    }).catch(async () => {
       // Just register a temp user if login fails
       return await axios.post('http://127.0.0.1:5000/api/auth/register', {
         username: 'testuser_reply',
         email: 'testuser_reply@test.com',
         password: 'password123'
       });
    });

    const token = loginRes.data.token;
    console.log("Logged in!");

    // Create a dummy post first
    // mongoose to create a community and post directly, or just via API
    // Actually, we can fetch latest post ID
    const db = await mongoose.connect(process.env.MONGO_URI);
    const Post = require('./models/Post');
    const latestPost = await Post.findOne();
    if (!latestPost) { console.log("No post found!"); process.exit(1); }

    // 1. Comment on it
    const commentRes = await axios.post('http://127.0.0.1:5000/api/comments/add', {
      content: 'Hello world',
      postId: latestPost._id.toString()
    }, { headers: { Authorization: 'Bearer ' + token }});
    const commentId = commentRes.data.comment._id;
    console.log("Commented! ID:", commentId);

    // 2. Reply to it immediately!
    const replyRes = await axios.post('http://127.0.0.1:5000/api/comments/add', {
      content: 'Replying to hello world',
      postId: latestPost._id.toString(),
      parentCommentId: commentId
    }, { headers: { Authorization: 'Bearer ' + token }});
    console.log("Replied! ID:", replyRes.data.comment._id);

  } catch(e) {
    console.error("FAILED:");
    if (e.response && e.response.data) console.error(e.response.data);
    else console.error(e.message);
  } finally {
    process.exit(0);
  }
}
run();
