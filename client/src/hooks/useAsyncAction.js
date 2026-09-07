import { useCallback, useState } from 'react';

// Standard busy/error handling for any submit-style action.
export function useAsyncAction(onError) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (action) => {
    setBusy(true);
    setError('');
    try {
      return await action();
    } catch (requestError) {
      setError(requestError.message);
      onError?.(requestError.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [onError]);
  return { busy, error, run };
}
