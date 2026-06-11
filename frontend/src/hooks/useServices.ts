import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchServiceStatus, SERVICES_CONFIG } from '@/api/controlApi';
import type { Service } from '@/types';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const results = await Promise.all(SERVICES_CONFIG.map(fetchServiceStatus));
      setServices(results);
      setLastUpdate(new Date().toLocaleTimeString());
    } finally {
      if (!silent) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll(true), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  return { services, setServices, lastUpdate, syncing, refresh: fetchAll };
}
