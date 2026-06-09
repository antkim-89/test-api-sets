const express = require('express');
const router = express.Router();

// Get User Profile
router.get('/profile', (req, res) => {
  res.json({
    id: "user-12345",
    name: "Hong Gil Dong",
    email: "gildong@example.com",
    role: "premium"
  });
});

// User Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  res.json({
    message: "Login successful",
    token: "mock-jwt-token-xyz-123456789"
  });
});

module.exports = router;
