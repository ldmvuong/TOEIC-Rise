import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Spin } from "antd";
import useLearningPath from "@/hooks/useLearningPath";

export default function LearningPathsPage() {
  const { paths, loading, fetchPaths } = useLearningPath();

  useEffect(() => {
    fetchPaths().catch(() => {
      // silent; UI shows empty state
    });
  }, [fetchPaths]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Learning Paths
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Chọn một lộ trình để xem chi tiết và tiến độ học trên bản đồ lộ
            trình.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Spin size="small" />
            <span>Đang tải learning paths…</span>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(paths || []).map((p) => (
            <Link
              key={p.id}
              to={`/learning-paths/${p.slug ?? p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">
                    {p.title || p.name || `Path #${p.id}`}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {p.description || "No description"}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  View
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && (!paths || paths.length === 0) ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
            Chưa có learning path nào.
          </div>
        ) : null}
      </div>
    </div>
  );
}
