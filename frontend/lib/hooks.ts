"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Load data once, expose the error (instead of swallowing it) and a retry. */
export function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const next = await fnRef.current();
      if (alive.current) setData(next);
    } catch (e) {
      if (alive.current) setError(e);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, setData, error, reload };
}
