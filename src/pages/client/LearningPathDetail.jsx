import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Progress, Spin, Typography, message } from "antd";
import { CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import { getLearningPathDetail } from "@/api/api";
import {
  MIN_PROGRESS_TO_UNLOCK_NEXT,
  canOpenLessonToday,
  findNextEnterableNewLessonId,
  lessonWasEverOpened,
  previousLessonMeetsAdvanceGate,
} from "@/utils/learningPathDailyLimit";

const { Text } = Typography;

function normalizeLessonProgress(raw) {
  if (!raw || typeof raw !== "object") return null;
  const nested = raw.lesson;
  const wrapperCreatedAt =
    raw.createdAt != null && String(raw.createdAt).trim() !== ""
      ? raw.createdAt
      : null;

  let lesson =
    nested && typeof nested === "object"
      ? { ...nested }
      : {
          id: raw.id,
          title: raw.title,
          content: raw.content,
          videoUrl: raw.videoUrl,
          topic: raw.topic,
          level: raw.level,
          orderIndex: raw.orderIndex,
        };

  if (
    wrapperCreatedAt &&
    (lesson.createdAt == null ||
      (typeof lesson.createdAt === "string" &&
        !String(lesson.createdAt).trim()))
  ) {
    lesson = { ...lesson, createdAt: wrapperCreatedAt };
  }

  return {
    lesson,
    createdAt: wrapperCreatedAt,
    progressPercentage:
      typeof raw.progressPercentage === "number"
        ? raw.progressPercentage
        : nested
          ? raw.progressPercentage
          : 0,
    lastWatchedTimeMs: raw.lastWatchedTimeMs ?? null,
    isCompleted: Boolean(raw.isCompleted),
    progressUpdatedAt: raw.progressUpdatedAt ?? null,
  };
}

function formatMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return null;
  const s = Math.floor(Number(ms) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m <= 0) return `${sec}s`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function hasProgressUpdatedAt(item) {
  const v = item?.progressUpdatedAt;
  if (v == null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

function RoadmapStepDot({ step, bright, completed }) {
  return (
    <div
      className={[
        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-white text-sm font-bold shadow-lg sm:h-11 sm:w-11",
        bright
          ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white ring-2 ring-sky-400/40"
          : completed
            ? "bg-emerald-500 text-white"
            : "bg-slate-200 text-slate-600 ring-1 ring-slate-300/80",
      ].join(" ")}
      aria-hidden
    >
      {completed ? (
        <CheckCircleFilled className="text-[22px] text-white sm:text-xl" />
      ) : (
        step
      )}
    </div>
  );
}

function BranchCard({
  item,
  bright,
  revisitOpen,
  lockedByPreviousHint,
  onBrightClick,
}) {
  const { lesson, progressPercentage, isCompleted, lastWatchedTimeMs } = item;
  const title = lesson?.title || `Lesson #${lesson?.id ?? ""}`;
  const pct = Math.min(100, Math.max(0, Number(progressPercentage) || 0));
  const hasVideo = Boolean(lesson?.videoUrl);

  const brightSurface =
    "border-2 border-sky-400/90 bg-gradient-to-br from-sky-50 via-white to-sky-50/95 shadow-[0_4px_24px_rgba(14,165,233,0.12),0_12px_40px_rgba(37,99,235,0.08)] ring-2 ring-sky-300/40 ring-offset-2 ring-offset-slate-50/80 transition hover:border-sky-500 hover:shadow-[0_8px_32px_rgba(14,165,233,0.18)] hover:ring-sky-400/50";

  const mutedSurface =
    "border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white text-slate-600 shadow-sm shadow-slate-200/40";

  const revisitSurface = [
    mutedSurface,
    "cursor-pointer text-left outline-none ring-offset-slate-50 transition hover:border-slate-300 hover:shadow-md",
  ].join(" ");

  const titleClass = bright
    ? "text-[17px] leading-snug text-slate-900"
    : "text-[17px] leading-snug text-slate-600";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2.5">
            {isCompleted ? (
              <CheckCircleFilled
                className={
                  bright
                    ? "mt-0.5 shrink-0 text-emerald-600"
                    : "mt-0.5 shrink-0 text-emerald-500/80"
                }
                aria-hidden
              />
            ) : null}
            <Text strong className={titleClass}>
              {title}
            </Text>
          </div>

          <div
            className={`my-3 border-t ${bright ? "border-slate-200/90" : "border-slate-200"}`}
          />

          <div
            className={`rounded-xl px-3 py-2.5 ${bright ? "bg-sky-50/80" : "bg-slate-100/60"}`}
          >
            <div
              className={`flex items-center justify-between gap-2 text-xs ${bright ? "text-slate-600" : "text-slate-500"}`}
            >
              <span className="font-medium tracking-wide">Tiến độ</span>
              <span
                className={`font-semibold tabular-nums ${bright ? "text-slate-800" : "text-slate-600"}`}
              >
                {Math.round(pct)}%
              </span>
            </div>
            <div className="mt-1.5">
              <Progress
                percent={pct}
                size="small"
                showInfo={false}
                strokeColor={
                  bright
                    ? isCompleted
                      ? { from: "#34d399", to: "#059669" }
                      : { from: "#38bdf8", to: "#2563eb" }
                    : { from: "#94a3b8", to: "#cbd5e1" }
                }
                trailColor={
                  bright ? "rgba(15,23,42,0.06)" : "rgba(148,163,184,0.3)"
                }
              />
            </div>
            {lastWatchedTimeMs != null ? (
              <div
                className={`mt-2 flex items-center gap-1 text-xs ${bright ? "text-slate-500" : "text-slate-400"}`}
              >
                <ClockCircleOutlined />
                <span>Xem gần nhất: {formatMs(lastWatchedTimeMs)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );

  if (bright) {
    return (
      <button
        type="button"
        className={[
          "relative w-full rounded-2xl p-5 text-left outline-none sm:p-5",
          brightSurface,
        ].join(" ")}
        onClick={() => lesson?.id != null && onBrightClick?.(lesson.id)}
      >
        {body}
      </button>
    );
  }

  if (revisitOpen) {
    return (
      <button
        type="button"
        className={[
          "relative w-full rounded-2xl p-5 text-left outline-none sm:p-5",
          revisitSurface,
        ].join(" ")}
        onClick={() => lesson?.id != null && onBrightClick?.(lesson.id)}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={[
        "relative rounded-2xl p-5 transition sm:p-5",
        mutedSurface,
      ].join(" ")}
    >
      {body}
    </div>
  );
}

export default function LearningPathDetailPage() {
  const { learningPathSlug, id } = useParams();
  const navigate = useNavigate();
  const learningPathId = useMemo(
    () => learningPathSlug ?? id,
    [learningPathSlug, id],
  );

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!learningPathId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLearningPathDetail(learningPathId);
      setDetail(res?.data ?? null);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không tải được lộ trình";
      setError(msg);
      message.error(msg);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [learningPathId]);

  useEffect(() => {
    load();
  }, [load]);

  const pathName = detail?.name || `Learning Path #${learningPathId}`;

  const lessonItems = useMemo(() => {
    const raw = Array.isArray(detail?.lessons) ? detail.lessons : [];
    const parsed = raw.map(normalizeLessonProgress).filter(Boolean);
    parsed.sort((a, b) => {
      const oa = a.lesson?.orderIndex ?? 0;
      const ob = b.lesson?.orderIndex ?? 0;
      return oa - ob;
    });
    return parsed;
  }, [detail?.lessons]);

  const nextEnterableNewLessonId = useMemo(
    () => findNextEnterableNewLessonId(lessonItems),
    [lessonItems],
  );

  const isLessonBright = useCallback(
    (item) => {
      if (hasProgressUpdatedAt(item)) return true;
      const lid = item?.lesson?.id;
      if (
        lid != null &&
        nextEnterableNewLessonId != null &&
        lid === nextEnterableNewLessonId
      ) {
        return true;
      }
      return false;
    },
    [nextEnterableNewLessonId],
  );

  const handleBrightLessonClick = useCallback(
    (clickedLessonId) => {
      const check = canOpenLessonToday(
        String(learningPathId),
        clickedLessonId,
        lessonItems,
      );
      if (!check.ok) return;
      const row = lessonItems.find((x) => x?.lesson?.id === clickedLessonId);
      const lessonSlug = row?.lesson?.slug;
      navigate(
        `/learning-paths/${learningPathId}/lessons/${lessonSlug ?? clickedLessonId}`,
      );
    },
    [learningPathId, lessonItems, navigate],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/learning-paths"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Learning Paths
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center py-16">
            <Spin size="large" tip="Đang tải lộ trình…" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            {error}
          </div>
        ) : (
          <>
            <header className="mx-auto mt-8 max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Lộ trình học
              </p>
              <div className="mt-3 rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-100 via-rose-50 to-white px-6 py-6 shadow-[0_20px_50px_-12px_rgba(219,39,119,0.18)] sm:px-10 sm:py-8">
                <h1 className="bg-gradient-to-r from-pink-900 via-rose-800 to-pink-900 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl">
                  {pathName}
                </h1>
              </div>
            </header>

            {/* Roadmap: đường thẳng nối các mốc + thẻ bài */}
            <div className="mx-auto mt-12 max-w-3xl pb-16">
              {lessonItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/90 p-12 text-center text-slate-500 shadow-inner">
                  Lộ trình này chưa có bài học.
                </div>
              ) : (
                <div className="relative rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-xl shadow-slate-200/50 sm:p-8">
                  {/* Đường dọc nối tâm các chấm — căn theo cột timeline */}
                  <div
                    className="pointer-events-none absolute left-[22px] top-9 bottom-9 z-0 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-400 via-blue-500 to-slate-300 sm:left-7 sm:top-11 sm:bottom-11"
                    aria-hidden
                  />

                  <ul className="relative m-0 list-none p-0">
                    {lessonItems.map((item, index) => {
                      const lessonId = item.lesson?.id;
                      const roadmapBright = isLessonBright(item);
                      const everOpened = lessonWasEverOpened(item);
                      const prev = index > 0 ? lessonItems[index - 1] : null;
                      const lockedHint =
                        !everOpened &&
                        !roadmapBright &&
                        index > 0 &&
                        prev &&
                        !previousLessonMeetsAdvanceGate(prev)
                          ? `Đạt ít nhất ${MIN_PROGRESS_TO_UNLOCK_NEXT}% tiến độ bài trước để mở bài này.`
                          : "";
                      const gateOk =
                        lessonId != null &&
                        canOpenLessonToday(
                          String(learningPathId),
                          lessonId,
                          lessonItems,
                        ).ok;
                      const visuallyBright =
                        roadmapBright && (everOpened || gateOk);
                      const step = index + 1;

                      return (
                        <li
                          key={lessonId ?? index}
                          className="relative flex gap-4 pb-12 last:pb-0 sm:gap-6"
                        >
                          <div className="relative z-10 flex w-11 shrink-0 justify-center sm:w-14">
                            <RoadmapStepDot
                              step={step}
                              bright={visuallyBright}
                              completed={Boolean(item.isCompleted)}
                            />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <span className="mb-2 inline-block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Bước {step} / {lessonItems.length}
                            </span>
                            <BranchCard
                              item={item}
                              bright={visuallyBright}
                              revisitOpen={everOpened && !visuallyBright}
                              lockedByPreviousHint={lockedHint}
                              onBrightClick={handleBrightLessonClick}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
