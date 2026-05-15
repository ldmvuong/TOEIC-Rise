import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Drawer, Empty, Modal, Spin, message } from "antd";
import { getDictationPart } from "../../api/api";
import { buildCloze, normalizeAnswer } from "../../utils/dictationCloze";
import DictationAudioPlayer from "../../components/dictation/DictationAudioPlayer";
import { IconCheckCircle, IconPencil, IconSparkles } from "../../components/icons";
import parse from "html-react-parser";

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
  const navigate = useNavigate();
  const routeParams = useParams();
  const [params] = useSearchParams();
  const testId = routeParams?.testId ?? params.get("testId");
  const partId = routeParams?.partId ?? params.get("partId");
  const [navOpen, setNavOpen] = useState(false);

  const partNo = useMemo(() => {
    const n = Number(partId);
    return Number.isFinite(n) ? n : null;
  }, [partId]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [mode, setMode] = useState("FILL"); // FILL | FLIP
  const [ratio, setRatio] = useState(0.3); // 0.3 | 0.5 | 0.7

  // Per group state
  const [selectedByGroupId, setSelectedByGroupId] = useState({});
  const [revealAllByGroupId, setRevealAllByGroupId] = useState({});
  const [flipReveal, setFlipReveal] = useState({}); // { [groupId]: { [tokenKey]: true } }
  const [fillAnswers, setFillAnswers] = useState({}); // { [groupId]: { [tokenKey]: string } }
  const [fillTouched, setFillTouched] = useState({}); // { [groupId]: { [tokenKey]: true } }
  const [selectedByQuestionId, setSelectedByQuestionId] = useState({});
  const [expandedExplainByQuestionId, setExpandedExplainByQuestionId] = useState({});
  const [showTranscriptByGroupId, setShowTranscriptByGroupId] = useState({});

  const rootRef = useRef(null);
  const audioCtlRef = useRef(null);

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
        e?.response?.data?.message || e?.message || "Unable to load dictation practice",
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
    setFillTouched({});
    setSelectedByQuestionId({});
    setExpandedExplainByQuestionId({});
    setShowTranscriptByGroupId({});
  }, [testId, partId]);

  const total = groups.length;
  const currentGroup = total ? groups[Math.min(Math.max(currentIndex, 0), total - 1)] : null;
  const currentGroupId = currentGroup?.id ?? currentIndex;

  const renderClozeLine = (groupId, text, seedKey) => {
    const effectiveRatio = clamp01(ratio);
    const { tokens } = buildCloze(text, effectiveRatio, seedKey);
    const revealAll = !!revealAllByGroupId[groupId];
    const revealedMap = flipReveal[groupId] || {};
    const fillMap = fillAnswers[groupId] || {};
    const touchedMap = fillTouched[groupId] || {};
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
                data-cloze-flip="1"
                data-revealed={isRevealed ? "1" : "0"}
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
                title={isRevealed ? "Revealed" : "Click to reveal"}
              >
                {isRevealed ? tk.t : dots}
              </button>
            );
          }

          // FILL mode
          const typed = revealAll ? String(tk.t ?? "") : (fillMap[tk.key] ?? "");
          const isCorrect = normalizeAnswer(typed) === normalizeAnswer(tk.t);
          const isTouched = !!touchedMap[tk.key];
          const showWrong = !revealAll && isTouched && !!typed && !isCorrect;
          const d = dotCount(tk.t);
          const widthCh = boxWidthCh(d);
          const placeholder = "•".repeat(d);
          return (
            <span key={tk.key} className="inline-block align-baseline mx-0.5">
              <input
                value={typed}
                data-cloze-input="1"
                data-filled={typed ? "1" : "0"}
                data-cloze-key={tk.key}
                data-correct={String(tk.t ?? "")}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                readOnly={revealAll}
                onBlur={() => {
                  if (revealAll) return;
                  setFillTouched((prev) => ({
                    ...prev,
                    [groupId]: { ...(prev[groupId] || {}), [tk.key]: true },
                  }));
                }}
                onChange={(e) => {
                  if (revealAll) return;
                  const nextVal = e.target.value;
                  setFillAnswers((prev) => ({
                    ...prev,
                    [groupId]: { ...(prev[groupId] || {}), [tk.key]: nextVal },
                  }));

                  // If user fixed it, drop wrong state immediately
                  if (normalizeAnswer(nextVal) === normalizeAnswer(tk.t)) {
                    setFillTouched((prev) => {
                      const g = prev[groupId] || {};
                      if (!g[tk.key]) return prev;
                      return { ...prev, [groupId]: { ...g, [tk.key]: false } };
                    });
                  }
                }}
                style={{ width: `${widthCh}ch` }}
                className={`h-10 px-2 rounded-xl border outline-none transition text-sm font-medium text-slate-900 placeholder:text-slate-400 font-mono text-center ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : showWrong
                      ? "bg-rose-50 border-rose-300 text-rose-900 hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
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

  const handleSelectQuestionOption = (questionId, letter) => {
    if (!questionId || !letter) return;
    setSelectedByQuestionId((prev) => {
      if (prev[questionId]) return prev; // lock after selecting
      return { ...prev, [questionId]: letter };
    });
  };

  const handleBack = () => {
    Modal.confirm({
      title: "Back to library?",
      content: "You may lose your progress on the current question.",
      okText: "Go back",
      cancelText: "Stay",
      centered: true,
      onOk: () => navigate("/dictation"),
    });
  };

  const runHint = () => {
    const root = rootRef.current || document;
    if (mode === "FLIP") {
      const btn = root.querySelector('button[data-cloze-flip="1"][data-revealed="0"]');
      btn?.click?.();
      return;
    }

    const groupId = currentGroupId;
    const revealAll = !!revealAllByGroupId[groupId];
    if (revealAll) return;

    const inputs = Array.from(root.querySelectorAll('input[data-cloze-input="1"]'));
    const next = inputs.find((el) => {
      const correct = el.getAttribute("data-correct") || "";
      const typedNow = el.value || "";
      if (!typedNow) return true;
      return normalizeAnswer(typedNow) !== normalizeAnswer(correct);
    });
    if (!next) return;

    const tokenKey = next.getAttribute("data-cloze-key");
    const correct = next.getAttribute("data-correct") || "";
    if (!tokenKey) return;

    setFillAnswers((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] || {}), [tokenKey]: correct },
    }));
    setFillTouched((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] || {}), [tokenKey]: false },
    }));
    next.focus?.();
    next.select?.();
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      // Avoid hijacking shortcuts while typing in an input, except Tab hint.
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";

      if (e.key === "Control") {
        if (isTyping) return;
        e.preventDefault();
        audioCtlRef.current?.togglePlay?.();
        return;
      }
      if (e.key === "Shift") {
        if (isTyping) return;
        e.preventDefault();
        audioCtlRef.current?.seekBy?.(-3);
        return;
      }
      if (e.key === "Tab") {
        // "Gợi ý": FLIP => reveal next hidden; FILL => reveal next blank (or fix wrong) in order
        e.preventDefault();
        runHint();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, currentGroupId, revealAllByGroupId]);

  const scoreStats = useMemo(() => {
    const partN = Number(partId);
    const isPart34 = partN === 3 || partN === 4;

    let totalQ = 0;
    let correctQ = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const gid = g?.id ?? gi;

      if (isPart34) {
        const qs = Array.isArray(g?.questions) ? g.questions : [];
        totalQ += qs.length;
        for (let qi = 0; qi < qs.length; qi++) {
          const q = qs[qi];
          const qId = q?.id ?? `${gid}-q-${qi}`;
          const picked = selectedByQuestionId[qId] || null;
          const correctLetter =
            typeof q?.correctOption === "string" ? q.correctOption.trim().toUpperCase() : null;
          if (picked && correctLetter && picked === correctLetter) correctQ += 1;
        }
      } else {
        totalQ += 1;
        const picked = selectedByGroupId[gid] || null;
        const correctLetter = getCorrectLetter(g);
        if (picked && correctLetter && picked === correctLetter) correctQ += 1;
      }
    }

    return { correctQ, totalQ };
  }, [groups, partId, selectedByGroupId, selectedByQuestionId]);

  const navItems = useMemo(() => {
    const partN = Number(partId);
    const isPart34 = partN === 3 || partN === 4;
    const items = [];

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const gid = g?.id ?? gi;

      if (isPart34) {
        const qs = Array.isArray(g?.questions) ? g.questions : [];
        for (let qi = 0; qi < qs.length; qi++) {
          const q = qs[qi];
          const qId = q?.id ?? `${gid}-q-${qi}`;
          const posRaw = q?.position ?? q?.questionPosition;
          const position = Number.isFinite(Number(posRaw)) ? Number(posRaw) : items.length + 1;
          const picked = selectedByQuestionId[qId] || null;
          const correctLetter =
            typeof q?.correctOption === "string" ? q.correctOption.trim().toUpperCase() : null;
          const status = !picked ? "UNANSWERED" : picked === correctLetter ? "CORRECT" : "WRONG";
          items.push({ key: String(qId), position, groupIndex: gi, questionIndex: qi, status });
        }
      } else {
        const q0 = Array.isArray(g?.questions) ? g.questions[0] : null;
        const posRaw = q0?.position ?? q0?.questionPosition ?? gi + 1;
        const position = Number.isFinite(Number(posRaw)) ? Number(posRaw) : gi + 1;
        const picked = selectedByGroupId[gid] || null;
        const correctLetter = getCorrectLetter(g);
        const status = !picked ? "UNANSWERED" : picked === correctLetter ? "CORRECT" : "WRONG";
        items.push({ key: String(gid), position, groupIndex: gi, questionIndex: null, status });
      }
    }

    items.sort((a, b) => a.position - b.position);
    return items;
  }, [groups, partId, selectedByGroupId, selectedByQuestionId]);

  const currentNavPos = useMemo(() => {
    const partN = Number(partId);
    const isPart34 = partN === 3 || partN === 4;
    if (!navItems.length) return null;

    if (!isPart34) {
      const gid = currentGroup?.id ?? currentIndex;
      const hit = navItems.find((x) => String(x.key) === String(gid));
      return hit?.position ?? null;
    }

    // Part 3/4: best effort - pick the first question's position in current group
    const qs = Array.isArray(currentGroup?.questions) ? currentGroup.questions : [];
    const q0 = qs[0];
    const gid = currentGroup?.id ?? currentIndex;
    const qId = q0?.id ?? `${gid}-q-0`;
    const hit = navItems.find((x) => String(x.key) === String(qId));
    return hit?.position ?? null;
  }, [navItems, partId, currentGroup, currentIndex]);

  const navStats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    for (const it of navItems) {
      if (it.status === "CORRECT") correct += 1;
      else if (it.status === "WRONG") wrong += 1;
      else unanswered += 1;
    }
    return { correct, wrong, unanswered, total: navItems.length };
  }, [navItems]);

  return (
    <div className="container mx-auto px-4 pt-4 pb-5 min-h-screen bg-gray-50">
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="Question list"
        placement="right"
        width={360}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-emerald-500 bg-emerald-500/10" />
              {navStats.correct} Correct
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-rose-500 bg-rose-500/10" />
              {navStats.wrong} Wrong
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-gray-300 bg-gray-100" />
              {navStats.unanswered} Unanswered
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {navItems.map((it) => {
              const isCurrent = currentNavPos != null && it.position === currentNavPos;
              const tone =
                it.status === "CORRECT"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : it.status === "WRONG"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50";
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(it.groupIndex);
                    setNavOpen(false);
                  }}
                  className={`h-9 rounded-lg border text-xs font-semibold ${tone} ${
                    isCurrent ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                  }`}
                  title={`Question ${it.position}`}
                >
                  {it.position}
                </button>
              );
            })}
          </div>
        </div>
      </Drawer>

      <div className="max-w-6xl mx-auto flex flex-col lg:h-[calc(100vh-64px)] lg:overflow-hidden">
        <div className="mb-4 flex-shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-sm px-3 sm:px-4 py-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-slate-900 font-semibold text-sm sm:text-base truncate">
                  {data?.testName ? `${data.testName} - Practice` : "Dictation - Practice"}
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
                  <span className="inline-flex items-center gap-1.5">
                    <IconPencil className={mode === "FILL" ? "text-slate-900" : "text-slate-500"} />
                    Fill words
                  </span>
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
                  <span className="inline-flex items-center gap-1.5">
                    <IconSparkles className={mode === "FLIP" ? "text-white" : "text-slate-500"} />
                    Flip words
                  </span>
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
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500 border border-emerald-600 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                  <IconCheckCircle className="text-white" />
                  {scoreStats.correctQ}/{Math.max(scoreStats.totalQ, 1)}
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-slate-700">
                  Question {total ? currentIndex + 1 : 0}/{Math.max(total, 0)}
                </div>
                <button
                  type="button"
                  onClick={() => setNavOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs font-semibold shadow-sm inline-flex items-center gap-2"
                  title="Open question list"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M4 4h6v6H4V4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M14 4h6v6h-6V4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 14h6v6H4v-6z" stroke="currentColor" strokeWidth="2" />
                    <path d="M14 14h6v6h-6v-6z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      currentIndex <= 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= total - 1}
                    onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      currentIndex >= total - 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-slate-700 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3 py-1 rounded-lg bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs font-semibold shadow-sm"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 min-h-0 flex justify-center items-center py-10">
            <Spin size="large" />
          </div>
        ) : !groups.length ? (
          <div className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Empty description="No dictation content is available for this part" />
          </div>
        ) : (
          <div className="flex-1 min-h-0" ref={rootRef}>
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
              const isPart34 = partN === 3 || partN === 4;

          const effectiveRatio = clamp01(ratio);
          const getPendingCountForLine = (text, seedKey) => {
            if (!text) return 0;
            const revealAll = !!revealAllByGroupId[currentGroupId];
            if (revealAll) return 0;

            const { tokens } = buildCloze(text, effectiveRatio, seedKey);
            const revealedMap = flipReveal[currentGroupId] || {};
            const fillMap = fillAnswers[currentGroupId] || {};
            let pending = 0;
            for (const tk of tokens) {
              if (!tk.isWord || !tk.hidden) continue;
              if (mode === "FLIP") {
                if (!revealedMap[tk.key]) pending += 1;
              } else {
                const typed = fillMap[tk.key] ?? "";
                if (normalizeAnswer(typed) !== normalizeAnswer(tk.t)) pending += 1;
              }
            }
            return pending;
          };

          const clozePendingCount = (() => {
            // Determine which lines are clozed for this screen
            if (isPart34) {
              return getPendingCountForLine(
                currentGroup?.passageText || "",
                `${currentGroupId}-passage`,
              );
            }

            if (!isPart12 && !isPart34) {
              return getPendingCountForLine(dictationText, `${currentGroupId}-dictation`);
            }

            // Part 1/2
            let c = 0;
            if (isPart2 && currentGroup?.questionText) {
              c += getPendingCountForLine(currentGroup.questionText, `${currentGroupId}-q`);
            }
            // options are clozed for both Part 1 and Part 2
            for (let oi = 0; oi < options.length; oi++) {
              const letter = optionLetter(oi);
              c += getPendingCountForLine(options[oi], `${currentGroupId}-opt-${letter}`);
            }
            return c;
          })();

          const canHint = clozePendingCount > 0 && !revealAllByGroupId[currentGroupId];
          const canRevealAll = clozePendingCount > 0 && !revealAllByGroupId[currentGroupId];
          const canShowTranscript =
            (!!revealAllByGroupId[currentGroupId] || clozePendingCount === 0) &&
            typeof currentGroup?.transcript === "string" &&
            !!currentGroup.transcript.trim();

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full min-h-0 overflow-hidden">
                  {/* LEFT: media (audio/image) */}
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm h-full min-h-0 overflow-x-hidden overflow-y-auto">
                    <div className="p-4">
                      {currentGroup?.audioUrl ? (
                        <div className="mb-4">
                          <DictationAudioPlayer ref={audioCtlRef} src={currentGroup.audioUrl} />
                          <div className="mt-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-600 mr-2">Shortcuts</span>
                            <span className="mr-2">
                              <span className="font-semibold">Tab</span> hint
                            </span>
                            <span className="mr-2">
                              <span className="font-semibold">Ctrl</span> play/pause
                            </span>
                            <span>
                              <span className="font-semibold">Shift</span> rewind 3s
                            </span>
                          </div>
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

                      {/* Part 3/4: dictation panel (passageText) on the left */}
                      {isPart34 ? (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-indigo-700">
                                {mode === "FILL" ? "Listen & Fill words:" : "Listen & Flip words:"}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!canHint}
                                onClick={() => {
                                  if (!canHint) return;
                                  runHint();
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                  canHint
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200/60"
                                    : "bg-indigo-100 text-indigo-400 border-indigo-100 cursor-not-allowed opacity-60"
                                }`}
                              >
                                Hint{" "}
                                <span className="ml-1 px-2 py-0.5 rounded-lg bg-indigo-200/60">
                                  Tab
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={!canRevealAll}
                                onClick={() => {
                                  if (!canRevealAll) return;
                                  setRevealAllByGroupId((prev) => ({ ...prev, [currentGroupId]: true }));
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                  canRevealAll
                                    ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/60"
                                    : "bg-amber-50 text-amber-300 border-amber-100 cursor-not-allowed opacity-60"
                                }`}
                              >
                                Reveal all
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-white/60 border border-blue-200 px-3 py-3">
                            {currentGroup?.passageText ? (
                              <div className="text-slate-900 text-sm leading-7">
                                {renderClozeLine(
                                  currentGroupId,
                                  currentGroup.passageText,
                                  `${currentGroupId}-passage`,
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-600">
                                No passage is available for dictation.
                              </div>
                            )}
                          </div>

                          {/* shortcuts moved under audio player */}
                        </div>
                      ) : null}

                      {/* Other parts: keep legacy transcript/passage display (not used for Part 1/2/3/4) */}
                      {!isPart12 && !isPart34 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          {dictationText ? (
                            <div className="text-slate-900">
                              {renderClozeLine(currentGroupId, dictationText, `${currentGroupId}-dictation`)}
                            </div>
                          ) : (
                            <div className="text-slate-600">No transcript or passage is available for dictation.</div>
                          )}
                        </div>
                      )}

                      {/* Transcript (after "Mở tất cả" OR when all blanks are correct) */}
                      {canShowTranscript ? (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setShowTranscriptByGroupId((prev) => ({
                                ...prev,
                                [currentGroupId]: !prev[currentGroupId],
                              }))
                            }
                            className="w-full px-4 py-2.5 border-b border-gray-100 flex items-center justify-between text-left"
                          >
                            <div className="text-xs font-semibold text-slate-700">
                              Transcript
                            </div>
                            <div className="text-xs font-semibold text-slate-600">
                              {showTranscriptByGroupId[currentGroupId] ? "Hide" : "Show"}
                            </div>
                          </button>
                          {showTranscriptByGroupId[currentGroupId] ? (
                            <div className="px-4 py-3 text-sm text-slate-800 leading-7 whitespace-pre-wrap">
                              {parse(String(currentGroup.transcript || ""))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* RIGHT: Part 3/4 question list OR Part 1/2 answering panel */}
                  {isPart34 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm h-full min-h-0 overflow-x-hidden overflow-y-auto">
                      <div className="p-4 space-y-4">
                        {(Array.isArray(currentGroup?.questions) ? currentGroup.questions : []).map((q, qi) => {
                          const qOptions = (Array.isArray(q?.options) ? q.options : []).filter(
                            (x) => typeof x === "string" && x.trim(),
                          );
                          const qId = q?.id ?? `${currentGroupId}-q-${qi}`;
                          const selectedLetter = selectedByQuestionId[qId] || null;
                          const correctLetter =
                            typeof q?.correctOption === "string"
                              ? q.correctOption.trim().toUpperCase()
                              : null;
                          const isLocked = !!selectedLetter;
                          const isCorrectPick =
                            isLocked && correctLetter && selectedLetter === correctLetter;
                          const canExplain =
                            isLocked && typeof q?.explanation === "string" && q.explanation.trim();
                          const isExplainOpen = !!expandedExplainByQuestionId[qId];

                          const pickTone = isLocked
                            ? isCorrectPick
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-rose-200 bg-rose-50/40"
                            : "border-gray-200 bg-white";
                          return (
                            <div
                              key={q?.id ?? qi}
                              className={`rounded-2xl border p-4 ${pickTone}`}
                            >
                              <div className="text-sm font-semibold text-slate-900">
                                {q?.position ? `Question ${q.position}` : `Question ${qi + 1}`}
                              </div>
                              <div className="text-sm text-slate-700 mt-2">
                                {q?.content || "—"}
                              </div>

                              {qOptions.length ? (
                                <div className="mt-3 space-y-2">
                                  {qOptions.map((opt, oi) => {
                                    const letter = optionLetter(oi);
                                    const isPicked = selectedLetter === letter;
                                    const isCorrect = correctLetter && letter === correctLetter;
                                    const showCorrect =
                                      isLocked && !isCorrectPick && isCorrect;

                                    const tone = (() => {
                                      if (!isLocked) {
                                        return "border-gray-200 bg-white hover:bg-gray-50/60";
                                      }
                                      if (isPicked && isCorrect) {
                                        return "border-emerald-200 bg-emerald-50/60";
                                      }
                                      if (isPicked && !isCorrect) {
                                        return "border-rose-200 bg-rose-50/60";
                                      }
                                      if (showCorrect) {
                                        return "border-emerald-200/70 bg-emerald-50/30";
                                      }
                                      return "border-gray-200 bg-white opacity-70";
                                    })();

                                    return (
                                      <button
                                        key={oi}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => handleSelectQuestionOption(qId, letter)}
                                        className={`w-full text-left rounded-xl border px-3 py-2 text-sm text-slate-700 transition ${tone} ${
                                          isLocked ? "cursor-not-allowed" : ""
                                        }`}
                                      >
                                        <span className="font-semibold mr-2">
                                          {letter}
                                        </span>
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}

                              {isLocked && correctLetter ? (
                                <div className="mt-3 text-xs text-slate-600">
                                  Correct answer:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {correctLetter}
                                  </span>
                                </div>
                              ) : null}

                              {canExplain ? (
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedExplainByQuestionId((prev) => ({
                                        ...prev,
                                        [qId]: !prev[qId],
                                      }))
                                    }
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-slate-700 hover:border-gray-300"
                                  >
                                    {isExplainOpen ? "Hide explanation" : "View explanation"}
                                  </button>
                                  {isExplainOpen ? (
                                    <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap leading-5">
                                      {q.explanation}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 h-full min-h-0 overflow-x-hidden overflow-y-auto">
                      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        {/* Blue dictation panel (match design) */}
                        <div className="p-4">
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-indigo-700">
                              {mode === "FILL" ? "Listen & Fill words:" : "Listen & Flip words:"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canHint}
                              onClick={() => {
                                if (!canHint) return;
                                runHint();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                canHint
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200/60"
                                  : "bg-indigo-100 text-indigo-400 border-indigo-100 cursor-not-allowed opacity-60"
                              }`}
                            >
                              Hint <span className="ml-1 px-2 py-0.5 rounded-lg bg-indigo-200/60">Tab</span>
                            </button>
                            <button
                              type="button"
                              disabled={!canRevealAll}
                              onClick={() => {
                                if (!canRevealAll) return;
                                setRevealAllByGroupId((prev) => ({ ...prev, [currentGroupId]: true }));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                canRevealAll
                                  ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/60"
                                  : "bg-amber-50 text-amber-300 border-amber-100 cursor-not-allowed opacity-60"
                              }`}
                            >
                              Reveal all
                            </button>
                          </div>
                        </div>

                        {/* Question (Part 2) */}
                        {isPart2 && currentGroup?.questionText ? (
                          <div className="mt-3 rounded-2xl bg-white/60 border border-blue-200 px-3 py-2">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold border border-gray-200 text-slate-600 bg-white">
                                Q
                              </div>
                              <div className="text-slate-900 text-sm leading-7">
                                {renderClozeLine(
                                  currentGroupId,
                                  currentGroup.questionText,
                                  `${currentGroupId}-q`,
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Options list inside ONE panel */}
                        <div className="mt-3 space-y-2">
                          {!options.length ? (
                            <div className="text-slate-600">This part does not have answer choices.</div>
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
                                <div
                                  key={letter}
                                  className={`w-full text-left transition rounded-2xl px-3 py-1.5 border border-transparent ${
                                    rowTone || (locked ? "opacity-70" : "hover:bg-white/70")
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={locked}
                                      onClick={() => {
                                        if (locked) return;
                                        handleSelectOption(currentGroup)(oi);
                                      }}
                                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${badgeTone} ${
                                        locked ? "cursor-not-allowed" : "hover:border-gray-300"
                                      }`}
                                      aria-label={`Select answer ${letter}`}
                                    >
                                      {letter}
                                    </button>
                                    <div className="text-slate-900 text-sm leading-7">
                                      {isPart1 || isPart2
                                        ? renderClozeLine(currentGroupId, opt, `${currentGroupId}-opt-${letter}`)
                                        : opt}
                                    </div>
                                  </div>

                                  {/* Color feedback is enough (no text). */}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* shortcuts moved under audio player */}
                      </div>
                    </div>
                  </div>

                      {selectedByGroupId[currentGroupId] &&
                      Array.isArray(currentGroup?.questions) &&
                      currentGroup.questions[0]?.explanation ? (
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                          <div className="text-sm font-semibold text-slate-900 mb-2">
                            Answer explanation
                          </div>
                          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-6">
                            {currentGroup.questions[0].explanation}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
}

