const express = require('express');
const router = express.Router();

// Get Inventory Count
router.get('/:productId', (req, res) => {
  const { productId } = req.params;
  res.json({
    productId: productId,
    stock: 42,
    location: "Aisle-3-Shelf-B",
    lastUpdated: new Date().toISOString()
  });
});

// Reduce Inventory Stock
router.post('/reduce', (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ error: "Missing productId or quantity" });
  }
  res.json({
    message: "Inventory reduced successfully",
    productId: productId,
    reducedQuantity: quantity,
    remainingStock: 35
  });
});

module.exports = router;
