import { useRef } from 'react';
import { deleteAllOverrides, deleteOverride } from '@/api/controlApi';
import type { Override } from '@/types';
import styles from './Modal.module.css';

interface Props {
  serviceName: string;
  controlPort: number;
  overrides: Record<string, Override>;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'danger' | 'warning') => void;
}

export default function ViewOverridesModal({
  serviceName,
  controlPort,
  overrides,
  onClose,
  onSuccess,
  onShowToast,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (key: string) => {
    const [method, ...pathParts] = key.split(':');
    const path = pathParts.join(':');
    try {
      await deleteOverride(controlPort, path, method);
      onShowToast('가로채기 규칙이 삭제됐습니다.');
      onSuccess();
      if (Object.keys(overrides).length <= 1) onClose();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 가로채기 규칙을 삭제하시겠습니까?')) return;
    try {
      await deleteAllOverrides(controlPort);
      onShowToast('모든 가로채기 규칙이 초기화됐습니다.');
      onSuccess();
      onClose();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const entries = Object.entries(overrides);

  return (
    <div className={styles.backdrop} ref={backdropRef} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            가로채기 목록
            <span className={styles.serviceTag}>{serviceName}-service</span>
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.overrideList}>
          {entries.length === 0 ? (
            <p className={styles.empty}>등록된 가로채기 규칙이 없습니다.</p>
          ) : (
            entries.map(([key, item]) => {
              const [method, ...pathParts] = key.split(':');
              const path = pathParts.join(':');
              const isError = item.statusCode >= 400;
              return (
                <div key={key} className={styles.overrideItem}>
                  <div className={styles.overrideMeta}>
                    <div className={styles.overrideTags}>
                      <span className={styles.pathTag}>{method} {path}</span>
                      <span className={`${styles.statusTag} ${isError ? styles.errorStatus : ''}`}>
                        HTTP {item.statusCode}
                      </span>
                    </div>
                    <button
                      className={`${styles.btn} ${styles.btnDangerSm}`}
                      onClick={() => handleDelete(key)}
                    >
                      삭제
                    </button>
                  </div>
                  <div className={styles.overrideDetail}>
                    <div><strong>Headers:</strong> {JSON.stringify(item.headers)}</div>
                    <div><strong>Body:</strong> {JSON.stringify(item.body)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
            닫기
          </button>
          {entries.length > 0 && (
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteAll}>
              전체 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
