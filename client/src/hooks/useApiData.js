// Loads something from the API when a page opens and tracks the three states
// every page needs: loading, error and data.
//
//   const { data, loading, error, reload } = useApiData(getEmployeeDashboard);
//
// `fetchData` must be a stable function: either one imported from /api, or wrapped in useCallback.

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/axiosClient.js';

export function useApiData(fetchData, fallbackMessage = 'Could not load the data.') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null); // HTTP status of a failed request, e.g. 404
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false; // ignore the answer if the page was left in the meantime
    setLoading(true);
    setError('');
    setErrorStatus(null);

    fetchData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getErrorMessage(requestError, fallbackMessage));
        setErrorStatus(requestError.response?.status || null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchData, fallbackMessage, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { data, setData, loading, error, errorStatus, reload };
}
