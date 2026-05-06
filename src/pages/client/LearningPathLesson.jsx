import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Progress,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  SoundOutlined,
  BookOutlined,
} from "@ant-design/icons";
import parse from "html-react-parser";
import {
  getLearnerLesson,
  getLearningPathDetail,
  getMiniTestPracticeBySlug,
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

function normalizeLessonHtml(html) {
  const raw = String(html ?? "");
  // Some contents are stored with escaped quotes like: src=\"https://...png\"
  // Browsers treat that backslash as part of the attribute value, breaking images.
  const fixedDanglingSlash = raw
    // Handle urls that end with image ext and have a stray "\" before an escaped quote: ...png\"
    .replace(
      /(\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\\"]*)?)\\+(?=\\")/gi,
      "$1",
    )
    // Then unescape quotes so html-react-parser can parse proper attributes
    .replace(/\\"/g, '"')
    // Safety: if a stray "\" still remains before a real quote after unescape: ...png\"
    .replace(
      /(\.(?:png|jpe?g|gif|webp|svg)(?:\?[^"']*)?)\\+(?=["'])/gi,
      "$1",
    );
  return fixedDanglingSlash;
}

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

function findPathLessonRow(pathLessons, targetLessonIdOrSlug) {
  if (!Array.isArray(pathLessons)) return null;
  const asNumber = Number(targetLessonIdOrSlug);
  const tryId = Number.isFinite(asNumber);
  const tgtSlug =
    !tryId && typeof targetLessonIdOrSlug === "string"
      ? targetLessonIdOrSlug.trim()
      : "";

  return (
    pathLessons.find((r) => {
      const nested = r?.lesson != null && typeof r.lesson === "object";
      const lessonLike = nested ? r.lesson : r;
      const id = lessonLike?.id;
      const slug = lessonLike?.slug;
      if (tryId) return id != null && Number(id) === asNumber;
      return tgtSlug && typeof slug === "string" && slug.trim() === tgtSlug;
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

function safeTrim(s) {
  return typeof s === "string" ? s.trim() : "";
}

function injectHeadingIds(html) {
  if (!html || typeof window === "undefined") return { html: String(html || ""), headings: [] };
  try {
    const doc = new DOMParser().parseFromString(
      normalizeLessonHtml(html),
      "text/html",
    );
    const headings = [...doc.querySelectorAll("h1, h2, h3")];
    const out = [];
    headings.forEach((el, idx) => {
      const tag = String(el.tagName || "").toUpperCase();
      const level = tag === "H1" ? 1 : tag === "H2" ? 2 : 3;
      const raw = safeTrim(el.textContent || "");
      if (!raw) return;
      const slugBase = raw
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .slice(0, 64);
      const id = slugBase ? `lp-h-${slugBase}-${idx}` : `lp-h-${idx}`;
      el.setAttribute("id", id);
      out.push({ id, level, text: raw });
    });
    return { html: doc.body?.innerHTML || String(html || ""), headings: out };
  } catch {
    return { html: String(html || ""), headings: [] };
  }
}

function extractVocabulary(html) {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(
      normalizeLessonHtml(html),
      "text/html",
    );
    const out = [];

    // 1) Table-based vocabulary (best effort)
    const tables = [...doc.querySelectorAll("table")];
    const vocabTable = tables.find((t) => {
      const head = safeTrim(t.textContent || "").toLowerCase();
      return (
        head.includes("vocabulary") ||
        head.includes("từ vựng") ||
        head.includes("word") ||
        head.includes("meaning")
      );
    });
    if (vocabTable) {
      const rows = [...vocabTable.querySelectorAll("tr")];
      rows.forEach((tr, idx) => {
        const cells = [...tr.querySelectorAll("th, td")].map((c) =>
          safeTrim(c.textContent || ""),
        );
        if (cells.length < 1) return;
        const line = cells.join(" ").toLowerCase();
        if (idx === 0 && (line.includes("word") || line.includes("từ") || line.includes("meaning")))
          return; // header row
        const word = cells[0] || "";
        if (!word) return;
        const meaning = cells[1] || "";
        const example = cells[2] || "";
        out.push({ word, meaning, example });
      });
    }

    // 2) Bullet/list format: "an audience - khán giả" / "an audience: ..."
    if (out.length === 0) {
      const lis = [...doc.querySelectorAll("li")];
      lis.forEach((li) => {
        const t = safeTrim(li.textContent || "");
        if (!t) return;
        const m = t.match(/^(.{1,60}?)(?:\s*[-–—:]\s+)(.+)$/);
        if (!m) return;
        const word = safeTrim(m[1]);
        const meaning = safeTrim(m[2]);
        if (!word || !meaning) return;
        // Heuristic: ignore very long "word" chunk
        if (word.split(/\s+/).length > 5) return;
        out.push({ word, meaning, example: "" });
      });
    }

    // Dedupe by word
    const seen = new Set();
    return out.filter((v) => {
      const k = v.word.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch {
    return [];
  }
}

function speakWord(word) {
  const w = safeTrim(word);
  if (!w) return false;
  if (typeof window === "undefined") return false;
  const synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== "function") return false;
  try {
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(w);
    u.lang = "en-US";
    u.rate = 0.95;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

function scrollToHeading(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LearningPathLessonPage() {
  const { learningPathSlug, id: legacyId, lessonSlug, lessonId: legacyLessonId } =
    useParams();
  const learningPathId = learningPathSlug ?? legacyId;
  const lessonId = lessonSlug ?? legacyLessonId;
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
  const [pathLessons, setPathLessons] = useState([]);
  const [notice, setNotice] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!lessonId || !learningPathId) return;
      setLoading(true);
      setError(null);
      setLesson(null);
      setNotice("");
      setPathLessons([]);
      lessonWasOpenedBeforePlaybackRef.current = false;
      try {
        const pathRes = await getLearningPathDetail(learningPathId);
        if (cancelled) return;

        const items = coerceLessonProgressList(pathRes?.data?.lessons);
        setPathLessons(items);

        // Resolve numeric lessonId (required by gating utils) from slug/id param.
        const resolvedRow = findPathLessonRow(pathRes?.data?.lessons, lessonId);
        const resolvedLessonId = Number(resolvedRow?.lesson?.id);
        const resolvedLessonIdOk = Number.isFinite(resolvedLessonId);
        const gatingLessonId = resolvedLessonIdOk ? resolvedLessonId : Number(lessonId);

        const openedRow = items.find(
          (x) => Number(x?.lesson?.id) === Number(gatingLessonId),
        );
        lessonWasOpenedBeforePlaybackRef.current =
          lessonWasEverOpened(openedRow) || Boolean(openedRow?.isCompleted);
        const seq = canAccessSequentialLesson(items, gatingLessonId);
        if (!seq.ok) {
          message.warning(describeSequentialLessonBlock(seq));
          navigate(`/learning-paths/${learningPathId}`, { replace: true });
          return;
        }
        const gate = canOpenLessonToday(
          String(learningPathId),
          gatingLessonId,
          items,
        );
        if (!gate.ok) {
          navigate(`/learning-paths/${learningPathId}`, { replace: true });
          return;
        }

        // Lesson API expects lessonSlug; fallback to param if slug not present.
        const apiLessonSlug =
          (typeof resolvedRow?.lesson?.slug === "string" && resolvedRow.lesson.slug.trim()) ||
          (typeof lessonId === "string" ? lessonId : String(lessonId));

        const res = await getLearnerLesson(apiLessonSlug);
        if (cancelled) return;
        const pathRow = resolvedRow ?? findPathLessonRow(pathRes?.data?.lessons, lessonId);
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
        const initialNotice =
          (merged &&
            typeof merged === "object" &&
            (merged.notice ??
              merged.lessonProgress?.notice ??
              merged.progress?.notice ??
              merged.userLessonProgress?.notice)) ||
          "";
        setNotice(typeof initialNotice === "string" ? initialNotice : "");
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
  const lessonProgressPct = useMemo(() => {
    const n = Number(lesson?.progressPercentage);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }, [lesson?.progressPercentage]);

  const stepInfo = useMemo(() => {
    if (!Array.isArray(pathLessons) || pathLessons.length === 0) return null;
    const ids = pathLessons
      .map((x) => x?.lesson?.id)
      .filter((x) => x != null)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    const lid =
      Number.isFinite(Number(lesson?.id)) ? Number(lesson.id) : Number(lessonId);
    const idx = ids.findIndex((x) => x === lid);
    if (idx < 0) return null;
    return { index: idx + 1, total: ids.length };
  }, [pathLessons, lesson?.id, lessonId]);

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

  const contentWithIds = useMemo(() => {
    const raw = lesson?.content ? String(lesson.content) : "";
    return injectHeadingIds(normalizeLessonHtml(raw));
  }, [lesson?.content]);

  const tocItems = useMemo(() => {
    const hs = Array.isArray(contentWithIds?.headings) ? contentWithIds.headings : [];
    return hs
      .map((h) => ({
        id: h.id,
        level: Number(h.level) || 1,
        text: String(h.text || "").trim(),
      }))
      .filter((h) => h.id && h.text);
  }, [contentWithIds?.headings]);

  const vocabItems = useMemo(
    () =>
      extractVocabulary(
        lesson?.content ? normalizeLessonHtml(String(lesson.content)) : "",
      ),
    [lesson?.content],
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
                } catch {
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
      } catch {
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
      } catch {
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
        lessonId: Number(lesson?.id ?? lessonId),
        progressPercentage,
        lastWatchedTimeMs,
        notice: notice.trim() ? notice.trim() : "",
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
  }, [
    getPlaybackPayload,
    lessonId,
    learningPathId,
    lesson?.id,
    navigate,
    notice,
  ]);

  const practiceSlug = useMemo(() => {
    const raw =
      lesson?.practiceSlug ??
      lesson?.practice?.slug ??
      lesson?.practice ??
      "";
    return typeof raw === "string" ? raw.trim() : "";
  }, [lesson?.practiceSlug, lesson?.practice]);

  const handleOpenPractice = useCallback(async () => {
    if (!practiceSlug) return;
    try {
      setPracticeLoading(true);
      const res = await getMiniTestPracticeBySlug(practiceSlug);
      const testData = res?.data ?? null;
      if (!testData) {
        message.error("Không tải được dữ liệu luyện tập");
        return;
      }
      navigate("/do-mini-test", {
        state: {
          testData,
          selectedTags: [],
          partNumber: testData?.partNumber ?? testData?.part?.number ?? undefined,
          from: "learning-path-lesson",
          practiceSlug,
        },
      });
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Không tải được luyện tập",
      );
    } finally {
      setPracticeLoading(false);
    }
  }, [navigate, practiceSlug]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/learning-paths/${learningPathId}`}
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              ← Lộ trình
            </Link>

            {lesson?.topic ? (
              <Tag
                style={{ marginInlineEnd: 0 }}
                className="!m-0 !rounded-full !border-emerald-200 !bg-emerald-50 !px-3 !py-1 !text-xs !font-semibold !text-emerald-800"
              >
                Chủ đề: {lesson.topic}
              </Tag>
            ) : null}
            {lesson?.level ? (
              <Tag
                style={{ marginInlineEnd: 0 }}
                className="!m-0 !rounded-full !border-slate-200 !bg-slate-50 !px-3 !py-1 !text-xs !font-semibold !text-slate-700"
              >
                Trình độ: {String(lesson.level)}
              </Tag>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {stepInfo ? (
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                Bước {stepInfo.index}/{stepInfo.total}
              </div>
            ) : null}
          </div>
        </div>

        {/* Progress header */}
        {!loading && !error ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tiến trình bài học
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {Math.round(lessonProgressPct)}%
                  </span>
                  {lesson?.isCompleted ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Đã hoàn thành
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="w-full sm:max-w-[420px]">
                <Progress
                  percent={lessonProgressPct}
                  showInfo={false}
                  strokeColor={{ from: "#22c55e", to: "#16a34a" }}
                  trailColor="rgba(15,23,42,0.08)"
                />
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-12 flex justify-center py-16">
            <Spin size="large" tip="Đang tải bài học…" spinning>
              <div className="min-h-[120px] min-w-[240px]" />
            </Spin>
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

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left: video + main content */}
              <div className="lg:col-span-8">
                <Card
                  variant="outlined"
                  className="overflow-hidden rounded-2xl border-slate-200 shadow-sm"
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Video bài giảng
                        </div>
                        {resumeSecondsHint != null ? (
                          <Text type="secondary" className="!mb-0 block text-xs">
                            Phát tiếp từ vị trí đã lưu lần trước.
                          </Text>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <Button
                          type="primary"
                          size="middle"
                          icon={<CheckCircleOutlined />}
                          loading={completeSubmitting}
                          disabled={isInactive}
                          onClick={handleCompleteLesson}
                          className="!border-emerald-600 !bg-emerald-600 hover:!border-emerald-700 hover:!bg-emerald-700"
                        >
                          Lưu tiến độ
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black">
                    {lesson?.videoUrl ? (
                      videoEmbedInfo.youtubeId ? (
                        <div className="aspect-video w-full overflow-hidden">
                          <div ref={youtubeContainerRef} className="h-full w-full" />
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          className="aspect-video w-full max-h-[70vh] bg-black object-contain"
                          controls
                          playsInline
                          src={videoEmbedInfo.directUrl || lesson.videoUrl}
                          onLoadedMetadata={(e) => {
                            const hint = lessonResumeSecondsFromPayload(lesson);
                            if (hint == null) return;
                            const v = e.currentTarget;
                            const t = clampResumeToDuration(hint, v.duration);
                            if (t != null && Number.isFinite(v.duration) && v.duration > 0) {
                              try {
                                v.currentTime = t;
                              } catch {
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
                      )
                    ) : (
                      <div className="px-6 py-10 text-center text-sm text-slate-200">
                        Chưa có video cho bài này.
                      </div>
                    )}
                  </div>
                </Card>

                <div className="mt-6">
                  {lesson?.content ? (
                    <Card
                      variant="outlined"
                      className="rounded-2xl border-slate-200 shadow-sm"
                    >
                      <div className="prose prose-slate max-w-none prose-p:my-2 prose-headings:font-semibold">
                        {parse(normalizeLessonHtml(String(contentWithIds.html)))}
                      </div>
                    </Card>
                  ) : (
                    <Text type="secondary">Chưa có nội dung.</Text>
                  )}
                </div>
              </div>

              {/* Right: sticky sidebar */}
              <div className="lg:col-span-4">
                <div className="space-y-4 lg:sticky lg:top-20">
                  <Card
                    variant="outlined"
                    className="rounded-2xl border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <BookOutlined className="text-emerald-700" />
                        Từ vựng / Ghi chú
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {vocabItems.length ? `${vocabItems.length} mục` : "—"}
                      </div>
                    </div>

                    {vocabItems.length ? (
                      <div className="mt-4 max-h-[52vh] overflow-auto pr-1">
                        <div className="space-y-2">
                          {vocabItems.map((v) => (
                            <div
                              key={v.word}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {v.word}
                                  </div>
                                  {v.meaning ? (
                                    <div className="mt-0.5 text-xs text-slate-600">
                                      {v.meaning}
                                    </div>
                                  ) : null}
                                </div>
                                <Tooltip title="Phát âm (EN)">
                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                    onClick={() => {
                                      const ok = speakWord(v.word);
                                      if (!ok) message.info("Thiết bị không hỗ trợ phát âm.");
                                    }}
                                  >
                                    <SoundOutlined />
                                  </button>
                                </Tooltip>
                              </div>
                              {v.example ? (
                                <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                  {v.example}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        Chưa phát hiện danh sách từ vựng trong nội dung. Nếu bạn
                        dùng bảng hoặc gạch đầu dòng dạng “word - meaning”, hệ
                        thống sẽ tự hiển thị ở đây.
                      </div>
                    )}
                  </Card>

                  <Card
                    variant="outlined"
                    className="rounded-2xl border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Ghi chú của bạn
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {notice.trim().length ? `${notice.trim().length} ký tự` : "—"}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input.TextArea
                        value={notice}
                        onChange={(e) => setNotice(e.target.value)}
                        placeholder="Ghi lại ý chính, từ mới, điểm cần nhớ… (sẽ lưu khi bạn bấm “Lưu tiến độ”)"
                        autoSize={{ minRows: 4, maxRows: 10 }}
                        maxLength={2000}
                        disabled={loading || Boolean(error) || completeSubmitting}
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        Ghi chú sẽ được lưu cùng tiến độ bài học.
                      </div>
                    </div>
                  </Card>

                  <Card
                    variant="outlined"
                    className="rounded-2xl border-slate-200 shadow-sm overflow-hidden"
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          On this page
                        </span>
                        <span className="text-xs text-slate-500">
                          {tocItems.length > 0
                            ? `${tocItems.length} sections`
                            : "—"}
                        </span>
                      </div>
                    }
                    styles={{
                      header: {
                        background:
                          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                        borderBottom: "1px solid #e2e8f0",
                      },
                      body: {
                        maxHeight: "min(60vh, 520px)",
                        overflowY: "auto",
                        padding: "12px",
                      },
                    }}
                  >
                    {tocItems.length > 0 ? (
                      <nav aria-label="Table of contents">
                        <ul className="list-none m-0 p-0 space-y-1.5">
                          {tocItems.map((item) => (
                            <li
                              key={item.id}
                              style={{ marginLeft: (item.level - 1) * 10 }}
                              className="text-sm"
                            >
                              <a
                                href={`#${item.id}`}
                                className={`group flex items-start gap-2 no-underline rounded-lg px-2.5 py-2 border transition-all ${
                                  item.level === 1
                                    ? "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70"
                                    : item.level === 2
                                      ? "border-slate-200 bg-white hover:bg-slate-50"
                                      : "border-transparent bg-transparent hover:bg-slate-50"
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  scrollToHeading(item.id);
                                }}
                              >
                                <span
                                  className={`mt-[6px] h-1.5 w-1.5 rounded-full shrink-0 ${
                                    item.level === 1
                                      ? "bg-indigo-500"
                                      : item.level === 2
                                        ? "bg-slate-400"
                                        : "bg-slate-300"
                                  }`}
                                />
                                <span
                                  className={`break-words leading-snug ${
                                    item.level === 1
                                      ? "text-indigo-900 font-semibold group-hover:text-indigo-700"
                                      : item.level === 2
                                        ? "text-slate-700 font-medium group-hover:text-slate-900"
                                        : "text-slate-600 group-hover:text-slate-800"
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </nav>
                    ) : (
                      <Text type="secondary" className="mt-2 block text-sm">
                        Nội dung chưa có heading (H1–H3) để tạo mục lục.
                      </Text>
                    )}
                  </Card>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Text type="secondary" className="!mb-0 block text-sm">
                      “Lưu tiến độ” sẽ ghi lại thời điểm đang xem trên video để
                      bạn học tiếp lần sau.
                    </Text>

                    {practiceSlug ? (
                      <Button
                        type="default"
                        size="large"
                        loading={practiceLoading}
                        disabled={loading || Boolean(error) || isInactive}
                        onClick={handleOpenPractice}
                        className="mt-3 w-full !border-sky-200 !bg-sky-50 !text-sky-800 hover:!border-sky-300 hover:!bg-sky-100"
                      >
                        Luyện tập
                      </Button>
                    ) : null}
                    <Button
                      type="primary"
                      size="large"
                      icon={<CheckCircleOutlined />}
                      loading={completeSubmitting}
                      disabled={isInactive}
                      onClick={handleCompleteLesson}
                      className="mt-3 w-full !border-emerald-600 !bg-emerald-600 hover:!border-emerald-700 hover:!bg-emerald-700"
                    >
                      Lưu tiến độ
                    </Button>
                  </div>
                </div>
              </div>
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
