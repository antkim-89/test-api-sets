const express = require('express');
const router = express.Router();

// Process Payment
router.post('/pay', (req, res) => {
  const { orderId, amount, paymentMethod } = req.body;
  if (!orderId || !amount || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields: orderId, amount, paymentMethod" });
  }
  const transactionId = `tx-${Math.floor(Math.random() * 900000) + 100000}`;
  res.status(200).json({
    message: "Payment processed successfully",
    transactionId: transactionId,
    orderId: orderId,
    amount: amount,
    status: "approved",
    timestamp: new Date().toISOString()
  });
});

// Cancel Payment
router.post('/cancel', (req, res) => {
  const { transactionId, reason } = req.body;
  if (!transactionId) {
    return res.status(400).json({ error: "Missing transactionId" });
  }
  res.status(200).json({
    message: "Payment cancelled successfully",
    transactionId: transactionId,
    status: "refunded",
    refundReason: reason || "User request",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
