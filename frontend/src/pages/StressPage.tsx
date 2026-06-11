import { useEffect, useRef, useState } from 'react';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import type { SseMessage, StressResult } from '@/types';
import styles from './StressPage.module.css';

const SCENARIOS = [
  { value: 'mixed',            label: 'Mixed (기본 복합 비즈니스 요청)',           desc: '일반적인 사용자 API 호출 패턴 (GET/POST 조회 및 등록 혼합)' },
  { value: 'auth-failure',     label: 'Auth Failure (잘못된 로그인 및 인증 필터 검증)', desc: '잘못된 토큰, 틀린 비밀번호 등 인증 오류 시나리오' },
  { value: 'router-stress',    label: 'Router Stress (404/500 에러 라우팅 유도)',  desc: '존재하지 않는 경로와 강제 에러 엔드포인트 집중 호출' },
  { value: 'latency-stress',   label: 'Latency Stress (지연 응답 서킷 브레이커)',  desc: '500ms·1000ms·2000ms 지연 엔드포인트 집중 호출' },
  { value: 'transaction-heavy',label: 'Transaction Heavy (주문/결제 집중 쓰기)',   desc: '주문 생성, 결제, 취소, 배송 추적 등 쓰기 집중 부하' },
];

export default function StressPage() {
  const { toast, showToast } = useToast();

  const [target, setTarget] = useState('http://localhost:8000');
  const [connections, setConnections] = useState(100);
  const [duration, setDuration] = useState(10);
  const [scenario, setScenario] = useState('mixed');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<StressResult | null>(null);
  const [rawText, setRawText] = useState('');
  const [showMonitor, setShowMonitor] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  const scenarioDesc = SCENARIOS.find(s => s.value === scenario)?.desc ?? '';

  useEffect(() => {
    // SSE 연결 유지 (페이지 마운트 시 항상 연결)
    const es = new EventSource('/api/stress/stream');
    esRef.current = es;

    es.onmessage = (e) => {
      const msg: SseMessage = JSON.parse(e.data);

      if (msg.type === 'start') {
        setRunning(true);
        setProgress(0);
        setResult(null);
        setRawText('');
        setShowMonitor(true);
        setStatusText(`테스트 시작: ${msg.target} (${msg.connections}c, ${msg.duration}s, ${msg.scenario})`);
      } else if (msg.type === 'progress') {
        setProgress(msg.percentage ?? 0);
        setStatusText(`진행 중... ${msg.elapsed}초 경과 (${msg.percentage}%)`);
      } else if (msg.type === 'done') {
        setRunning(false);
        setProgress(100);
        setResult(msg.result ?? null);
        setRawText(msg.formattedResult ?? '');
        setStatusText('테스트 완료!');
      } else if (msg.type === 'error') {
        setRunning(false);
        setStatusText(`오류: ${msg.error}`);
        showToast(msg.error ?? '알 수 없는 오류', 'danger');
      }
    };

    return () => es.close();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (running) return;

    try {
      const res = await fetch('/api/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, connections, duration, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '부하 테스트 시작 실패');
    } catch (err) {
      showToast((err as Error).message, 'danger');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>부하 테스트 <span>Console</span></h1>
        <p className={styles.heroSub}>게이트웨이 대상 시나리오 부하 테스트 및 유량 제어 검증</p>
      </header>

      <main className={styles.main}>
        {/* 설정 폼 */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="stress-target">대상 게이트웨이 주소 (Target URL)</label>
              <input
                id="stress-target"
                type="url"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="http://localhost:8000"
                required
              />
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label htmlFor="stress-conns">동시 연결 (Connections)</label>
                <input
                  id="stress-conns"
                  type="number"
                  min={1} max={1000}
                  value={connections}
                  onChange={e => setConnections(Number(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="stress-dur">지속 시간 (초)</label>
                <input
                  id="stress-dur"
                  type="number"
                  min={1} max={300}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="stress-scenario">부하 테스트 시나리오</label>
              <select
                id="stress-scenario"
                value={scenario}
                onChange={e => setScenario(e.target.value)}
              >
                {SCENARIOS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {scenarioDesc && <p className={styles.scenarioDesc}>{scenarioDesc}</p>}
            </div>

            <button
              type="submit"
              className={styles.startBtn}
              disabled={running}
            >
              {running && <span className={styles.spinner} />}
              {running ? '테스트 진행 중...' : '부하 테스트 시작 (Start Load Test)'}
            </button>
          </form>
        </div>

        {/* 진행 모니터 */}
        {showMonitor && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>테스트 진행 상황</h3>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              <span className={styles.progressLabel}>{progress}%</span>
            </div>
            <p className={styles.statusText}>{statusText}</p>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>테스트 실행 결과</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total Requests</span>
                <span className={styles.statVal}>{result.requests?.total?.toLocaleString() ?? '-'}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Req/Sec (Avg)</span>
                <span className={`${styles.statVal} ${styles.blue}`}>
                  {result.requests?.average?.toFixed(1) ?? '-'}
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Latency (Avg)</span>
                <span className={styles.statVal}>
                  {result.latency?.average != null ? `${result.latency.average.toFixed(1)}ms` : '-'}
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Success Rate</span>
                <span className={`${styles.statVal} ${styles.green}`}>
                  {result.requests?.total
                    ? `${(((result.requests.total - (result.non2xx ?? 0) - (result.errors ?? 0)) / result.requests.total) * 100).toFixed(1)}%`
                    : '-'}
                </span>
              </div>
            </div>
            {rawText && (
              <div className={styles.rawContainer}>
                <pre className={styles.raw}>{rawText}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}
