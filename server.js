const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 포트 및 서비스 매핑 정보
const PORT = parseInt(process.env.PORT || process.argv[2] || 3001, 10);

const SERVICES = {
  3001: { name: 'user', prefix: '/users' },
  3002: { name: 'product', prefix: '/products' },
  3003: { name: 'order', prefix: '/orders' },
  3004: { name: 'payment', prefix: '/payments' },
  3005: { name: 'inventory', prefix: '/inventory' },
  3006: { name: 'cart', prefix: '/cart' },
  3007: { name: 'delivery', prefix: '/delivery' },
  3008: { name: 'notification', prefix: '/notifications' },
  3009: { name: 'review', prefix: '/reviews' },
  3010: { name: 'recommendation', prefix: '/recommendations' }
};

// 매핑이 없는 포트일 때 기본값 설정
const serviceConfig = SERVICES[PORT] || { name: 'user', prefix: '/users' };
const SERVER_ID = `${serviceConfig.name}-service`;

// 1. 공통 Health Check Endpoint
app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    serverId: SERVER_ID,
    serviceType: serviceConfig.name,
    timestamp: new Date().toISOString()
  });
});

// 2. 공통 Delay Endpoint (게이트웨이 타임아웃 테스트용)
app.get('/delay/:ms', (req, res) => {
  const ms = parseInt(req.params.ms, 10) || 1000;
  setTimeout(() => {
    res.json({
      status: 'delayed',
      delay: ms,
      port: PORT,
      serverId: SERVER_ID
    });
  }, ms);
});

// 3. 공통 Error Endpoint (게이트웨이 에러 감지 테스트용)
app.get('/error', (req, res) => {
  res.status(500).json({
    status: 'error',
    message: `Intentionally generated 500 Error from ${SERVER_ID}`,
    port: PORT,
    serverId: SERVER_ID
  });
});

// 4. 공통 Streaming Endpoint (HTTP Chunked Transfer Encoding 테스트용)
app.get('/stream', (req, res) => {
  // Transfer-Encoding: chunked 설정
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  let count = 0;
  const maxCount = 10;
  
  const interval = setInterval(() => {
    count++;
    const data = {
      chunk: count,
      message: `Streaming chunk #${count} from ${SERVER_ID}`,
      port: PORT,
      timestamp: new Date().toISOString()
    };
    
    // JSON 청크 전송 후 개행
    res.write(JSON.stringify(data) + '\n');
    
    if (count >= maxCount) {
      clearInterval(interval);
      res.end();
    }
  }, 1000); // 200ms 간격으로 전송
});

// 5. 고유 마이크로서비스 라우터 로드 및 Swagger 연동
try {
  // 라우터 파일 경로: src/routes/<serviceName>.js
  const routerPath = path.join(__dirname, 'src', 'routes', `${serviceConfig.name}.js`);
  const router = require(routerPath);
  
  // 마이크로서비스에 맞춰 라우터 바인딩
  app.use(serviceConfig.prefix, router);
  
  console.log(`[${SERVER_ID}] Bound router to ${serviceConfig.prefix}`);
} catch (err) {
  console.error(`[${SERVER_ID}] Failed to load router:`, err.message);
}

try {
  // Swagger 스펙 JSON 경로: src/swagger/<serviceName>.swagger.json
  const swaggerSpecPath = path.join(__dirname, 'src', 'swagger', `${serviceConfig.name}.swagger.json`);
  
  // require 캐시를 피하기 위해 fs로 동적 로드
  const fs = require('fs');
  
  // Swagger UI 제공 (req.swaggerDoc을 사용하여 매 요청마다 최신 명세를 동적으로 주입)
  app.use('/api-docs', (req, res, next) => {
    try {
      const latestSpec = JSON.parse(fs.readFileSync(swaggerSpecPath, 'utf8'));
      
      // 요청 호스트(게이트웨이 주소 또는 직접 주소)를 기반으로 servers 필드 오버라이드
      const host = req.headers.host || `localhost:${PORT}`;
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      
      latestSpec.servers = [
        {
          url: `${protocol}://${host}`,
          description: "Current Request Host (Gateway or Direct)"
        }
      ];
      
      // 스웨거 스펙에 공통 /stream 경로 명세를 동적으로 꽂아줍니다
      if (!latestSpec.paths) latestSpec.paths = {};
      latestSpec.paths['/stream'] = {
        "get": {
          "summary": "Streaming response (Chunked Transfer Encoding)",
          "description": "Returns JSON data chunks one by one with a 200ms delay to test Gateway streaming capabilities.",
          "responses": {
            "200": {
              "description": "Stream of JSON chunks"
            }
          }
        }
      };
      
      // swagger-ui-express는 req.swaggerDoc이 정의되어 있으면 이를 바탕으로 문서를 동적으로 렌더링합니다.
      req.swaggerDoc = latestSpec;
      next();
    } catch (err) {
      next(err);
    }
  }, swaggerUi.serve, swaggerUi.setup());
  
  console.log(`[${SERVER_ID}] Swagger UI is available at http://localhost:${PORT}/api-docs`);
} catch (err) {
  console.error(`[${SERVER_ID}] Failed to load Swagger spec:`, err.message);
}

// 서버 기동
app.listen(PORT, () => {
  console.log(`[${SERVER_ID}] Mock API Server is running on port ${PORT}`);
});
