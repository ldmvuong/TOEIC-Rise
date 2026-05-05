import { useCallback, useMemo, useState } from "react";
import * as api from "@/api/api";

export default function useLearningPathLessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLessons = useCallback(async (learningPathId, params = {}) => {
    if (!learningPathId) throw new Error("Missing learningPathId");
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLearningPathLessons(learningPathId, params);
      const data = res?.data;
      const items = data?.result || data?.items || data?.content || data || [];
      setLessons(Array.isArray(items) ? items : []);
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({ lessons, loading, error, fetchLessons, setLessons }),
    [lessons, loading, error, fetchLessons],
  );
}
