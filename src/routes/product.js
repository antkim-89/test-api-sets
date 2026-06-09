const express = require('express');
const router = express.Router();

// Get Product List
router.get('/', (req, res) => {
  res.json([
    { id: "prod-101", name: "Premium Wireless Mouse", price: 49.99, category: "electronics" },
    { id: "prod-102", name: "Mechanical Keyboard", price: 89.99, category: "electronics" },
    { id: "prod-103", name: "Ergonomic Office Chair", price: 199.99, category: "furniture" }
  ]);
});

// Get Product Detail
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id: id,
    name: `Mock Product - ${id}`,
    price: 99.99,
    description: `This is a mock description for product ${id}`,
    inStock: true
  });
});

module.exports = router;
