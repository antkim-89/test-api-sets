const express = require('express');
const router = express.Router();

// Create Order
router.post('/', (req, res) => {
  const { userId, items, totalAmount } = req.body;
  if (!userId || !items || !totalAmount) {
    return res.status(400).json({ error: "Missing required order fields: userId, items, totalAmount" });
  }
  const orderId = `ord-${Math.floor(Math.random() * 900000) + 100000}`;
  res.status(201).json({
    message: "Order created successfully",
    orderId: orderId,
    status: "pending_payment",
    totalAmount: totalAmount,
    createdAt: new Date().toISOString()
  });
});

// Get Order Details
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    orderId: id,
    userId: "user-12345",
    items: [
      { productId: "prod-101", quantity: 2, price: 49.99 }
    ],
    totalAmount: 99.98,
    status: "processing",
    deliveryStatus: "preparing"
  });
});

module.exports = router;
