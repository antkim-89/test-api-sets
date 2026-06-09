const autocannon = require('autocannon');

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
      path: '/users/profile' // 헤더 없음 (게이트웨이에서 401 유발용)
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

// 도움말 출력
function printHelpAndExit() {
  console.log(`
게이트웨이 성능 및 유량제어 테스트를 위한 시나리오 기반 부하 발생기

사용법:
  node stress-test.js [옵션]

옵션:
  -t, --target <url>       부하를 가할 대상 Gateway의 Base URL (기본값: http://localhost:8000)
  -c, --connections <num>  동시 연결 커넥션 수 (기본값: 100)
  -d, --duration <sec>     테스트 실행 지속 시간(초) (기본값: 10)
  -s, --scenario <name>    적용할 부하 테스트 시나리오 (기본값: mixed)
  -h, --help               도움말 출력

사용 가능한 시나리오 목록:
  mixed              (기본) 일반적인 사용자 API 호출 패턴 (GET/POST 조회 및 등록 혼합)
  auth-failure       잘못된 로그인 및 인증 헤더 누락 요청 집중 발생 (게이트웨이 인증 필터 테스트)
  router-stress      없는 경로(404) 및 서버 에러 유발 경로 무작위 호출 (에러 핸들링 및 라우팅 부하 테스트)
  latency-stress     응답 지연 API(500ms ~ 2000ms) 집중 호출 (게이트웨이 타임아웃 및 서킷 브레이커 작동 유도)
  transaction-heavy  주문, 결제, 배송 조회 등 리소스 집약적인 쓰기 API 위주 호출

예시:
  # 기본 설정으로 로컬 게이트웨이 테스트
  node stress-test.js
  
  # 포트 8000의 게이트웨이에 동시성 200으로 15초간 인증 실패 시나리오 테스트
  node stress-test.js -t http://localhost:8000 -c 200 -d 15 -s auth-failure
`);
  process.exit(0);
}

// CLI 인자 파싱
const args = process.argv.slice(2);
let target = 'http://localhost:8000';
let connections = 100;
let duration = 10;
let scenario = 'mixed';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-t' || args[i] === '--target') {
    target = args[++i];
  } else if (args[i] === '-c' || args[i] === '--connections') {
    connections = parseInt(args[++i], 10);
  } else if (args[i] === '-d' || args[i] === '--duration') {
    duration = parseInt(args[++i], 10);
  } else if (args[i] === '-s' || args[i] === '--scenario') {
    scenario = args[++i];
  } else if (args[i] === '-h' || args[i] === '--help') {
    printHelpAndExit();
  }
}

// 검증
const selectedRequests = SCENARIOS[scenario];
if (!selectedRequests) {
  console.error(`Error: 알 수 없는 시나리오입니다: "${scenario}"`);
  console.error(`사용 가능한 시나리오: ${Object.keys(SCENARIOS).join(', ')}`);
  console.error(`자세한 내용은 -h 또는 --help 옵션을 참조하세요.`);
  process.exit(1);
}

if (isNaN(connections) || connections <= 0) {
  console.error(`Error: 올바르지 않은 커넥션 수입니다: ${connections}`);
  process.exit(1);
}

if (isNaN(duration) || duration <= 0) {
  console.error(`Error: 올바르지 않은 지속 시간입니다: ${duration}`);
  process.exit(1);
}

// 대상 URL 마지막 슬래시 트리밍
const cleanTarget = target.endsWith('/') ? target.slice(0, -1) : target;

console.log(`==========================================`);
console.log(`🚀 Autocannon 게이트웨이 부하 발생기 시작`);
console.log(`- 대상 주소 (Target):  ${cleanTarget}`);
console.log(`- 동시 연결 (Conns):   ${connections}`);
console.log(`- 지속 시간 (Duration): ${duration}초`);
console.log(`- 테스트 시나리오:     ${scenario} (${selectedRequests.length}개 API 패턴 순환)`);
console.log(`==========================================\n`);

const instance = autocannon({
  url: cleanTarget,
  connections,
  duration,
  requests: selectedRequests,
  pipelining: 1
}, (err, result) => {
  if (err) {
    console.error('Autocannon 실행 중 오류 발생:', err);
    process.exit(1);
  }
  console.log('\n\n================ 부하 테스트 결과 ================');
  console.log(autocannon.printResult(result));
  process.exit(0);
});

// 프로그레스 바 추적
autocannon.track(instance, { renderProgressBar: true });
