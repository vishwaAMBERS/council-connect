import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Loads `path` from the API. Pass null to skip.
 * `pollMs` re-fetches quietly in the background (the prototype's stand-in for real-time updates).
 */
export function useApi(path, { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const latest = useRef(0);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!path) return;
      const ticket = ++latest.current;
      if (!quiet) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await api.get(path);
        if (ticket === latest.current) setState({ data, error: null, loading: false });
      } catch (error) {
        // A failed background poll keeps showing the last good data.
        if (ticket === latest.current) setState((s) => (quiet && s.data ? s : { data: null, error, loading: false }));
      }
    },
    [path]
  );

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    load();
    if (!pollMs) return undefined;
    const timer = setInterval(() => load({ quiet: true }), pollMs);
    return () => clearInterval(timer);
  }, [path, pollMs, load]);

  return { ...state, reload: () => load({ quiet: true }) };
}
