const express = require('express');
const router = express.Router();

// Get Delivery Status
router.get('/:orderId', (req, res) => {
  const { orderId } = req.params;
  res.json({
    orderId: orderId,
    trackingNumber: "TRK-987654321",
    carrier: "FastCourier",
    status: "in_transit",
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// Register Shipping Info
router.post('/track', (req, res) => {
  const { orderId, address } = req.body;
  if (!orderId || !address) {
    return res.status(400).json({ error: "Missing orderId or address" });
  }
  res.status(201).json({
    message: "Shipping tracker registered",
    orderId: orderId,
    trackingNumber: "TRK-987654321",
    address: address
  });
});

module.exports = router;
