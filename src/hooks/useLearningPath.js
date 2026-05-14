import { useCallback, useMemo, useState } from "react";
import * as api from "@/api/api";
export default function useLearningPath() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchPaths = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLearningPaths(params);
      const data = res?.data;
      const items = data?.result || data?.items || data?.content || data || [];
      setPaths(Array.isArray(items) ? items : []);
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  return useMemo(
    () => ({ paths, loading, error, fetchPaths, setPaths }),
    [paths, loading, error, fetchPaths],
  );
}
