const express = require('express');
const router = express.Router();

// Get Cart Items
router.get('/', (req, res) => {
  res.json({
    userId: "user-12345",
    items: [
      { productId: "prod-101", quantity: 1, addedAt: new Date().toISOString() },
      { productId: "prod-102", quantity: 2, addedAt: new Date().toISOString() }
    ],
    updatedAt: new Date().toISOString()
  });
});

// Add Item to Cart
router.post('/add', (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ error: "Missing productId or quantity" });
  }
  res.json({
    message: "Item added to cart successfully",
    addedItem: { productId, quantity }
  });
});

module.exports = router;
