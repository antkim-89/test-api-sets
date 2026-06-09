// 10개 마이크로서비스 설정
const SERVICES_CONFIG = [
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

// Global State
let services = [];

// DOM Elements
const servicesContainer = document.getElementById('services-container');
const onlineCountEl = document.getElementById('online-count');
const lastUpdateEl = document.getElementById('last-update');
const btnRefreshAll = document.getElementById('btn-refresh-all');

// Modal Elements
const overrideModal = document.getElementById('override-modal');
const btnCloseOverrideModal = document.getElementById('btn-close-override-modal');
const btnCancelOverride = document.getElementById('btn-cancel-override');
const overrideForm = document.getElementById('override-form');
const overrideServiceName = document.getElementById('override-service-name');
const overridePortInput = document.getElementById('override-port');
const overrideMethodSelect = document.getElementById('override-method');
const overridePathInput = document.getElementById('override-path');
const overrideStatusInput = document.getElementById('override-status');
const overrideHeadersInput = document.getElementById('override-headers');
const overrideBodyInput = document.getElementById('override-body');

const viewOverridesModal = document.getElementById('view-overrides-modal');
const btnCloseViewOverridesModal = document.getElementById('btn-close-view-overrides-modal');
const btnCloseViewOverrides = document.getElementById('btn-close-view-overrides');
const btnClearAllOverrides = document.getElementById('btn-clear-all-overrides');
const viewOverridesServiceName = document.getElementById('view-overrides-service-name');
const viewOverridesPortInput = document.getElementById('view-overrides-port');
const overridesListContainer = document.getElementById('overrides-list-container');

const toastEl = document.getElementById('toast');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  fetchServices();
  
  // 3초마다 각 서비스 제어 포트 상태 동기화
  setInterval(() => {
    fetchServices(true);
  }, 3000);

  // Event Listeners
  btnRefreshAll.addEventListener('click', () => fetchServices());
  
  // Modals close events
  btnCloseOverrideModal.addEventListener('click', () => overrideModal.classList.add('hide'));
  btnCancelOverride.addEventListener('click', () => overrideModal.classList.add('hide'));
  overrideForm.addEventListener('submit', handleOverrideSubmit);

  btnCloseViewOverridesModal.addEventListener('click', () => viewOverridesModal.classList.add('hide'));
  btnCloseViewOverrides.addEventListener('click', () => viewOverridesModal.classList.add('hide'));
  btnClearAllOverrides.addEventListener('click', handleClearAllOverrides);
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

// Fetch microservices statuses directly from control ports (CORS)
async function fetchServices(isSilent = false) {
  try {
    if (!isSilent) {
      lastUpdateEl.innerText = '동기화 중...';
    }

    const statusPromises = SERVICES_CONFIG.map(async (svc) => {
      try {
        const response = await fetch(`http://localhost:${svc.controlPort}/status`);
        if (!response.ok) throw new Error('Unhealthy status');
        const data = await response.json();
        return {
          ...svc,
          online: data.mainServerOnline,
          delayMs: data.dynamicConfig.delayMs,
          overrides: data.dynamicConfig.overrides,
          overridesCount: data.dynamicConfig.overridesCount || Object.keys(data.dynamicConfig.overrides || {}).length
        };
      } catch (err) {
        return {
          ...svc,
          online: false,
          error: true,
          delayMs: 0,
          overrides: {},
          overridesCount: 0
        };
      }
    });

    services = await Promise.all(statusPromises);
    renderServices();
    
    const now = new Date();
    lastUpdateEl.innerText = `마지막 동기화: ${now.toLocaleTimeString()}`;
  } catch (err) {
    console.error(err);
    if (!isSilent) {
      showToast(err.message, 'danger');
      lastUpdateEl.innerText = '동기화 실패';
    }
  }
}

// Render Microservices Grid
function renderServices() {
  servicesContainer.innerHTML = '';
  let onlineCount = 0;

  services.forEach(svc => {
    if (svc.online) onlineCount++;

    const card = document.createElement('div');
    card.className = `card glass-card svc-card ${svc.online ? 'online' : 'offline'}`;
    
    const overridesCount = svc.overridesCount || 0;

    card.innerHTML = `
      <div class="svc-header">
        <div class="svc-info">
          <h3>${svc.name}-service</h3>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <span class="svc-port-badge">Main: ${svc.port}</span>
            <span class="svc-port-badge">Control: ${svc.controlPort}</span>
          </div>
        </div>
        <div class="svc-status-area">
          <div class="status-dot ${svc.online ? 'online' : 'offline'}"></div>
          <label class="switch">
            <input type="checkbox" ${svc.online ? 'checked' : ''} onchange="toggleService(${svc.controlPort}, this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="svc-controls">
        <!-- 인위적 지연 설정 -->
        <div class="control-row">
          <label>지연 시간:</label>
          <input type="number" class="input-small" id="delay-input-${svc.controlPort}" value="${svc.delayMs || 0}" min="0" placeholder="ms">
          <span class="control-unit">ms</span>
          ${svc.delayMs > 0 
            ? `<button class="btn btn-small btn-danger" onclick="clearDelay(${svc.controlPort})">해제</button>` 
            : `<button class="btn btn-small btn-secondary" onclick="applyDelay(${svc.controlPort})">적용</button>`
          }
        </div>

        <!-- 타이머 종료 설정 -->
        <div class="control-row">
          <label>자동 복구:</label>
          <input type="number" class="input-small" id="timer-input-${svc.controlPort}" value="5" min="1" placeholder="초">
          <span class="control-unit">초 후</span>
          <button class="btn btn-small btn-danger" onclick="timerShutdown(${svc.controlPort})" ${!svc.online ? 'disabled' : ''}>자동복구</button>
        </div>

        <!-- 오버라이드 버튼들 -->
        <div class="svc-buttons">
          <button class="btn btn-secondary btn-small" onclick="openOverrideModal('${svc.name}', ${svc.controlPort})" ${!svc.online ? 'disabled' : ''}>
            <svg class="icon" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            오버라이드 추가
          </button>
          <button class="btn btn-secondary btn-small" onclick="openViewOverridesModal('${svc.name}', ${svc.controlPort})" ${overridesCount === 0 ? 'disabled' : ''}>
            가로채기 관리 (${overridesCount})
          </button>
        </div>
      </div>
    `;
    servicesContainer.appendChild(card);
  });

  onlineCountEl.innerText = onlineCount;
}

// Toggle Service On/Off directly (CORS) - No prompts/timers here
async function toggleService(controlPort, shouldOnline) {
  const url = `http://localhost:${controlPort}/${shouldOnline ? 'startup' : 'shutdown'}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '제어 요청이 실패했습니다.');

    const msg = shouldOnline 
      ? `서버가 켜졌습니다 (포트 ${data.port || ''})` 
      : `서버가 종료되었습니다.`;
    
    showToast(msg);
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
    fetchServices(); // 상태 복구용 조회
  }
}

// Timer Shutdown directly (CORS) - Default to 5 seconds if input is empty
async function timerShutdown(controlPort) {
  const timerInput = document.getElementById(`timer-input-${controlPort}`);
  let seconds = parseInt(timerInput.value, 10);
  
  // 입력하지 않거나 비정상적인 값이면 기본값 5초 사용
  if (isNaN(seconds) || seconds <= 0) {
    seconds = 5;
    timerInput.value = 5; // 입력창에도 5초로 동기화
  }
  
  const ms = seconds * 1000;
  const url = `http://localhost:${controlPort}/shutdown?timeout=${ms}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '타이머 셧다운 실패');

    showToast(`서버가 종료되었습니다. ${seconds}초 후 자동으로 다시 켜집니다.`);
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Apply latency delay directly (CORS)
async function applyDelay(controlPort) {
  const delayInput = document.getElementById(`delay-input-${controlPort}`);
  const delayMs = parseInt(delayInput.value, 10) || 0;

  try {
    const response = await fetch(`http://localhost:${controlPort}/control/delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delayMs })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '지연 설정 실패');

    showToast(`지연 시간이 ${delayMs}ms로 설정되었습니다.`);
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Clear latency delay directly (CORS)
async function clearDelay(controlPort) {
  try {
    const response = await fetch(`http://localhost:${controlPort}/control/delay`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '지연 해제 실패');

    showToast(`지연 설정이 초기화되었습니다.`);
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Open Override Add Modal
function openOverrideModal(serviceName, controlPort) {
  overrideServiceName.innerText = `${serviceName}-service`;
  overridePortInput.value = controlPort;
  
  overrideForm.reset();
  overrideHeadersInput.value = '';
  overrideBodyInput.value = '';
  
  overrideModal.classList.remove('hide');
}

// Handle override addition submission directly (CORS)
async function handleOverrideSubmit(e) {
  e.preventDefault();
  
  const controlPort = overridePortInput.value;
  const path = overridePathInput.value.trim();
  const method = overrideMethodSelect.value;
  const statusCode = parseInt(overrideStatusInput.value, 10);
  
  let headers = {};
  let body = {};

  try {
    if (overrideHeadersInput.value.trim()) {
      headers = JSON.parse(overrideHeadersInput.value.trim());
    }
  } catch (err) {
    return alert('헤더 JSON 형식이 잘못되었습니다. 올바른 JSON 문자열을 입력해주세요.');
  }

  try {
    if (overrideBodyInput.value.trim()) {
      body = JSON.parse(overrideBodyInput.value.trim());
    }
  } catch (err) {
    return alert('바디 JSON 형식이 잘못되었습니다. 올바른 JSON 문자열을 입력해주세요.');
  }

  try {
    const response = await fetch(`http://localhost:${controlPort}/control/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, method, statusCode, headers, body })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '오버라이드 등록 실패');

    showToast('응답 가로채기(Override)가 성공적으로 등록되었습니다.');
    overrideModal.classList.add('hide');
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Open overrides view modal
function openViewOverridesModal(serviceName, controlPort) {
  viewOverridesServiceName.innerText = `${serviceName}-service`;
  viewOverridesPortInput.value = controlPort;
  
  const svc = services.find(s => s.controlPort === controlPort);
  renderOverridesList(svc.overrides, controlPort);
  
  viewOverridesModal.classList.remove('hide');
}

// Render overrides list inside modal
function renderOverridesList(overrides, controlPort) {
  overridesListContainer.innerHTML = '';
  
  if (!overrides || Object.keys(overrides).length === 0) {
    overridesListContainer.innerHTML = '<div class="no-overrides">등록된 가로채기 규칙이 없습니다.</div>';
    return;
  }

  Object.keys(overrides).forEach(key => {
    const item = overrides[key];
    const [method, path] = key.split(':');
    const isError = item.statusCode >= 400;

    const el = document.createElement('div');
    el.className = 'override-item';
    el.innerHTML = `
      <div class="override-meta">
        <div>
          <span class="override-path-tag">${method} ${path}</span>
          <span class="override-status-tag ${isError ? 'error-status' : ''}">HTTP ${item.statusCode}</span>
        </div>
        <button class="btn btn-danger btn-small" onclick="clearOverride(${controlPort}, '${path}', '${method}')">삭제</button>
      </div>
      <div class="override-details">
        <div><strong>Headers:</strong> ${JSON.stringify(item.headers)}</div>
        <div style="margin-top: 0.25rem;"><strong>Body:</strong> ${JSON.stringify(item.body)}</div>
      </div>
    `;
    overridesListContainer.appendChild(el);
  });
}

// Clear a specific override directly (CORS)
async function clearOverride(controlPort, path, method) {
  try {
    const response = await fetch(`http://localhost:${controlPort}/control/override`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, method })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '삭제 실패');

    showToast('해당 가로채기 규칙이 삭제되었습니다.');
    
    // Refresh modal and main list
    await fetchServices(true);
    const svc = services.find(s => s.controlPort === controlPort);
    renderOverridesList(svc.overrides, controlPort);
    
    if (!svc.overrides || Object.keys(svc.overrides).length === 0) {
      viewOverridesModal.classList.add('hide');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Clear all overrides for a service directly (CORS)
async function handleClearAllOverrides() {
  const controlPort = viewOverridesPortInput.value;
  if (!confirm('정말 이 서비스의 모든 응답 가로채기를 해제하시겠습니까?')) return;

  try {
    const response = await fetch(`http://localhost:${controlPort}/control/override/all`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '전체 삭제 실패');

    showToast('모든 가로채기 규칙이 초기화되었습니다.');
    viewOverridesModal.classList.add('hide');
    fetchServices();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
