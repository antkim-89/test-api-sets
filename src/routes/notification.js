const express = require('express');
const router = express.Router();

// Send Notification
router.post('/send', (req, res) => {
  const { userId, type, message } = req.body;
  if (!userId || !type || !message) {
    return res.status(400).json({ error: "Missing required fields: userId, type, message" });
  }
  res.json({
    message: "Notification sent successfully",
    notificationId: `notif-${Math.floor(Math.random() * 90000) + 10000}`,
    sentVia: type,
    userId: userId
  });
});

// Get Notification History
router.get('/history', (req, res) => {
  res.json([
    { id: "notif-1", type: "email", message: "Your order has shipped", sentAt: new Date().toISOString() },
    { id: "notif-2", type: "sms", message: "Welcome to our service!", sentAt: new Date().toISOString() }
  ]);
});

module.exports = router;
