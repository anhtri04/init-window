import { useState, useCallback } from 'react';
import { App } from '../../shared/types';

export function useProcessScanner() {
  const [apps, setApps] = useState<App[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await window.electron.scanProcesses();
      setApps(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan processes');
      setApps([]);
    } finally {
      setScanning(false);
    }
  }, []);

  const clear = useCallback(() => {
    setApps([]);
    setError(null);
  }, []);

  return { apps, scanning, error, scan, clear };
}
