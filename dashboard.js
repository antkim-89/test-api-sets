const express = require('express');
const path = require('path');
const autocannon = require('autocannon');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public 디렉토리의 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 10개 마이크로서비스 정보 정의
const SERVICES = [
  { id: 0, name: 'user', port: 3001, controlPort: 4001, prefix: '/users' },
  { id: 1, name: 'product', port: 3002, controlPort: 4002, prefix: '/products' },
  { id: 2, name: 'order', port: 3003, controlPort: 4003, prefix: '/orders' },
  { id: 3, name: 'payment', port: 3004, controlPort: 4004, prefix: '/payments' },
  { id: 4, name: 'inventory', port: 3005, controlPort: 4005, prefix: '/inventory' },
  { id: 5, name: 'cart', port: 3006, controlPort: 4006, prefix: '/cart' },
  { id: 6, name: 'delivery', port: 3007, controlPort: 4007, prefix: '/delivery' },
  { id: 7, name: 'notification', port: 3008, controlPort: 4008, prefix: '/notifications' },
  { id: 8, name: 'review', port: 3009, controlPort: 4009, prefix: '/reviews' },
  { id: 9, name: 'recommendation', port: 3010, controlPort: 4010, prefix: '/recommendations' }
];

// 부하 테스트 시나리오 정의
const SCENARIOS = {
  'mixed': [
    { method: 'GET', path: '/users/profile' },
    { method: 'GET', path: '/products' },
    { method: 'GET', path: '/products/prod-100' },
    { 
      method: 'POST', 
      path: '/cart/add', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ productId: 'prod-100', quantity: 1 }) 
    },
    { 
      method: 'POST', 
      path: '/orders', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ cartId: 'cart-123', items: [{ productId: 'prod-100', quantity: 1 }] }) 
    },
    { method: 'GET', path: '/reviews/prod-100' },
    { method: 'GET', path: '/recommendations/user/user-123' }
  ],
  'auth-failure': [
    { 
      method: 'POST', 
      path: '/users/login', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }) 
    },
    { 
      method: 'GET', 
      path: '/users/profile', 
      headers: { 'Authorization': 'Bearer invalid-token' } 
    },
    { 
      method: 'GET', 
      path: '/users/profile'
    }
  ],
  'router-stress': [
    { method: 'GET', path: '/nonexistent-route-999' },
    { method: 'GET', path: '/invalid-path/test/abc' },
    { method: 'GET', path: '/error/500' },
    { method: 'GET', path: '/error/400' },
    { method: 'GET', path: '/error/503' }
  ],
  'latency-stress': [
    { method: 'GET', path: '/delay/500' },
    { method: 'GET', path: '/delay/1000' },
    { method: 'GET', path: '/delay/2000' }
  ],
  'transaction-heavy': [
    { 
      method: 'POST', 
      path: '/orders', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ productId: 'prod-999', quantity: 10 }) 
    },
    { 
      method: 'POST', 
      path: '/payments/pay', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ orderId: 'ord-555', amount: 99000, method: 'easy' }) 
    },
    { 
      method: 'POST', 
      path: '/payments/cancel', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ paymentId: 'pay-222', reason: 'user_error' }) 
    },
    { 
      method: 'POST', 
      path: '/delivery/track', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ deliveryId: 'del-111' }) 
    }
  ]
};


// 3. 실시간 부하 테스트 모니터링용 SSE 스트리밍
let sseClients = [];
app.get('/api/stress/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  sseClients.push(res);
  console.log(`[Dashboard] SSE client connected. Active: ${sseClients.length}`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
    console.log(`[Dashboard] SSE client disconnected. Active: ${sseClients.length}`);
  });
});

function broadcastSSE(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// 4. 부하 테스트 실행 API
let activeTestInstance = null;
app.post('/api/stress', (req, res) => {
  if (activeTestInstance) {
    return res.status(400).json({ error: '이미 부하 테스트가 실행 중입니다.' });
  }

  const { target, connections, duration, scenario } = req.body;
  const cleanTarget = target ? (target.endsWith('/') ? target.slice(0, -1) : target) : 'http://localhost:8000';
  const conns = parseInt(connections, 10) || 100;
  const dur = parseInt(duration, 10) || 10;
  const scen = scenario || 'mixed';

  const selectedRequests = SCENARIOS[scen];
  if (!selectedRequests) {
    return res.status(400).json({ error: `알 수 없는 시나리오: ${scen}` });
  }

  console.log(`[Dashboard] Starting stress test. Target: ${cleanTarget}, Scenario: ${scen}`);
  broadcastSSE({ type: 'start', target: cleanTarget, connections: conns, duration: dur, scenario: scen });

  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed++;
    const percentage = Math.min(Math.round((elapsed / dur) * 100), 99);
    broadcastSSE({ type: 'progress', percentage, elapsed });
  }, 1000);

  activeTestInstance = autocannon({
    url: cleanTarget,
    connections: conns,
    duration: dur,
    requests: selectedRequests,
    pipelining: 1
  }, (err, result) => {
    clearInterval(interval);
    activeTestInstance = null;

    if (err) {
      console.error('[Dashboard] Autocannon execution error:', err);
      broadcastSSE({ type: 'error', error: err.message });
    } else {
      console.log(`[Dashboard] Stress test completed successfully.`);
      const formattedResult = autocannon.printResult(result);
      broadcastSSE({ type: 'done', result, formattedResult });
    }
  });

  res.json({ message: '부하 테스트가 백그라운드에서 시작되었습니다.' });
});

// 포트 3000에서 구동
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`💻 Gateway Test Web Dashboard Server is running`);
  console.log(`👉 Access URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
