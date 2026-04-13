import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

function parsePart(part) {
  if (typeof part !== "string") return null;
  const m = part.match(/PART_(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export default function DictationPractice() {
  const [params] = useSearchParams();
  const testId = params.get("testId");
  const part = params.get("part");

  const partNo = useMemo(() => parsePart(part), [part]);

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Chép chính tả
            </h1>
            <p className="text-slate-600 mt-1">
              Màn hình làm bài sẽ được triển khai tiếp theo.
            </p>
          </div>
          <Link
            to="/dictation"
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-slate-700 shadow-sm"
          >
            Quay lại thư viện
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Test ID
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {testId || "—"}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Part
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {partNo ? `Part ${partNo}` : part || "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
            Đã nhận lựa chọn của bạn. Bước tiếp theo: gọi API làm bài dictation
            theo <span className="font-semibold">testId</span> và{" "}
            <span className="font-semibold">part</span>.
          </div>
        </div>
      </div>
    </div>
  );
}

