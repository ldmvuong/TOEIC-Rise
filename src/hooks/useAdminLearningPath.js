import { useCallback, useMemo, useState } from "react";
import * as api from "@/api/api";

export default function useAdminLearningPath() {
  const [list, setList] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLearningPaths = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminLearningPaths(params);
      const data = res?.data;
      const items = data?.result || data?.items || data?.content || data || [];
      const total = data?.meta?.total ?? data?.total ?? items?.length ?? 0;
      const page = data?.meta?.page ?? data?.page ?? params.page ?? 0;
      const size = data?.meta?.pageSize ?? data?.size ?? params.size ?? 10;

      setList(Array.isArray(items) ? items : []);
      setMeta({ page, size, total });
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({
      list,
      meta,
      loading,
      error,
      fetchLearningPaths,
      setList,
    }),
    [list, meta, loading, error, fetchLearningPaths],
  );
}
