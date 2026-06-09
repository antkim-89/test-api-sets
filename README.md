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
- **서버 셧다운 (장애 전파 / 회로 차단 테스트용)**: `POST /shutdown`
  - 해당 API 서버의 HTTP 포트 리스너를 닫습니다. 프로세스는 PM2 상에 살아있지만 포트 바인딩이 끊기므로 게이트웨이는 `Connection Refused` 에러를 감지하게 되어 실질적인 장애 오프라인 상태가 유발됩니다.
- **스트리밍 응답 (Server-Sent Events - SSE 테스트용)**: `GET /stream`
  - `Content-Type: text/event-stream` 헤더와 함께 100ms ~ 1000ms 사이의 무작위(Random) 지연 시간을 두고 총 10개의 JSON 데이터 청크를 SSE 표준 포맷(`data: <json>\n\n`)으로 전송합니다. 게이트웨이의 SSE 중계 및 지연 처리 기능을 테스트하기 좋습니다.

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
