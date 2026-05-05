import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Spin, Tag, Typography, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import parse from "html-react-parser";
import {
  getLearnerLesson,
  getLearningPathDetail,
  upsertUserLessonProgress,
} from "@/api/api";
import {
  canAccessSequentialLesson,
  canOpenLessonToday,
  coerceLessonProgressList,
  describeSequentialLessonBlock,
  lessonWasEverOpened,
  markTodayPlayedLessonIfFirst,
} from "@/utils/learningPathDailyLimit";
import { loadYouTubeIframeAPI } from "@/utils/youtubeIframeApi";

const YT_STATE_PLAYING = 1;

const { Title, Text } = Typography;

function computePlaybackProgress(currentTimeSec, durationSec) {
  const cur = Math.max(0, Number(currentTimeSec) || 0);
  const dur = Number(durationSec);
  const lastWatchedTimeMs = Math.round(cur * 1000);
  if (!dur || !Number.isFinite(dur) || dur <= 0) {
    return { lastWatchedTimeMs, progressPercentage: 0 };
  }
  const ratio = Math.min(1, cur / dur);
  const progressPercentage = Math.round(ratio * 10000) / 100;
  return { lastWatchedTimeMs, progressPercentage };
}

function findPathLessonRow(pathLessons, targetLessonId) {
  const tgt = Number(targetLessonId);
  if (!Number.isFinite(tgt) || !Array.isArray(pathLessons)) return null;
  return (
    pathLessons.find((r) => {
      const nested = r?.lesson != null && typeof r.lesson === "object";
      const id = nested ? r.lesson?.id : r?.id;
      return id != null && Number(id) === tgt;
    }) ?? null
  );
}

function lessonResumeSecondsFromPayload(lessonLike) {
  if (!lessonLike || typeof lessonLike !== "object") return null;
  const msRaw =
    lessonLike.lastWatchedTimeMs ??
    lessonLike.lessonProgress?.lastWatchedTimeMs ??
    lessonLike.progress?.lastWatchedTimeMs ??
    lessonLike.userLessonProgress?.lastWatchedTimeMs;
  if (msRaw == null || msRaw === "") return null;
  const ms = Number(msRaw);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const sec = ms / 1000;
  return sec >= 0.25 ? sec : null;
}

function clampResumeToDuration(resumeSec, durationSec, endMarginSec = 0.75) {
  if (resumeSec == null || !Number.isFinite(resumeSec)) return null;
  const dur = Number(durationSec);
  if (Number.isFinite(dur) && dur > endMarginSec) {
    const cap = Math.max(0, dur - endMarginSec);
    const t = Math.min(resumeSec, cap);
    return t >= 0.25 ? t : null;
  }
  return resumeSec >= 0.25 ? resumeSec : null;
}

export default function LearningPathLessonPage() {
  const { id: learningPathId, lessonId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytPlayerDestroyRef = useRef(null);
  const lessonWasOpenedBeforePlaybackRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!lessonId || !learningPathId) return;
      setLoading(true);
      setError(null);
      setLesson(null);
      lessonWasOpenedBeforePlaybackRef.current = false;
      try {
        const pathRes = await getLearningPathDetail(learningPathId);
        if (cancelled) return;

        const items = coerceLessonProgressList(pathRes?.data?.lessons);
        const openedRow = items.find(
          (x) => Number(x?.lesson?.id) === Number(lessonId),
        );
        lessonWasOpenedBeforePlaybackRef.current =
          lessonWasEverOpened(openedRow) || Boolean(openedRow?.isCompleted);
        const seq = canAccessSequentialLesson(items, lessonId);
        if (!seq.ok) {
          message.warning(describeSequentialLessonBlock(seq));
          navigate(`/learning-paths/${learningPathId}`, { replace: true });
          return;
        }
        const gate = canOpenLessonToday(
          String(learningPathId),
          lessonId,
          items,
        );
        if (!gate.ok) {
          navigate(`/learning-paths/${learningPathId}`, { replace: true });
          return;
        }

        const res = await getLearnerLesson(lessonId);
        if (cancelled) return;
        const pathRow = findPathLessonRow(pathRes?.data?.lessons, lessonId);
        const base = res?.data ?? null;
        const merged =
          base && typeof base === "object"
            ? {
                ...base,
                lastWatchedTimeMs:
                  base.lastWatchedTimeMs ?? pathRow?.lastWatchedTimeMs ?? null,
                progressPercentage:
                  typeof base.progressPercentage === "number"
                    ? base.progressPercentage
                    : typeof pathRow?.progressPercentage === "number"
                      ? pathRow.progressPercentage
                      : base.progressPercentage,
                isCompleted:
                  typeof base.isCompleted === "boolean"
                    ? base.isCompleted
                    : Boolean(pathRow?.isCompleted ?? base.isCompleted),
              }
            : base;
        setLesson(merged);
      } catch (e) {
        if (!cancelled) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Không tải được bài học";
          setError(msg);
          message.error(msg);
          setLesson(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [lessonId, learningPathId, navigate]);

  const title = lesson?.title || "Bài học";
  const isInactive = lesson?.isActive === false;

  const videoEmbedInfo = useMemo(() => {
    const url = lesson?.videoUrl;
    if (!url) return { embedUrl: null, directUrl: null, youtubeId: null };
    try {
      const u = new URL(url);
      const h = u.hostname.replace(/^www\./, "");
      if (h === "youtu.be") {
        const id =
          u.pathname.replace("/", "").split("/").filter(Boolean)[0] || "";
        return {
          embedUrl: id ? `https://www.youtube.com/embed/${id}` : null,
          directUrl: null,
          youtubeId: id || null,
        };
      }
      if (h.includes("youtube.com") && u.pathname.startsWith("/watch")) {
        const id = u.searchParams.get("v");
        return {
          embedUrl: id ? `https://www.youtube.com/embed/${id}` : null,
          directUrl: null,
          youtubeId: id,
        };
      }
      if (h.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
        const m = u.pathname.match(/\/embed\/([^/?]+)/);
        const id = m?.[1] ?? null;
        return { embedUrl: url, directUrl: null, youtubeId: id };
      }
    } catch {
      return { embedUrl: null, directUrl: url, youtubeId: null };
    }
    return { embedUrl: null, directUrl: url, youtubeId: null };
  }, [lesson?.videoUrl]);

  const resumeSecondsHint = useMemo(
    () => lessonResumeSecondsFromPayload(lesson),
    [lesson],
  );

  useEffect(() => {
    const youtubeId = videoEmbedInfo.youtubeId;
    if (!youtubeId || !lesson) return;

    let cancelled = false;

    const init = async () => {
      await loadYouTubeIframeAPI();
      if (cancelled) return;
      const host = youtubeContainerRef.current;
      if (!host || !window.YT?.Player) return;

      const pathId = String(learningPathId);
      const lid = lessonId;
      const resumeHint = lessonResumeSecondsFromPayload(lesson);

      try {
        const player = new window.YT.Player(host, {
          videoId: youtubeId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              const p = e.target;
              ytPlayerRef.current = p;
              if (resumeHint != null) {
                try {
                  const d =
                    typeof p.getDuration === "function" ? p.getDuration() : NaN;
                  const t = clampResumeToDuration(resumeHint, d);
                  if (t != null && typeof p.seekTo === "function") {
                    p.seekTo(t, true);
                  }
                } catch (_) {
                  /* noop */
                }
              }
            },
            onStateChange: (e) => {
              if (!cancelled && e.data === YT_STATE_PLAYING && pathId && lid) {
                markTodayPlayedLessonIfFirst(
                  pathId,
                  lid,
                  lessonWasOpenedBeforePlaybackRef.current,
                );
              }
            },
          },
        });
        ytPlayerDestroyRef.current = player;
      } catch (err) {
        console.warn("YouTube player init failed:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      ytPlayerRef.current = null;
      try {
        ytPlayerDestroyRef.current?.destroy?.();
      } catch (_) {
        /* noop */
      }
      ytPlayerDestroyRef.current = null;
    };
  }, [videoEmbedInfo.youtubeId, lesson, lessonId, learningPathId]);

  const getPlaybackPayload = useCallback(() => {
    const html5 = videoRef.current;
    if (html5) {
      const cur = html5.currentTime ?? 0;
      const dur = html5.duration;
      return computePlaybackProgress(cur, dur);
    }
    const yt = ytPlayerRef.current;
    if (yt?.getCurrentTime && yt?.getDuration) {
      try {
        const cur = yt.getCurrentTime();
        const dur = yt.getDuration();
        return computePlaybackProgress(cur, dur);
      } catch (_) {
        return { lastWatchedTimeMs: 0, progressPercentage: 0 };
      }
    }
    return { lastWatchedTimeMs: 0, progressPercentage: 0 };
  }, []);

  const handleCompleteLesson = useCallback(async () => {
    if (!lessonId) return;
    const { lastWatchedTimeMs, progressPercentage } = getPlaybackPayload();
    try {
      setCompleteSubmitting(true);
      await upsertUserLessonProgress({
        lessonId: Number(lessonId),
        progressPercentage,
        lastWatchedTimeMs,
      });
      message.success("Đã lưu tiến độ bài học");
      navigate(`/learning-paths/${learningPathId}`);
    } catch (e) {
      message.error(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể cập nhật tiến độ",
      );
    } finally {
      setCompleteSubmitting(false);
    }
  }, [getPlaybackPayload, lessonId, learningPathId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/learning-paths/${learningPathId}`}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Lộ trình
          </Link>
          {lesson?.topic ? (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              {lesson.topic}
            </Tag>
          ) : null}
          {lesson?.level ? (
            <Tag style={{ marginInlineEnd: 0 }}>{String(lesson.level)}</Tag>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center py-16">
            <Spin size="large" tip="Đang tải bài học…" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            {error}
          </div>
        ) : (
          <>
            <Title level={3} className="!mt-6 !mb-4">
              {title}
            </Title>
            {isInactive ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Bài học hiện không khả dụng.
              </div>
            ) : null}

            {lesson?.videoUrl ? (
              videoEmbedInfo.youtubeId ? (
                <div className="mb-6 space-y-2">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                    <div ref={youtubeContainerRef} className="h-full w-full" />
                  </div>
                  {resumeSecondsHint != null ? (
                    <Text type="secondary" className="!mb-0 block text-xs">
                      Phát tiếp từ vị trí đã lưu lần trước.
                    </Text>
                  ) : null}
                </div>
              ) : (
                <div className="mb-6 space-y-2">
                  <video
                    ref={videoRef}
                    className="w-full max-h-[70vh] rounded-xl bg-black"
                    controls
                    playsInline
                    src={videoEmbedInfo.directUrl || lesson.videoUrl}
                    onLoadedMetadata={(e) => {
                      const hint = lessonResumeSecondsFromPayload(lesson);
                      if (hint == null) return;
                      const v = e.currentTarget;
                      const t = clampResumeToDuration(hint, v.duration);
                      if (
                        t != null &&
                        Number.isFinite(v.duration) &&
                        v.duration > 0
                      ) {
                        try {
                          v.currentTime = t;
                        } catch (_) {
                          /* noop */
                        }
                      }
                    }}
                    onPlaying={() =>
                      markTodayPlayedLessonIfFirst(
                        String(learningPathId),
                        lessonId,
                        lessonWasOpenedBeforePlaybackRef.current,
                      )
                    }
                  >
                    Trình duyệt không hỗ trợ video.
                  </video>
                  {resumeSecondsHint != null ? (
                    <Text type="secondary" className="!mb-0 block text-xs">
                      Phát tiếp từ vị trí đã lưu lần trước.
                    </Text>
                  ) : null}
                </div>
              )
            ) : (
              <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-600">
                Chưa có video cho bài này.
              </div>
            )}

            {lesson?.content ? (
              <Card
                variant="outlined"
                className="rounded-xl border-slate-200 shadow-sm"
              >
                <div className="prose prose-slate max-w-none prose-p:my-2 prose-headings:font-semibold">
                  {parse(String(lesson.content))}
                </div>
              </Card>
            ) : (
              <Text type="secondary">Chưa có nội dung.</Text>
            )}

            <div className="mt-10 flex flex-col items-stretch gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Text type="secondary" className="!mb-0 text-sm">
                Nhấn để lưu tiến độ theo thời điểm đang xem trên video (không
                cần xem hết).
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                loading={completeSubmitting}
                disabled={isInactive}
                onClick={handleCompleteLesson}
                className="min-w-[200px] shrink-0 bg-emerald-600 hover:!bg-emerald-700"
              >
                Lưu tiến độ
              </Button>
            </div>

            {lesson?.updatedAt ? (
              <div className="mt-6 text-xs text-slate-400">
                Cập nhật: {lesson.updatedAt}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
