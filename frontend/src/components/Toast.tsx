import type { ToastState } from '@/types';
import styles from './Toast.module.css';

interface Props { toast: ToastState; }

export default function Toast({ toast }: Props) {
  if (!toast.visible) return null;
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      {toast.message}
    </div>
  );
}
