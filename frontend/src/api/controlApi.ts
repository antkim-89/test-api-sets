import type { ApiEndpoint, Service, ServiceConfig } from '@/types';

const SERVICES_CONFIG: ServiceConfig[] = [
  { id: 0, name: 'user',           port: 3001, controlPort: 4001, prefix: '/users' },
  { id: 1, name: 'product',        port: 3002, controlPort: 4002, prefix: '/products' },
  { id: 2, name: 'order',          port: 3003, controlPort: 4003, prefix: '/orders' },
  { id: 3, name: 'payment',        port: 3004, controlPort: 4004, prefix: '/payments' },
  { id: 4, name: 'inventory',      port: 3005, controlPort: 4005, prefix: '/inventory' },
  { id: 5, name: 'cart',           port: 3006, controlPort: 4006, prefix: '/cart' },
  { id: 6, name: 'delivery',       port: 3007, controlPort: 4007, prefix: '/delivery' },
  { id: 7, name: 'notification',   port: 3008, controlPort: 4008, prefix: '/notifications' },
  { id: 8, name: 'review',         port: 3009, controlPort: 4009, prefix: '/reviews' },
  { id: 9, name: 'recommendation', port: 3010, controlPort: 4010, prefix: '/recommendations' },
];

export { SERVICES_CONFIG };

const ctrl = (controlPort: number, path: string) =>
  `http://localhost:${controlPort}${path}`;

// ── 상태 조회 ──────────────────────────────────────────
export async function fetchServiceStatus(svc: ServiceConfig): Promise<Service> {
  try {
    const res = await fetch(ctrl(svc.controlPort, '/status'));
    if (!res.ok) throw new Error('unhealthy');
    const data = await res.json();
    return {
      ...svc,
      online: data.mainServerOnline,
      delayMs: data.dynamicConfig?.delayMs ?? 0,
      overrides: data.dynamicConfig?.overrides ?? {},
      overridesCount: data.dynamicConfig?.overridesCount
        ?? Object.keys(data.dynamicConfig?.overrides ?? {}).length,
      stats: data.stats ?? data.dynamicConfig?.stats ?? { total: 0, success: 0, error: 0 },
    };
  } catch {
    return {
      ...svc,
      online: false,
      error: true,
      delayMs: 0,
      overrides: {},
      overridesCount: 0,
      stats: { total: 0, success: 0, error: 0 },
    };
  }
}

// ── 서버 기동/종료 ────────────────────────────────────
export async function startupService(controlPort: number): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/startup'), { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '기동 실패'); }
}

export async function shutdownService(controlPort: number, timeoutMs = 0): Promise<void> {
  const url = ctrl(controlPort, `/shutdown${timeoutMs ? `?timeout=${timeoutMs}` : ''}`);
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '종료 실패'); }
}

// ── 지연 설정/해제 ────────────────────────────────────
export async function applyDelay(controlPort: number, delayMs: number): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/delay'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delayMs }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '지연 설정 실패'); }
}

export async function clearDelay(controlPort: number): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/delay'), { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '지연 해제 실패'); }
}

// ── API 명세 조회 ─────────────────────────────────────
export async function fetchApiSpec(controlPort: number): Promise<ApiEndpoint[]> {
  const res = await fetch(ctrl(controlPort, '/control/api-spec'));
  if (!res.ok) throw new Error('명세 조회 실패');
  const data = await res.json();
  return data.endpoints ?? [];
}

// ── 오버라이드 등록 ───────────────────────────────────
export async function addOverride(
  controlPort: number,
  payload: { path: string; method: string; statusCode: number; headers: Record<string, string>; body: unknown },
): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/override'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '오버라이드 등록 실패'); }
}

// ── 오버라이드 삭제 ───────────────────────────────────
export async function deleteOverride(controlPort: number, path: string, method: string): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/override'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '삭제 실패'); }
}

export async function deleteAllOverrides(controlPort: number): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/override/all'), { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '전체 삭제 실패'); }
}

// ── 통계 리셋 ──────────────────────────────────────────
export async function resetServiceStats(controlPort: number): Promise<void> {
  const res = await fetch(ctrl(controlPort, '/control/stats/reset'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || '통계 초기화 실패'); }
}
