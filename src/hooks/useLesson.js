import { useCallback, useMemo, useState } from "react";
import * as api from "@/api/api";

export default function useLesson() {
  const [list, setList] = useState([]);
  const [meta, setMeta] = useState({ page: 0, size: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLessons = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminLessons(params);
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

  const createLesson = useCallback(async (payload) => {
    setError(null);
    const res = await api.createAdminLesson(payload);
    return res;
  }, []);

  const updateLesson = useCallback(async (id, payload) => {
    setError(null);
    const res = await api.updateAdminLesson(id, payload);
    return res;
  }, []);

  const deleteLesson = useCallback(async (id) => {
    setError(null);
    const res = await api.deleteAdminLesson(id);
    return res;
  }, []);

  return useMemo(
    () => ({
      list,
      meta,
      loading,
      error,
      fetchLessons,
      createLesson,
      updateLesson,
      deleteLesson,
      setList,
    }),
    [
      list,
      meta,
      loading,
      error,
      fetchLessons,
      createLesson,
      updateLesson,
      deleteLesson,
    ],
  );
}
