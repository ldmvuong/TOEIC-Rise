import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Empty, Spin, message } from "antd";
import { getDictationPart } from "../../api/api";
import { buildCloze, normalizeAnswer } from "../../utils/dictationCloze";

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function getCorrectLetter(group) {
  const q0 = Array.isArray(group?.questions) ? group.questions[0] : null;
  const c = q0?.correctOption;
  return typeof c === "string" ? c.trim().toUpperCase() : null;
}

export default function DictationPractice() {
  const routeParams = useParams();
  const [params] = useSearchParams();
  const testId = routeParams?.testId ?? params.get("testId");
  const partId = routeParams?.partId ?? params.get("partId");

  const partNo = useMemo(() => {
    const n = Number(partId);
    return Number.isFinite(n) ? n : null;
  }, [partId]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [mode, setMode] = useState("FILL"); // FILL | FLIP
  const [ratio, setRatio] = useState(0.3); // 0.3 | 0.5 | 0.7
  const [autoPlay, setAutoPlay] = useState(false);

  // Per group state
  const [selectedByGroupId, setSelectedByGroupId] = useState({});
  const [revealAllByGroupId, setRevealAllByGroupId] = useState({});
  const [flipReveal, setFlipReveal] = useState({}); // { [groupId]: { [tokenKey]: true } }
  const [fillAnswers, setFillAnswers] = useState({}); // { [groupId]: { [tokenKey]: string } }

  const audioRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchPart = async () => {
    if (!testId || !partId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getDictationPart(testId, partId);
      setData(res?.data ?? null);
    } catch (e) {
      setData(null);
      message.error(
        e?.response?.data?.message || e?.message || "Không thể tải bài chép chính tả",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, partId]);

  const groups = useMemo(() => {
    const arr = Array.isArray(data?.questionGroups) ? data.questionGroups : [];
    return arr;
  }, [data]);

  useEffect(() => {
    // reset pagination when changing test/part
    setCurrentIndex(0);
    setSelectedByGroupId({});
    setRevealAllByGroupId({});
    setFlipReveal({});
    setFillAnswers({});
  }, [testId, partId]);

  const total = groups.length;
  const currentGroup = total ? groups[Math.min(Math.max(currentIndex, 0), total - 1)] : null;
  const currentGroupId = currentGroup?.id ?? currentIndex;

  useEffect(() => {
    if (!autoPlay) return;
    // Play audio when switching question
    const t = window.setTimeout(() => {
      try {
        audioRef.current?.play?.();
      } catch {
        // ignore autoplay restrictions
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [autoPlay, currentIndex]);

  const renderClozeLine = (groupId, text, seedKey) => {
    const effectiveRatio = clamp01(ratio);
    const { tokens } = buildCloze(text, effectiveRatio, seedKey);
    const revealAll = !!revealAllByGroupId[groupId];
    const revealedMap = flipReveal[groupId] || {};
    const fillMap = fillAnswers[groupId] || {};
    const dotCount = (word) => {
      const n = Math.max(1, String(word ?? "").length);
      return Math.min(18, n);
    };

    const boxWidthCh = (dots) => {
      // Add some room so placeholder isn't clipped by padding.
      const w = Number(dots) || 1;
      return Math.max(7, Math.min(22, w + 3));
    };

    return (
      <span className="leading-6">
        {tokens.map((tk) => {
          if (!tk.isWord || !tk.hidden) {
            return (
              <span key={tk.key} className="whitespace-pre-wrap">
                {tk.t}
              </span>
            );
          }

          if (mode === "FLIP") {
            const isRevealed = revealAll || !!revealedMap[tk.key];
            const d = dotCount(tk.t);
            const dots = "•".repeat(d);
            const widthCh = boxWidthCh(d);
            return (
              <button
                key={tk.key}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (revealAll) return;
                  e.stopPropagation();
                  setFlipReveal((prev) => ({
                    ...prev,
                    [groupId]: { ...(prev[groupId] || {}), [tk.key]: true },
                  }));
                }}
                style={{ width: `${widthCh}ch` }}
                className={`inline-flex items-center justify-center align-baseline h-10 px-2 rounded-xl border mx-0.5 text-sm font-medium font-mono text-center ${
                  isRevealed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-200/60 border-amber-300 text-amber-950 hover:bg-amber-200 hover:ring-2 hover:ring-amber-100"
                }`}
                title={isRevealed ? "Đã mở" : "Nhấn để mở"}
              >
                {isRevealed ? tk.t : dots}
              </button>
            );
          }

          // FILL mode
          const typed = revealAll ? String(tk.t ?? "") : (fillMap[tk.key] ?? "");
          const isCorrect = normalizeAnswer(typed) === normalizeAnswer(tk.t);
          const d = dotCount(tk.t);
          const widthCh = boxWidthCh(d);
          const placeholder = "•".repeat(d);
          return (
            <span key={tk.key} className="inline-block align-baseline mx-0.5">
              <input
                value={typed}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                readOnly={revealAll}
                onChange={(e) => {
                  if (revealAll) return;
                  setFillAnswers((prev) => ({
                    ...prev,
                    [groupId]: { ...(prev[groupId] || {}), [tk.key]: e.target.value },
                  }));
                }}
                style={{ width: `${widthCh}ch` }}
                className={`h-10 px-2 rounded-xl border outline-none transition text-sm font-medium text-slate-900 placeholder:text-slate-400 font-mono text-center ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : revealAll
                      ? "bg-white border-blue-200"
                      : "bg-white border-blue-200 hover:border-blue-300 hover:ring-2 hover:ring-blue-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
                placeholder={placeholder}
                spellCheck={false}
              />
            </span>
          );
        })}
      </span>
    );
  };

  const handleSelectOption = (group) => (index) => {
    const groupId = group?.id;
    if (!groupId) return;
    const letter = optionLetter(index);
    setSelectedByGroupId((prev) => ({ ...prev, [groupId]: letter }));
  };

  const answeredCount = useMemo(() => {
    let c = 0;
    for (const g of groups) {
      const gid = g?.id;
      if (gid && selectedByGroupId[gid]) c += 1;
    }
    return c;
  }, [groups, selectedByGroupId]);

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="sticky top-16 z-10 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-sm px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-slate-900 font-semibold text-sm sm:text-base truncate">
                  {data?.testName ? `${data.testName} - Luyện tập` : "Chép chính tả - Luyện tập"}
                </div>
                <div className="text-slate-600 text-xs mt-0.5">
                  {data?.partName ? data.partName : partNo ? `Part ${partNo}` : ""}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMode("FILL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    mode === "FILL"
                      ? "bg-yellow-400 border-yellow-400 text-slate-900"
                      : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                  }`}
                >
                  Điền từ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("FLIP")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    mode === "FLIP"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                  }`}
                >
                  Lật từ
                </button>
                {[0.3, 0.5, 0.7].map((r) => (
                  <button
                    key={String(r)}
                    type="button"
                    onClick={() => setRatio(r)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                      ratio === r
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                    }`}
                  >
                    {Math.round(r * 100)}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAutoPlay((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    autoPlay
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                  }`}
                >
                  Auto
                </button>
                <div className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-slate-700">
                  {answeredCount}/{Math.max(total, 1)}
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-slate-700">
                  Câu {total ? currentIndex + 1 : 0}/{Math.max(total, 0)}
                </div>
                <Link
                  to="/dictation"
                  className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs font-semibold shadow-sm"
                >
                  Quay lại
                </Link>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : !groups.length ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Empty description="Không có nội dung chép chính tả cho part này" />
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              const correct = getCorrectLetter(currentGroup);
              const selected = selectedByGroupId[currentGroupId] || null;
              const options = (Array.isArray(currentGroup?.options) ? currentGroup.options : [])
                .filter((x) => typeof x === "string");
              const dictationText =
                (typeof currentGroup?.transcript === "string" && currentGroup.transcript.trim()) ||
                (typeof currentGroup?.passageText === "string" && currentGroup.passageText.trim()) ||
                "";
              const partN = Number(partId);
              const isPart1 = partN === 1;
              const isPart2 = partN === 2;
              const isPart12 = isPart1 || isPart2;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* LEFT: media (audio/image) */}
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                      <div className="text-sm font-semibold text-slate-900">
                        Nội dung nghe
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {currentGroup?.audioUrl ? "Audio" : "Không có audio"}
                      </div>
                    </div>

                    <div className="p-4">
                      {currentGroup?.audioUrl ? (
                        <div className="mb-4">
                          <audio ref={audioRef} controls src={currentGroup.audioUrl} className="w-full" />
                        </div>
                      ) : null}

                      {currentGroup?.imageUrl ? (
                        <div className="mb-4">
                          <img
                            src={currentGroup.imageUrl}
                            alt="illustration"
                            className="w-full rounded-2xl border border-gray-200 object-contain bg-gray-50"
                          />
                        </div>
                      ) : null}

                      {!isPart12 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          {dictationText ? (
                            <div className="text-slate-900">
                              {renderClozeLine(currentGroupId, dictationText, `${currentGroupId}-dictation`)}
                            </div>
                          ) : (
                            <div className="text-slate-600">Không có transcript/passage để chép.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: answer + dictation UI */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      {/* Blue dictation panel (match design) */}
                      <div className="p-4">
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-indigo-700">
                              {mode === "FILL" ? "Nghe & Điền từ:" : "Nghe & Lật từ:"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 cursor-not-allowed"
                              title="Demo UI"
                            >
                              Gợi ý <span className="ml-1 px-2 py-0.5 rounded-lg bg-indigo-200/60">Tab</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealAllByGroupId((prev) => ({
                                  ...prev,
                                  [currentGroupId]: !prev[currentGroupId],
                                }))
                              }
                              className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 hover:bg-amber-200/60"
                            >
                              {revealAllByGroupId[currentGroupId] ? "Ẩn lại" : "Mở tất cả"}
                            </button>
                          </div>
                        </div>

                        {/* Options list inside ONE panel */}
                        <div className="mt-3 space-y-2">
                          {!options.length ? (
                            <div className="text-slate-600">Part này không có đáp án lựa chọn.</div>
                          ) : (
                            options.map((opt, oi) => {
                              const letter = optionLetter(oi);
                              const isSelected = selected === letter;
                              const isCorrect = correct && letter === correct;
                              const showResult = !!selected;
                              const locked = showResult;

                              // Keep badge neutral (no red/green circle), but still show correctness feedback on the row.
                              const badgeTone = isSelected
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : "border-gray-200 text-slate-500 bg-white";

                              const rowTone = (() => {
                                if (!locked) return isSelected ? "bg-white border border-blue-200" : "";
                                // Locked:
                                // - Selected row: show green/red (correctness)
                                // - Also highlight the correct row subtly when user chose wrong
                                if (isSelected && isCorrect) return "bg-emerald-50/60 border border-emerald-200";
                                if (isSelected && !isCorrect) return "bg-rose-50/60 border border-rose-200";
                                if (!isSelected && correct && letter === correct)
                                  return "bg-emerald-50/30 border border-emerald-200/60";
                                return "opacity-70 cursor-not-allowed";
                              })();

                              return (
                                <button
                                  key={letter}
                                  type="button"
                                  disabled={locked}
                                  onClick={() => {
                                    if (locked) return;
                                    handleSelectOption(currentGroup)(oi);
                                  }}
                                  className={`w-full text-left transition rounded-2xl px-3 py-1.5 border border-transparent ${
                                    rowTone || (locked ? "opacity-70 cursor-not-allowed" : "hover:bg-white/70")
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${badgeTone}`}
                                    >
                                      {letter}
                                    </div>
                                    <div className="text-slate-900 text-sm leading-7">
                                      {isPart1
                                        ? renderClozeLine(currentGroupId, opt, `${currentGroupId}-opt-${letter}`)
                                        : opt}
                                    </div>
                                  </div>

                                  {/* Color feedback is enough (no text). */}
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Footer shortcuts (visual) */}
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-100/40 px-4 py-3 text-sm text-indigo-700">
                          <span className="font-semibold mr-2">Phím tắt:</span>
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold">
                              Tab
                            </span>
                            <span className="text-xs">gợi ý từ</span>
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold">
                              Ctrl
                            </span>
                            <span className="text-xs">phát/dừng</span>
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold">
                              Shift
                            </span>
                            <span className="text-xs">tua lại 3s</span>
                          </span>
                        </div>
                        </div>
                      </div>
                    </div>

                    {selectedByGroupId[currentGroupId] &&
                    Array.isArray(currentGroup?.questions) &&
                    currentGroup.questions[0]?.explanation ? (
                      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                        <div className="text-sm font-semibold text-slate-900 mb-2">
                          Giải thích đáp án
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-6">
                          {currentGroup.questions[0].explanation}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className={`px-4 py-2 rounded-xl border font-semibold ${
                  currentIndex <= 0
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                }`}
              >
                Trước
              </button>
              <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                {total ? currentIndex + 1 : 0}/{total}
              </div>
              <button
                type="button"
                disabled={currentIndex >= total - 1}
                onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                className={`px-4 py-2 rounded-xl border font-semibold ${
                  currentIndex >= total - 1
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                }`}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

