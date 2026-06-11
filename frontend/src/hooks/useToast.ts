import { useCallback, useRef, useState } from 'react';
import type { ToastState, ToastType } from '@/types';

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  return { toast, showToast };
}
