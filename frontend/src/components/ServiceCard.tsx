import { useRef, useState } from 'react';
import {
  applyDelay,
  clearDelay,
  shutdownService,
  startupService,
  resetServiceStats,
} from '@/api/controlApi';
import type { Service } from '@/types';
import styles from './ServiceCard.module.css';

interface Props {
  svc: Service;
  onRefresh: () => void;
  onShowToast: (msg: string, type?: 'success' | 'danger' | 'warning') => void;
  onOpenOverride: (name: string, controlPort: number) => void;
  onOpenViewOverrides: (name: string, controlPort: number) => void;
}

export default function ServiceCard({
  svc,
  onRefresh,
  onShowToast,
  onOpenOverride,
  onOpenViewOverrides,
}: Props) {
  const [delayVal, setDelayVal] = useState<string>(String(svc.delayMs || 0));
  const [timerVal, setTimerVal] = useState<string>('5');
  const delayInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await startupService(svc.controlPort);
        onShowToast(`${svc.name}-service 기동됨`);
      } else {
        await shutdownService(svc.controlPort);
        onShowToast(`${svc.name}-service 종료됨`);
      }
      onRefresh();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
      onRefresh();
    }
  };

  const handleApplyDelay = async () => {
    const ms = parseInt(delayVal, 10) || 0;
    try {
      await applyDelay(svc.controlPort, ms);
      onShowToast(`지연 시간 ${ms}ms 설정됨`);
      onRefresh();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleClearDelay = async () => {
    try {
      await clearDelay(svc.controlPort);
      onShowToast('지연 설정 해제됨');
      onRefresh();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleTimerShutdown = async () => {
    const sec = parseInt(timerVal, 10) || 5;
    try {
      await shutdownService(svc.controlPort, sec * 1000);
      onShowToast(`${svc.name}-service 종료. ${sec}초 후 자동 복구`);
      onRefresh();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleResetStats = async () => {
    try {
      await resetServiceStats(svc.controlPort);
      onShowToast(`${svc.name}-service 요청 통계 초기화됨`);
      onRefresh();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  return (
    <div className={`${styles.card} ${svc.online ? styles.online : styles.offline}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.info}>
          <h3 className={styles.title}>{svc.name}-service</h3>
          <div className={styles.badges}>
            <span className={styles.portBadge}>Main: {svc.port}</span>
            <span className={styles.portBadge}>Ctrl: {svc.controlPort}</span>
            {svc.delayMs > 0 && (
              <span className={`${styles.badge} ${styles.delayBadge}`}>
                {svc.delayMs}ms 지연
              </span>
            )}
            {svc.overridesCount > 0 && (
              <span className={`${styles.badge} ${styles.overrideBadge}`}>
                가로채기 {svc.overridesCount}개
              </span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div className={styles.statusArea}>
          <div className={`${styles.dot} ${svc.online ? styles.dotOnline : styles.dotOffline}`} />
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={svc.online}
              onChange={e => handleToggle(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {/* 지연 시간 */}
        <div className={styles.row}>
          <label className={styles.label}>지연 시간:</label>
          <input
            ref={delayInputRef}
            type="number"
            className={styles.inputSmall}
            value={delayVal}
            min={0}
            placeholder="ms"
            onChange={e => setDelayVal(e.target.value)}
          />
          <span className={styles.unit}>ms</span>
          {svc.delayMs > 0 ? (
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleClearDelay}>
              해제
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleApplyDelay}>
              적용
            </button>
          )}
        </div>

        {/* 자동 복구 */}
        <div className={styles.row}>
          <label className={styles.label}>자동 복구:</label>
          <input
            type="number"
            className={styles.inputSmall}
            value={timerVal}
            min={1}
            placeholder="초"
            onChange={e => setTimerVal(e.target.value)}
          />
          <span className={styles.unit}>초 후</span>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={handleTimerShutdown}
            disabled={!svc.online}
          >
            자동복구
          </button>
        </div>

        {/* 오버라이드 버튼 */}
        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => onOpenOverride(svc.name, svc.controlPort)}
            disabled={!svc.online}
          >
            <svg className={styles.icon} viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            오버라이드 추가
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => onOpenViewOverrides(svc.name, svc.controlPort)}
            disabled={svc.overridesCount === 0}
          >
            가로채기 관리 ({svc.overridesCount})
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className={styles.statsSection}>
        <div className={styles.statsHeader}>
          <span className={styles.statsTitle}>요청 통계 (2xx vs 4xx/5xx)</span>
          <button
            className={styles.resetStatsBtn}
            onClick={handleResetStats}
            title="통계 초기화"
          >
            초기화
          </button>
        </div>
        
        {svc.stats && svc.stats.total > 0 ? (
          <div>
            <div className={styles.statsTextRow}>
              <span>총 {svc.stats.total}회 요청</span>
              <span>
                성공 {svc.stats.success} ({Math.round((svc.stats.success / svc.stats.total) * 100)}%)
                &nbsp;/&nbsp;
                실패 {svc.stats.error} ({Math.round((svc.stats.error / svc.stats.total) * 100)}%)
              </span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressSuccess} 
                style={{ width: `${(svc.stats.success / svc.stats.total) * 100}%` }} 
              />
              <div 
                className={styles.progressError} 
                style={{ width: `${(svc.stats.error / svc.stats.total) * 100}%` }} 
              />
            </div>
          </div>
        ) : (
          <div>
            <div className={styles.statsTextRow}>
              <span className={styles.mutedText}>대기 중... (트래픽 없음)</span>
            </div>
            <div className={styles.progressBarEmpty} />
          </div>
        )}
      </div>
    </div>
  );
}
