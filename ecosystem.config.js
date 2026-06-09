const services = [
  'user-service',
  'product-service',
  'order-service',
  'payment-service',
  'inventory-service',
  'cart-service',
  'delivery-service',
  'notification-service',
  'review-service',
  'recommendation-service'
];

module.exports = {
  apps: [
    ...services.map((name, i) => {
      const port = 3001 + i;
      return {
        name: name,
        script: './server.js',
        watch: false,
        env: {
          NODE_ENV: 'development',
          PORT: port
        }
      };
    }),
    {
      name: 'gateway-dashboard',
      script: './dashboard.js',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    }
  ]
};
