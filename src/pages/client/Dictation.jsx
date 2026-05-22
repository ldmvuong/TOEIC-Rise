import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Empty, Spin, message } from "antd";
import { getDictationLibrary } from "../../api/api";

function normalizePart(part) {
  if (typeof part !== "string") return null;
  const m = part.match(/PART_(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? { raw: part, no: n } : null;
}

function sortParts(parts) {
  const normalized = (Array.isArray(parts) ? parts : [])
    .map(normalizePart)
    .filter(Boolean);
  normalized.sort((a, b) => a.no - b.no);
  return normalized;
}

export default function DictationLibrary() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [expandedSetId, setExpandedSetId] = useState(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await getDictationLibrary();
      const data = Array.isArray(res?.data) ? res.data : [];
      setItems(data);
      if (data.length && expandedSetId == null) {
        setExpandedSetId(data[0]?.id ?? null);
      }
    } catch (e) {
      setItems([]);
      message.error(
        e?.response?.data?.message ||
          e?.message ||
          "Unable to load dictation library",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickPart = (testId, partRaw) => {
    const parsed = normalizePart(partRaw);
    if (!testId || !parsed?.no) return;
    navigate(`/dictation/practice/${testId}/part/${parsed.no}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">Dictation</h1>
            <p className="text-slate-600 mt-2">
              Choose a <span className="font-semibold">test set</span>, then select a{" "}
              <span className="font-semibold">Part</span> to begin.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Empty description="No test sets are ready for dictation yet" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-3">
                {items.map((set) => {
                  const isActive = (set?.id ?? null) === expandedSetId;
                  const tests = Array.isArray(set?.readyTests) ? set.readyTests : [];
                  return (
                    <button
                      key={set?.id ?? set?.name}
                      type="button"
                      onClick={() => setExpandedSetId(set?.id ?? null)}
                      className={`w-full text-left rounded-2xl border p-4 shadow-sm transition ${
                        isActive
                          ? "bg-white border-blue-300 ring-2 ring-blue-100"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900 truncate">
                            {set?.name || "Untitled"}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isActive
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-gray-50 border-gray-200 text-slate-600"
                          }`}
                        >
                          {tests.length}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2">
              {(() => {
                const activeSet =
                  items.find((x) => (x?.id ?? null) === expandedSetId) || items[0];
                const tests = Array.isArray(activeSet?.readyTests) ? activeSet.readyTests : [];

                return (
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Test set
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="text-xl font-bold text-slate-900 truncate">
                          {activeSet?.name || "Untitled"}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      {!tests.length ? (
                        <Empty description="This test set does not have any content yet" />
                      ) : (
                        <div className="space-y-3">
                          {tests.map((t) => {
                            const parts = sortParts(t?.availableParts);
                            return (
                              <div
                                key={t?.id ?? t?.name}
                                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-gray-300 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold text-slate-900 truncate">
                                      {t?.name || "Untitled test"}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {parts.map((p) => (
                                      <button
                                        key={String(p.no)}
                                        type="button"
                                        onClick={() => handlePickPart(t?.id, p.raw)}
                                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
                                      >
                                        Part {p.no}
                                      </button>
                                    ))}
                                    {!parts.length ? (
                                      <span className="text-sm text-slate-500">
                                        No Part available
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
