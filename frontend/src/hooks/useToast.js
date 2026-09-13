import { useCallback, useState } from 'react';

export function useToast(durationMs = 3600) {
  const [toast, setToast] = useState('');
  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), durationMs);
  }, [durationMs]);
  return { toast, notify };
}
