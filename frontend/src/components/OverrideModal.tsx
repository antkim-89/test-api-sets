import { useEffect, useRef, useState } from 'react';
import { addOverride, fetchApiSpec } from '@/api/controlApi';
import type { ApiEndpoint } from '@/types';
import styles from './Modal.module.css';

const STATUS_GROUPS = [
  { label: '✅ 2xx 성공',          options: [200, 201, 202, 204] },
  { label: '↩️ 3xx 리다이렉션',    options: [301, 302, 304, 307, 308] },
  { label: '⚠️ 4xx 클라이언트 오류', options: [400, 401, 403, 404, 405, 408, 409, 410, 422, 429] },
  { label: '🔥 5xx 서버 오류',      options: [500, 501, 502, 503, 504, 505] },
];

const STATUS_TEXT: Record<number, string> = {
  200:'OK', 201:'Created', 202:'Accepted', 204:'No Content',
  301:'Moved Permanently', 302:'Found', 304:'Not Modified', 307:'Temporary Redirect', 308:'Permanent Redirect',
  400:'Bad Request', 401:'Unauthorized', 403:'Forbidden', 404:'Not Found',
  405:'Method Not Allowed', 408:'Request Timeout', 409:'Conflict', 410:'Gone',
  422:'Unprocessable Entity', 429:'Too Many Requests',
  500:'Internal Server Error', 501:'Not Implemented', 502:'Bad Gateway',
  503:'Service Unavailable', 504:'Gateway Timeout', 505:'HTTP Version Not Supported',
};

interface Props {
  serviceName: string;
  controlPort: number;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'danger' | 'warning') => void;
}

export default function OverrideModal({ serviceName, controlPort, onClose, onSuccess, onShowToast }: Props) {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [statusCode, setStatusCode] = useState(200);
  const [headersJson, setHeadersJson] = useState('{}');
  const [bodyJson, setBodyJson] = useState('{}');
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchApiSpec(controlPort)
      .then(eps => {
        setEndpoints(eps);
        if (eps.length > 0) setSelectedEndpoint(`${eps[0].method}:${eps[0].path}`);
      })
      .catch(() => onShowToast('API 명세 조회 실패', 'danger'))
      .finally(() => setLoading(false));
  }, [controlPort, onShowToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let headers: Record<string, string> = {};
    let body: unknown = {};

    try { headers = JSON.parse(headersJson); } catch {
      return onShowToast('헤더 JSON 형식 오류', 'danger');
    }
    try { body = JSON.parse(bodyJson); } catch {
      return onShowToast('바디 JSON 형식 오류', 'danger');
    }

    const [method, ...pathParts] = selectedEndpoint.split(':');
    const path = pathParts.join(':');

    try {
      await addOverride(controlPort, { path, method, statusCode, headers, body });
      onShowToast('오버라이드가 등록되었습니다.');
      onSuccess();
      onClose();
    } catch (err) {
      onShowToast((err as Error).message, 'danger');
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div className={styles.backdrop} ref={backdropRef} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            오버라이드 추가
            <span className={styles.serviceTag}>{serviceName}-service</span>
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 엔드포인트 */}
          <div className={styles.field}>
            <label>엔드포인트</label>
            {loading ? (
              <div className={styles.loading}>
                <span className={styles.spinner} /> 명세 불러오는 중...
              </div>
            ) : (
              <select
                value={selectedEndpoint}
                onChange={e => setSelectedEndpoint(e.target.value)}
                required
              >
                {endpoints.map(ep => (
                  <option key={`${ep.method}:${ep.path}`} value={`${ep.method}:${ep.path}`}>
                    [{ep.method.padEnd(6)}] {ep.path}{ep.summary ? ` — ${ep.summary}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 상태 코드 */}
          <div className={styles.field}>
            <label>반환 HTTP 상태코드</label>
            <select value={statusCode} onChange={e => setStatusCode(Number(e.target.value))}>
              {STATUS_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map(code => (
                    <option key={code} value={code}>
                      {code} {STATUS_TEXT[code]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 헤더 */}
          <div className={styles.field}>
            <label>응답 헤더 (JSON)</label>
            <textarea
              rows={2}
              value={headersJson}
              onChange={e => setHeadersJson(e.target.value)}
              placeholder='{}'
            />
          </div>

          {/* 바디 */}
          <div className={styles.field}>
            <label>응답 바디 (JSON)</label>
            <textarea
              rows={4}
              value={bodyJson}
              onChange={e => setBodyJson(e.target.value)}
              placeholder='{}'
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
