export interface ServiceConfig {
  id: number;
  name: string;
  port: number;
  controlPort: number;
  prefix: string;
}

export interface Override {
  statusCode: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface ServiceStats {
  delayMs: number;
  overridesCount: number;
  overrides: Record<string, Override>;
}

export interface RequestStats {
  total: number;
  success: number;
  error: number;
}

export interface Service extends ServiceConfig {
  online: boolean;
  error?: boolean;
  delayMs: number;
  overrides: Record<string, Override>;
  overridesCount: number;
  stats?: RequestStats;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface StressResult {
  requests: { total: number; average: number };
  latency: { average: number; max: number; p99: number };
  throughput: { average: number };
  errors: number;
  non2xx: number;
  duration: number;
  connections: number;
}

export interface SseMessage {
  type: 'start' | 'progress' | 'done' | 'error';
  target?: string;
  connections?: number;
  duration?: number;
  scenario?: string;
  percentage?: number;
  elapsed?: number;
  result?: StressResult;
  formattedResult?: string;
  error?: string;
}

export type ToastType = 'success' | 'danger' | 'warning';

export interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}
