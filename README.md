# Gateway Test Mock API Servers

이 프로젝트는 API 게이트웨이(Gateway) 프로그램 테스트를 위한 10개의 독립적인 Mock API 서버들로 구성되어 있습니다. 각 서버는 고유한 마이크로서비스 도메인 역할을 시뮬레이션하며, 내부에 자체 Swagger 명세서(/api-docs)를 서빙하고 있습니다.

---

## 🛠 기술 스택

- **Runtime**: Node.js
- **Framework**: Express
- **Process Manager**: PM2
- **Documentation**: Swagger UI (`swagger-ui-express`)

---

## 📂 폴더 구조

```
.
├── package.json          # Express, PM2, swagger-ui-express 의존성 및 스크립트 정의
├── server.js             # 공통 Express 서버 및 포트별 동적 라우터/Swagger 바인딩
├── ecosystem.config.js   # PM2용 마이크로서비스 10개 프로세스 설정
└── src/
    ├── routes/           # 10개 마이크로서비스 개별 라우터 구현
    │   ├── user.js
    │   ├── product.js
    │   └── ...
    └── swagger/          # 각 마이크로서비스별 OpenAPI 3.0 명세 JSON 파일
        ├── user.swagger.json
        ├── product.swagger.json
        └── ...
```

---

## 🚦 서비스 및 포트 매핑 정보

각 서비스는 로컬 포트 `3001`부터 `3010`까지 하나씩 배정되어 독립적인 프로세스로 실행됩니다.

| 포트     | 서비스명 (PM2 Name)      | 주요 모사 API 엔드포인트                                             | Swagger UI 접속 주소                                             |
| :------- | :----------------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **3001** | `user-service`           | `GET /users/profile`, `POST /users/login`                            | [http://localhost:3001/api-docs](http://localhost:3001/api-docs) |
| **3002** | `product-service`        | `GET /products`, `GET /products/:id`                                 | [http://localhost:3002/api-docs](http://localhost:3002/api-docs) |
| **3003** | `order-service`          | `POST /orders`, `GET /orders/:id`                                    | [http://localhost:3003/api-docs](http://localhost:3003/api-docs) |
| **3004** | `payment-service`        | `POST /payments/pay`, `POST /payments/cancel`                        | [http://localhost:3004/api-docs](http://localhost:3004/api-docs) |
| **3005** | `inventory-service`      | `GET /inventory/:productId`, `POST /inventory/reduce`                | [http://localhost:3005/api-docs](http://localhost:3005/api-docs) |
| **3006** | `cart-service`           | `GET /cart`, `POST /cart/add`                                        | [http://localhost:3006/api-docs](http://localhost:3006/api-docs) |
| **3007** | `delivery-service`       | `GET /delivery/:orderId`, `POST /delivery/track`                     | [http://localhost:3007/api-docs](http://localhost:3007/api-docs) |
| **3008** | `notification-service`   | `POST /notifications/send`, `GET /notifications/history`             | [http://localhost:3008/api-docs](http://localhost:3008/api-docs) |
| **3009** | `review-service`         | `GET /reviews/:productId`, `POST /reviews`                           | [http://localhost:3009/api-docs](http://localhost:3009/api-docs) |
| **3010** | `recommendation-service` | `GET /recommendations/user/:userId`, `GET /recommendations/trending` | [http://localhost:3010/api-docs](http://localhost:3010/api-docs) |

---

## ⚡️ 공통 API (모든 서버 제공)

마이크로서비스 테스트 편의성 및 게이트웨이의 라우트 기능 테스트를 위해 아래 API는 **모든 서버 포트에서 동일하게 작동**합니다.

- **헬스체크**: `GET /health` 또는 `GET /`
  - 현재 서버 정보, 포트, 구동 시간을 JSON으로 반환합니다.
- **의도적인 응답 지연 (Timeout 테스트용)**: `GET /delay/:ms`
  - 요청 경로에 지정한 밀리초(ms) 만큼 대기 후 응답을 반환합니다. (예: `http://localhost:3001/delay/2000` -> 2초 뒤 응답)
- **의도적인 다양한 에러 반환 (Failover 테스트용)**: `GET /error` 또는 `GET /error/:code`
  - 지정한 HTTP 상태 코드(예: 429, 503, 504 등)로 JSON 에러 메시지를 반환합니다. 파라미터가 없으면 기본값은 `500` 입니다.
- **서버 셧다운 (장애 전파 / 회로 차단 테스트용)**: `POST /shutdown` 또는 `POST /shutdown?timeout=5000`
  - 해당 API 서버의 HTTP 포트 리스너를 닫습니다. 프로세스는 PM2 상에 살아있지만 포트 바인딩이 끊기므로 게이트웨이는 `Connection Refused` 에러를 감지하게 되어 실질적인 장애 오프라인 상태가 유발됩니다. `timeout` 파라미터(ms 단위)를 넘겨주면 지정된 시간 이후 자동으로 서버가 복구됩니다.
- **스트리밍 응답 (Server-Sent Events - SSE 테스트용)**: `GET /stream`
  - `Content-Type: text/event-stream` 헤더와 함께 100ms ~ 1000ms 사이의 무작위(Random) 지연 시간을 두고 총 10개의 JSON 데이터 청크를 SSE 표준 포맷(`data: <json>\n\n`)으로 전송합니다. 게이트웨이의 SSE 중계 및 지연 처리 기능을 테스트하기 좋습니다.

---

## ⚙️ 실시간 제어 포트 (Control Port) 및 Admin API

메인 포트가 닫힌 상태(`Connection Refused`)에서도 서버를 동적으로 다시 켜거나, 실시간으로 설정을 주입하기 위해 각 서비스는 `PORT + 1000` (예: 3001의 제어 포트는 4001) 포트에서 항상 대기하는 제어 서버를 가동합니다.

### 1. 온/오프라인 제어 및 상태 조회
- **서버 켜기 (메인 포트 바인딩)**: `POST /startup`
  - 닫혀 있던 메인 포트 리스너를 다시 열어 정상 서비스 상태로 복구합니다. (호출 예: `POST http://localhost:4001/startup`)
- **서버 끄기 (메인 포트 해제)**: `POST /shutdown` 또는 `POST /shutdown?timeout=ms`
  - 메인 포트 리스너를 닫습니다. `timeout` 지정 시 지정된 밀리초 후에 메인 포트가 자동으로 다시 열립니다.
- **상태 조회**: `GET /status`
  - 현재 서버 구동 상태 및 적용된 동적 설정 내역을 조회합니다. (호출 예: `GET http://localhost:4001/status`)

### 2. 동적 장애 시뮬레이션 설정 (Admin API)
- **인위적 지연(Delay) 등록**: `POST /control/delay` (Body: `{"delayMs": 2000}`) 또는 쿼리 스트링 `?delayMs=2000`
  - 해당 서버로 오는 모든 요청에 대해 강제적인 지연을 유발합니다. (서킷 브레이커, 게이트웨이 타임아웃 테스트에 적합)
- **인위적 지연 해제**: `DELETE /control/delay`
- **특정 API 응답 가로채기(Override)**: `POST /control/override`
  - 특정 경로와 HTTP 메서드에 대해 응답코드, 헤더, 바디를 실시간으로 변경하여 게이트웨이의 라우팅/페이로드 조작을 테스트합니다.
  - **Request Body 예시**:
    ```json
    {
      "path": "/users/profile",
      "method": "GET",
      "statusCode": 200,
      "body": { "id": "custom-user", "status": "modified-in-realtime" },
      "headers": { "X-Test-Header": "Gateway-Stress" }
    }
    ```
- **특정 가로채기 해제**: `DELETE /control/override` (Body: `{"path": "/users/profile", "method": "GET"}`)
- **모든 가로채기 해제**: `DELETE /control/override/all`

---

## 🏋️‍♂️ 시나리오 기반 부하 테스트 (Stress Test)

게이트웨이의 유량 제어(Rate Limiting), 타임아웃, 에러 복구 등을 검증하기 위해 시나리오별 대량의 트래픽을 가할 수 있는 CLI 도구를 내장하고 있습니다.

### 실행 방법
```bash
# 기본 설정으로 로컬 게이트웨이(http://localhost:8000)에 혼합 부하 테스트 실행
npm run stress

# 특정 옵션 지정 (대상 게이트웨이 주소, 동시성 200, 테스트 기간 15초, 인증 실패 시나리오)
npm run stress -- -t http://localhost:8000 -c 200 -d 15 -s auth-failure
```

### CLI 옵션
- `-t, --target <url>`: 부하를 가할 대상 Gateway의 Base URL (기본값: `http://localhost:8000`)
- `-c, --connections <num>`: 동시 연결 커넥션 수 (기본값: `100`)
- `-d, --duration <sec>`: 테스트 실행 지속 시간(초) (기본값: `10`)
- `-s, --scenario <name>`: 부하 테스트 시나리오 (기본값: `mixed`)

### 지원하는 시나리오 (`-s`) 목록
1. `mixed`: 일반적인 복합 비즈니스 요청 패턴 순환 (조회, 주문, 결제 등)
2. `auth-failure`: 잘못된 로그인 정보 및 인증 헤더 누락 요청을 고부하로 전송 (게이트웨이 인증 미들웨어 검증)
3. `router-stress`: 404 라우팅 에러 및 500 에러 유발 경로 무작위 호출 (게이트웨이 라우팅 엔진 성능 및 복구 테스트)
4. `latency-stress`: 응답 지연 API(500ms ~ 2000ms) 호출 (게이트웨이 타임아웃 처리 및 서킷 브레이커 연동 테스트)
5. `transaction-heavy`: 쓰기 위주의 무거운 트랜잭션 요청 집중 발생 (주문/결제 처리 성능 테스트)

---

## 🚀 사용법 (실행 명령어)

의존성 설치가 아직 완료되지 않았다면 먼저 아래 명령어를 실행하십시오.

```bash
npm install
```

### 1. API 서버 전체 시작

PM2를 사용해 10개의 백그라운드 프로세스로 서버를 일괄 실행합니다.

```bash
npm run start
# 또는: npx pm2 start ecosystem.config.js
```

### 2. 구동 상태 확인

현재 온라인 상태인 서버 프로세스 상태를 한눈에 모니터링합니다.

```bash
npm run status
# 또는: npx pm2 status
```

### 3. 실시간 통합 로그 확인

각 API 서버에서 출력하는 로그를 실시간으로 스트리밍합니다.

```bash
npm run logs
# 또는: npx pm2 logs
```

### 4. API 서버 전체 종료

구동 중인 모든 API 서버 프로세스를 중단하고 PM2 목록에서 제거합니다.

```bash
npm run stop
# 또는: npx pm2 delete all
```
