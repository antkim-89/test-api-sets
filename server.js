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

// --- 실시간 제어 상태 및 설정 ---
let serverInstance = null;
let autoRecoveryTimer = null;
const dynamicConfig = {
  delayMs: 0,
  overrides: {} // key: "METHOD:path" -> { statusCode, body, headers }
};

// 메인 서버 기동 함수
function startMainServer() {
  if (serverInstance && serverInstance.listening) {
    console.log(`[${SERVER_ID}] Main server is already listening on port ${PORT}`);
    return;
  }
  
  if (autoRecoveryTimer) {
    clearTimeout(autoRecoveryTimer);
    autoRecoveryTimer = null;
  }

  serverInstance = app.listen(PORT, () => {
    console.log(`[${SERVER_ID}] Mock API Server is running on port ${PORT}`);
  });

  serverInstance.on('close', () => {
    serverInstance = null;
  });
}

// 메인 서버 중지 함수
function stopMainServer(timeoutMs) {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log(`[${SERVER_ID}] Server listener successfully closed. Port ${PORT} is unbound.`);
      
      if (timeoutMs && timeoutMs > 0) {
        console.log(`[${SERVER_ID}] Auto-recovery scheduled in ${timeoutMs}ms.`);
        autoRecoveryTimer = setTimeout(() => {
          console.log(`[${SERVER_ID}] Auto-recovering: starting main server...`);
          startMainServer();
        }, timeoutMs);
      }
    });
  } else {
    console.log(`[${SERVER_ID}] Main server listener is already closed.`);
  }
}

// --- 실시간 지연 및 응답 조작 미들웨어 ---
app.use((req, res, next) => {
  const proceed = () => {
    const reqPath = req.path;
    const reqMethod = req.method.toUpperCase();
    const overrideKey = `${reqMethod}:${reqPath}`;
    
    if (dynamicConfig.overrides[overrideKey]) {
      const override = dynamicConfig.overrides[overrideKey];
      console.log(`[${SERVER_ID}] Intercepted ${reqMethod} ${reqPath} with dynamic override.`);
      
      if (override.headers) {
        Object.keys(override.headers).forEach(headerName => {
          res.setHeader(headerName, override.headers[headerName]);
        });
      }
      
      const status = override.statusCode || 200;
      res.status(status).json(override.body || {});
    } else {
      next();
    }
  };

  if (dynamicConfig.delayMs > 0) {
    setTimeout(proceed, dynamicConfig.delayMs);
  } else {
    proceed();
  }
});

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

// 3. 공통 Error Endpoint (게이트웨이 에러 감지 테스트용 - 다양한 HTTP 상태 코드 지원)
app.get(['/error', '/error/:code'], (req, res) => {
  const code = parseInt(req.params.code || req.query.code, 10) || 500;
  
  // 유효한 HTTP 상태 코드 범위 검증 (100 ~ 599)
  const isValidStatus = code >= 100 && code <= 599;
  const statusCode = isValidStatus ? code : 500;

  res.status(statusCode).json({
    status: 'error',
    message: `Intentionally generated ${statusCode} Error from ${SERVER_ID}`,
    port: PORT,
    serverId: SERVER_ID
  });
});

// 4. 공통 Streaming Endpoint (Server-Sent Events(SSE) 테스트용)
app.get('/stream', (req, res) => {
  // SSE 헤더 설정
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  let count = 0;
  const maxCount = 10;
  
  // 랜덤 지연 시간을 바탕으로 재귀적 setTimeout 호출
  const sendChunk = () => {
    count++;
    
    // 100ms ~ 1000ms 사이의 랜덤 딜레이 계산
    const delay = Math.floor(Math.random() * 900) + 100;
    
    const data = {
      chunk: count,
      message: `Streaming chunk #${count} from ${SERVER_ID}`,
      port: PORT,
      delayApplied: `${delay}ms`,
      timestamp: new Date().toISOString()
    };
    
    // SSE 표준 포맷에 맞게 전송 ("data: <content>\n\n")
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    if (count < maxCount) {
      setTimeout(sendChunk, delay);
    } else {
      res.end();
    }
  };

  // 첫 번째 청크는 즉시 또는 짧은 지연 후 발송
  setTimeout(sendChunk, 50);
});

// 4-1. 공통 Shutdown Endpoint (장애 전파 및 오프라인 모사 테스트용)
app.post('/shutdown', (req, res) => {
  const timeout = parseInt(req.query.timeout || req.body.timeout, 10) || 0;
  res.json({
    message: `Server listener is shutting down. Port ${PORT} will no longer accept connections.`,
    port: PORT,
    serverId: SERVER_ID,
    autoRecoveryInMs: timeout || null
  });

  console.log(`[${SERVER_ID}] Received shutdown request on main port. Closing server listener...`);
  
  setTimeout(() => {
    stopMainServer(timeout);
  }, 100);
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
          "summary": "Streaming response (Server-Sent Events - SSE)",
          "description": "Returns JSON data chunks formatted as SSE one by one with a random delay between 100ms and 1000ms.",
          "responses": {
            "200": {
              "description": "SSE Event stream with JSON data payload"
            }
          }
        }
      };

      // 스웨거 스펙에 공통 /shutdown 명세 추가
      latestSpec.paths['/shutdown'] = {
        "post": {
          "summary": "Simulate server shutdown (Offline simulation)",
          "description": "Closes the HTTP server port listener. Process remains alive on PM2 but the port is unbound, simulating 'Connection Refused' failures.",
          "responses": {
            "200": {
              "description": "Shutdown initiation confirmation"
            }
          }
        }
      };

      // 스웨거 스펙에 공통 /error/{code} 명세 추가
      latestSpec.paths['/error/{code}'] = {
        "get": {
          "summary": "Generate specific HTTP error status code",
          "description": "Returns a response with the specified HTTP status code (e.g. 429, 503, 504) to test gateway resilience.",
          "parameters": [
            {
              "name": "code",
              "in": "path",
              "required": true,
              "schema": {
                "type": "integer",
                "default": 500
              }
            }
          ],
          "responses": {
            "default": {
              "description": "Custom error status response"
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
 
// 메인 서버 기동
startMainServer();

// --- 제어 포트 (PORT + 1000) 구동 ---
const controlApp = express();

// CORS 허용 미들웨어 (Direct 통신용)
controlApp.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

controlApp.use(express.json());

// 상태 조회
controlApp.get('/status', (req, res) => {
  res.json({
    serverId: SERVER_ID,
    port: PORT,
    controlPort: PORT + 1000,
    mainServerOnline: !!(serverInstance && serverInstance.listening),
    dynamicConfig: {
      delayMs: dynamicConfig.delayMs,
      overridesCount: Object.keys(dynamicConfig.overrides).length,
      overrides: dynamicConfig.overrides
    }
  });
});

// 메인 서버 복구 (켜기)
controlApp.post('/startup', (req, res) => {
  if (serverInstance && serverInstance.listening) {
    return res.status(400).json({ error: "Server is already online" });
  }
  startMainServer();
  res.json({ message: `Main server started on port ${PORT}`, serverId: SERVER_ID });
});

// 메인 서버 중지 (끄기)
controlApp.post('/shutdown', (req, res) => {
  const timeout = parseInt(req.query.timeout || req.body.timeout, 10) || 0;
  if (!serverInstance || !serverInstance.listening) {
    return res.status(400).json({ error: "Server is already offline" });
  }
  stopMainServer(timeout);
  res.json({ 
    message: `Main server stopped on port ${PORT}`, 
    serverId: SERVER_ID, 
    autoRecoveryInMs: timeout || null 
  });
});

// 인위적 지연(delayMs) 동적 제어
controlApp.post('/control/delay', (req, res) => {
  const delayMs = parseInt(req.body.delayMs || req.query.delayMs, 10);
  if (isNaN(delayMs) || delayMs < 0) {
    return res.status(400).json({ error: "Invalid delayMs value" });
  }
  dynamicConfig.delayMs = delayMs;
  console.log(`[${SERVER_ID}] Dynamic delay set to ${delayMs}ms`);
  res.json({ message: `Dynamic delay set to ${delayMs}ms`, delayMs });
});

controlApp.delete('/control/delay', (req, res) => {
  dynamicConfig.delayMs = 0;
  console.log(`[${SERVER_ID}] Dynamic delay cleared`);
  res.json({ message: "Dynamic delay cleared" });
});

// 응답 재정의(override) 동적 제어
controlApp.post('/control/override', (req, res) => {
  const { path: overridePath, method, statusCode, body, headers } = req.body;
  if (!overridePath || !method) {
    return res.status(400).json({ error: "path and method are required" });
  }
  
  const reqMethod = method.toUpperCase();
  const formattedPath = overridePath.startsWith('/') ? overridePath : `/${overridePath}`;
  const key = `${reqMethod}:${formattedPath}`;
  
  dynamicConfig.overrides[key] = {
    statusCode: parseInt(statusCode, 10) || 200,
    body: body || {},
    headers: headers || {}
  };
  
  console.log(`[${SERVER_ID}] Registered response override for ${key}`);
  res.json({ message: `Registered response override for ${key}`, override: dynamicConfig.overrides[key] });
});

controlApp.delete('/control/override', (req, res) => {
  const { path: overridePath, method } = req.body;
  if (!overridePath || !method) {
    return res.status(400).json({ error: "path and method are required" });
  }
  const reqMethod = method.toUpperCase();
  const formattedPath = overridePath.startsWith('/') ? overridePath : `/${overridePath}`;
  const key = `${reqMethod}:${formattedPath}`;
  
  if (dynamicConfig.overrides[key]) {
    delete dynamicConfig.overrides[key];
    console.log(`[${SERVER_ID}] Cleared response override for ${key}`);
    res.json({ message: `Cleared response override for ${key}` });
  } else {
    res.status(404).json({ error: `Override for ${key} not found` });
  }
});

controlApp.delete('/control/override/all', (req, res) => {
  dynamicConfig.overrides = {};
  console.log(`[${SERVER_ID}] Cleared all response overrides`);
  res.json({ message: "Cleared all response overrides" });
});

// 제어 서버 리스닝 시작
const CONTROL_PORT = PORT + 1000;
controlApp.listen(CONTROL_PORT, () => {
  console.log(`[${SERVER_ID}] Control API Server is running on port ${CONTROL_PORT}`);
});
