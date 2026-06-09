// Global State
let activeEventSource = null;

// DOM Elements
const stressForm = document.getElementById('stress-form');
const btnStartStress = document.getElementById('btn-start-stress');
const stressSpinner = document.getElementById('stress-spinner');
const stressTargetInput = document.getElementById('stress-target');
const stressConnectionsInput = document.getElementById('stress-connections');
const stressDurationInput = document.getElementById('stress-duration');
const stressScenarioSelect = document.getElementById('stress-scenario');
const scenarioDescriptionEl = document.getElementById('scenario-description');

const stressMonitor = document.getElementById('stress-monitor');
const progressFill = document.getElementById('stress-progress-fill');
const progressLabel = document.getElementById('stress-progress-label');
const statusText = document.getElementById('stress-status-text');

const stressResult = document.getElementById('stress-result');
const btnCloseResult = document.getElementById('btn-close-result');
const stressResultRaw = document.getElementById('stress-result-raw');
const resTotalReq = document.getElementById('res-total-req');
const resReqSec = document.getElementById('res-req-sec');
const resLatencyAvg = document.getElementById('res-latency-avg');
const resSuccessRate = document.getElementById('res-success-rate');

const toastEl = document.getElementById('toast');

// Scenario Descriptions mapping
const SCENARIO_DESCS = {
  'mixed': '일반적인 사용자 API 호출 패턴 (GET/POST 조회 및 등록 혼합)',
  'auth-failure': '잘못된 로그인 정보 및 인증 헤더 누락 요청을 고부하로 전송 (게이트웨이 인증 필터 검증)',
  'router-stress': '404 라우팅 에러 및 500 에러 유발 경로 무작위 호출 (게이트웨이 라우팅 엔진 성능 및 복구 테스트)',
  'latency-stress': '응답 지연 API(500ms ~ 2000ms) 호출 (게이트웨이 타임아웃 처리 및 서킷 브레이커 연동 테스트)',
  'transaction-heavy': '주문, 결제, 배송 조회 등 리소스 집약적인 쓰기 API 위주 호출'
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Event Listeners
  stressScenarioSelect.addEventListener('change', handleScenarioChange);
  stressForm.addEventListener('submit', handleStressSubmit);
  btnCloseResult.addEventListener('click', () => stressResult.classList.add('hide'));
});

// Toast Feedback Helper
function showToast(message, type = 'success') {
  toastEl.innerText = message;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove('hide');
  
  toastEl.style.animation = 'none';
  toastEl.offsetHeight; // trigger reflow
  toastEl.style.animation = null;

  setTimeout(() => {
    toastEl.classList.add('hide');
  }, 3000);
}

// Update scenario description on dropdown change
function handleScenarioChange(e) {
  const scen = e.target.value;
  scenarioDescriptionEl.innerText = SCENARIO_DESCS[scen] || '';
}

// Submit stress load test
async function handleStressSubmit(e) {
  e.preventDefault();

  if (activeEventSource) return;

  const target = stressTargetInput.value.trim();
  const connections = parseInt(stressConnectionsInput.value, 10);
  const duration = parseInt(stressDurationInput.value, 10);
  const scenario = stressScenarioSelect.value;

  // UI State set to testing
  btnStartStress.disabled = true;
  stressSpinner.classList.remove('hide');
  stressMonitor.classList.remove('hide');
  stressResult.classList.add('hide');
  
  progressFill.style.width = '0%';
  progressLabel.innerText = '0%';
  statusText.innerText = '부하 테스트를 요청 중입니다...';

  try {
    // 1. Establish SSE listener first
    setupStressSSE();

    // 2. Fire the trigger POST call to dashboard backend (port 3000)
    const response = await fetch('/api/stress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, connections, duration, scenario })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '부하 테스트 요청이 거절되었습니다.');
    
    statusText.innerText = '부하 발생기가 시작되었습니다. 실시간 이벤트를 대기하는 중...';
  } catch (err) {
    showToast(err.message, 'danger');
    resetStressForm();
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
  }
}

// Establish EventSource for load test progress (communicates with port 3000)
function setupStressSSE() {
  if (activeEventSource) {
    activeEventSource.close();
  }

  activeEventSource = new EventSource('/api/stress/stream');

  activeEventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'start') {
      statusText.innerText = `[START] 부하 테스트 구동 중...\n- 대상: ${data.target}\n- 시나리오: ${data.scenario}\n- 커넥션: ${data.connections}\n- 기간: ${data.duration}초`;
    } 
    else if (data.type === 'progress') {
      progressFill.style.width = `${data.percentage}%`;
      progressLabel.innerText = `${data.percentage}%`;
      statusText.innerText = `부하 발생 중... (${data.elapsed}초 경과)`;
    } 
    else if (data.type === 'error') {
      statusText.innerText = `[ERROR] 실행 오류: ${data.error}`;
      showToast(`부하 테스트 오류: ${data.error}`, 'danger');
      resetStressForm();
      activeEventSource.close();
      activeEventSource = null;
    } 
    else if (data.type === 'done') {
      progressFill.style.width = `100%`;
      progressLabel.innerText = `100%`;
      statusText.innerText = `[DONE] 테스트가 완료되었습니다. 결과를 정리 중입니다...`;
      
      // Render results
      renderStressResult(data.result, data.formattedResult);
      
      resetStressForm();
      activeEventSource.close();
      activeEventSource = null;
      showToast('부하 테스트가 정상 완료되었습니다!');
    }
  };

  activeEventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    statusText.innerText += '\n[Warning] 실시간 연결 스트림이 손실되었습니다. 백그라운드 테스트는 계속 실행됩니다.';
  };
}

// Reset stress form to normal state
function resetStressForm() {
  btnStartStress.disabled = false;
  stressSpinner.classList.add('hide');
}

// Render test results panel
function renderStressResult(result, formatted) {
  stressResult.classList.remove('hide');
  
  // Stats calculations
  const total = result.requests.total;
  const avgReqSec = result.requests.average.toFixed(2);
  const avgLatency = `${result.latency.average.toFixed(2)} ms`;
  
  // Success rate: count 2xx over total
  const count2xx = result['2xx'] || 0;
  const successRate = total > 0 ? `${((count2xx / total) * 100).toFixed(1)}%` : '0%';

  // Set values
  resTotalReq.innerText = total.toLocaleString();
  resReqSec.innerText = Number(avgReqSec).toLocaleString();
  resLatencyAvg.innerText = avgLatency;
  resSuccessRate.innerText = successRate;
  
  // Set Raw Result text
  stressResultRaw.innerText = formatted;

  // Scroll result into view smoothly
  stressResult.scrollIntoView({ behavior: 'smooth' });
}
