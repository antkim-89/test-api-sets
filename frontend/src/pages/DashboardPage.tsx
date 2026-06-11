import { useState } from 'react';
import OverrideModal from '@/components/OverrideModal';
import ServiceCard from '@/components/ServiceCard';
import ViewOverridesModal from '@/components/ViewOverridesModal';
import { useServices } from '@/hooks/useServices';
import { useToast } from '@/hooks/useToast';
import type { Service } from '@/types';
import Toast from '@/components/Toast';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { services, lastUpdate, syncing, refresh } = useServices();
  const { toast, showToast } = useToast();

  const [overrideTarget, setOverrideTarget] = useState<{ name: string; controlPort: number } | null>(null);
  const [viewTarget, setViewTarget] = useState<{ svc: Service } | null>(null);

  const onlineCount = services.filter(s => s.online).length;

  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} />
        <h1 className={styles.heroTitle}>
          Gateway Test <span>Console</span>
        </h1>
        <p className={styles.heroSub}>
          10개 마이크로서비스 실시간 제어 · 지연 주입 · 응답 가로채기
        </p>
      </header>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusChip}>
          <span className={styles.statusDot} />
          온라인 <strong>{onlineCount}</strong> / 10
        </div>
        <div className={styles.syncArea}>
          {syncing && <span className={styles.spinner} />}
          <span className={styles.lastUpdate}>
            {lastUpdate ? `마지막 동기화: ${lastUpdate}` : '동기화 중...'}
          </span>
          <button className={styles.refreshBtn} onClick={() => refresh()}>
            새로고침
          </button>
        </div>
      </div>

      {/* Service Grid */}
      <section className={styles.grid}>
        {services.map(svc => (
          <ServiceCard
            key={svc.controlPort}
            svc={svc}
            onRefresh={refresh}
            onShowToast={showToast}
            onOpenOverride={(name, port) => setOverrideTarget({ name, controlPort: port })}
            onOpenViewOverrides={(_, port) => {
              const found = services.find(s => s.controlPort === port);
              if (found) setViewTarget({ svc: found });
            }}
          />
        ))}
      </section>

      {/* Modals */}
      {overrideTarget && (
        <OverrideModal
          serviceName={overrideTarget.name}
          controlPort={overrideTarget.controlPort}
          onClose={() => setOverrideTarget(null)}
          onSuccess={refresh}
          onShowToast={showToast}
        />
      )}

      {viewTarget && (
        <ViewOverridesModal
          serviceName={viewTarget.svc.name}
          controlPort={viewTarget.svc.controlPort}
          overrides={viewTarget.svc.overrides}
          onClose={() => setViewTarget(null)}
          onSuccess={refresh}
          onShowToast={showToast}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
