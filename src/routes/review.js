const express = require('express');
const router = express.Router();

// Get Product Reviews
router.get('/:productId', (req, res) => {
  const { productId } = req.params;
  res.json({
    productId: productId,
    averageRating: 4.7,
    reviews: [
      { id: "rev-1", author: "Alice", rating: 5, comment: "Absolutely love it!" },
      { id: "rev-2", author: "Bob", rating: 4, comment: "Pretty good, but could be cheaper." }
    ]
  });
});

// Write Review
router.post('/', (req, res) => {
  const { productId, author, rating, comment } = req.body;
  if (!productId || !author || !rating) {
    return res.status(400).json({ error: "Missing required fields: productId, author, rating" });
  }
  res.status(201).json({
    message: "Review submitted successfully",
    review: { productId, author, rating, comment, createdAt: new Date().toISOString() }
  });
});

module.exports = router;
