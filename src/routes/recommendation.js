const express = require('express');
const router = express.Router();

// Get Personalized Recommendations
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({
    userId: userId,
    recommendations: [
      { productId: "prod-103", name: "Ergonomic Office Chair", score: 0.98 },
      { productId: "prod-101", name: "Premium Wireless Mouse", score: 0.85 }
    ]
  });
});

// Get Trending Recommendations
router.get('/trending', (req, res) => {
  res.json([
    { productId: "prod-102", name: "Mechanical Keyboard", viewsCount: 1540 },
    { productId: "prod-103", name: "Ergonomic Office Chair", viewsCount: 1200 }
  ]);
});

module.exports = router;
