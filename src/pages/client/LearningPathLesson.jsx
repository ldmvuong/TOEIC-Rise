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
  HolderOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import parse from "html-react-parser";
import {
  getLearnerLesson,
  getLearningPathDetail,
  getMiniTestPracticeBySlug,
  upsertUserLessonProgress,
  upsertUserLessonProgressKeepalive,
} from "@/api/api";
import {
  canAccessSequentialLesson,
  canOpenLessonToday,
  coerceLessonProgressList,
  describeDailyLessonBlock,
  describeSequentialLessonBlock,
  lessonWasEverOpened,
  markTodayPlayedLessonIfFirst,
} from "@/utils/learningPathDailyLimit";
import { loadYouTubeIframeAPI } from "@/utils/youtubeIframeApi";

const YT_STATE_PLAYING = 1;

/** Cho phép lệch nhỏ (buffer / tick) trước khi coi là tua tới. */
const LESSON_VIDEO_MAX_PROGRESS_TOLERANCE_SEC = 0.45;

const MINI_PLAYER_W_MIN = 200;
const MINI_PLAYER_W_MAX = 560;
const MINI_PLAYER_W_DEFAULT = 320;
const MINI_PLAYER_TOOLBAR_PX = 36;

const { Title, Text } = Typography;

function clampNumber(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function miniPlayerTotalHeightPx(widthPx) {
  return MINI_PLAYER_TOOLBAR_PX + (widthPx * 9) / 16;
}

function clampMiniPlayerInsets(rightPx, bottomPx, widthPx) {
  if (typeof window === "undefined") {
    return { right: rightPx, bottom: bottomPx };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const m = 8;
  const totalH = miniPlayerTotalHeightPx(widthPx);
  const r = clampNumber(rightPx, m, Math.max(m, vw - widthPx - m));
  const b = clampNumber(bottomPx, m, Math.max(m, vh - totalH - m));
  return { right: r, bottom: b };
}

/** Delta width (px) for mini player; panel anchored bottom-right, 16:9 video. */
function computeMiniWidthDelta(mode, startX, startY, clientX, clientY) {
  const dx = clientX - startX;
  const dy = clientY - startY;
  const ry = (dy * 16) / 9;
  switch (mode) {
    case "e":
      return dx;
    case "w":
      return -dx;
    case "s":
      return ry;
    case "n":
      return -ry;
    case "sw":
      return -dx + ry;
    case "se":
      return dx + ry;
    case "nw":
      return -dx - ry;
    case "ne":
      return dx - ry;
    default:
      return 0;
  }
}

function normalizeLessonHtml(html) {
  const raw = String(html ?? "");
  // Some contents are stored with escaped quotes like: src=\"https://...png\"
  // Browsers treat that backslash as part of the attribute value, breaking images.
  const fixedDanglingSlash = raw
    // Handle urls that end with image ext and have a stray "\" before an escaped quote: ...png\"
    .replace(/(\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\\"]*)?)\\+(?=\\")/gi, "$1")
    // Then unescape quotes so html-react-parser can parse proper attributes
    .replace(/\\"/g, '"')
    // Safety: if a stray "\" still remains before a real quote after unescape: ...png\"
    .replace(/(\.(?:png|jpe?g|gif|webp|svg)(?:\?[^"']*)?)\\+(?=["'])/gi, "$1");
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
  if (!html || typeof window === "undefined")
    return { html: String(html || ""), headings: [] };
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
        if (
          idx === 0 &&
          (line.includes("word") ||
            line.includes("từ") ||
            line.includes("meaning"))
        )
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
  if (!synth || typeof window.SpeechSynthesisUtterance !== "function")
    return false;
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
  const {
    learningPathSlug,
    id: legacyId,
    lessonSlug,
    lessonId: legacyLessonId,
  } = useParams();
  const learningPathId = learningPathSlug ?? legacyId;
  const lessonId = lessonSlug ?? legacyLessonId;
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const videoDockRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytPlayerDestroyRef = useRef(null);
  const lessonWasOpenedBeforePlaybackRef = useRef(false);
  const getPlaybackPayloadRef = useRef(null);
  const noticeRef = useRef("");
  const lastLoadedProgressFlushRef = useRef(null);
  const playbackSnapshotRef = useRef({
    lastWatchedTimeMs: 0,
    progressPercentage: 0,
  });
  /** Thời điểm xa nhất được phép xem (giây); chỉ tăng khi phát tiến tới, không giảm khi tua lùi. */
  const lessonVideoMaxProgressRef = useRef(0);
  const lessonVideoFenceLessonKeyRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [pathLessons, setPathLessons] = useState([]);
  const [notice, setNotice] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [isVideoMini, setIsVideoMini] = useState(false);
  const [videoMiniForcedInline, setVideoMiniForcedInline] = useState(false);
  const [miniPlayerWidthPx, setMiniPlayerWidthPx] = useState(
    MINI_PLAYER_W_DEFAULT,
  );
  const [miniPlayerInset, setMiniPlayerInset] = useState({
    right: 16,
    bottom: 16,
  });

  const showVideoMini = isVideoMini && !videoMiniForcedInline;

  useEffect(() => {
    if (loading || error || !learningPathId) return;
    window.history.pushState(null, null, window.location.pathname);

    const handleBackButton = async (event) => {
      event.preventDefault();
      const buildProgress = lastLoadedProgressFlushRef.current;
      if (buildProgress) {
        const payload = buildProgress();
        if (payload?.lessonId) {
          try {
            await upsertUserLessonProgress(payload);
          } catch (err) {
            console.error("Failed to save progress on back button:", err);
          }
        }
      }
      navigate(`/learning-paths/${learningPathId}`);
    };
    window.addEventListener("popstate", handleBackButton);

    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [learningPathId, navigate, loading, error]);

  useEffect(() => {
    if (!lesson?.videoUrl || loading || error) {
      setIsVideoMini(false);
      setVideoMiniForcedInline(false);
      setMiniPlayerWidthPx(MINI_PLAYER_W_DEFAULT);
      setMiniPlayerInset({ right: 16, bottom: 16 });
      return;
    }
    const el = videoDockRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Thu nhỏ khi khối video gần hết khỏi vùng xem (tương tự YouTube mobile).
        const mini = !entry.isIntersecting || entry.intersectionRatio < 0.12;
        setIsVideoMini(mini);
      },
      {
        root: null,
        rootMargin: "-72px 0px -12% 0px",
        threshold: [0, 0.05, 0.1, 0.12, 0.2, 0.35, 0.5, 0.75, 1],
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lesson?.videoUrl, lessonId, loading, error]);

  useEffect(() => {
    if (!isVideoMini) {
      setVideoMiniForcedInline(false);
      setMiniPlayerWidthPx(MINI_PLAYER_W_DEFAULT);
      setMiniPlayerInset({ right: 16, bottom: 16 });
    }
  }, [isVideoMini]);

  useEffect(() => {
    setMiniPlayerInset((prev) => {
      const c = clampMiniPlayerInsets(
        prev.right,
        prev.bottom,
        miniPlayerWidthPx,
      );
      if (c.right === prev.right && c.bottom === prev.bottom) return prev;
      return { right: c.right, bottom: c.bottom };
    });
  }, [miniPlayerWidthPx]);

  const restoreVideoInline = useCallback(() => {
    setVideoMiniForcedInline(true);
    requestAnimationFrame(() => {
      videoDockRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, []);

  const onMiniToolbarPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button")) return;
      const el = e.currentTarget;
      if (typeof el.setPointerCapture === "function") {
        el.setPointerCapture(e.pointerId);
      }
      const startX = e.clientX;
      const startY = e.clientY;
      const r0 = miniPlayerInset.right;
      const b0 = miniPlayerInset.bottom;
      const w0 = miniPlayerWidthPx;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const c = clampMiniPlayerInsets(r0 - dx, b0 - dy, w0);
        setMiniPlayerInset({ right: c.right, bottom: c.bottom });
      };
      const onUp = () => {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      e.preventDefault();
    },
    [miniPlayerInset.right, miniPlayerInset.bottom, miniPlayerWidthPx],
  );

  const onMiniVideoResizePointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const mode = e.currentTarget.getAttribute("data-mini-resize");
      if (
        mode !== "n" &&
        mode !== "s" &&
        mode !== "e" &&
        mode !== "w" &&
        mode !== "nw" &&
        mode !== "ne" &&
        mode !== "sw" &&
        mode !== "se"
      ) {
        return;
      }
      const el = e.currentTarget;
      if (typeof el.setPointerCapture === "function") {
        el.setPointerCapture(e.pointerId);
      }
      const startX = e.clientX;
      const startY = e.clientY;
      const w0 = miniPlayerWidthPx;
      const onMove = (ev) => {
        const dw = computeMiniWidthDelta(
          mode,
          startX,
          startY,
          ev.clientX,
          ev.clientY,
        );
        const maxW = Math.min(
          MINI_PLAYER_W_MAX,
          typeof window !== "undefined" ? window.innerWidth - 24 : MINI_PLAYER_W_MAX,
        );
        const nw = clampNumber(Math.round(w0 + dw), MINI_PLAYER_W_MIN, maxW);
        setMiniPlayerWidthPx(nw);
        setMiniPlayerInset((prev) => {
          const c = clampMiniPlayerInsets(prev.right, prev.bottom, nw);
          return { right: c.right, bottom: c.bottom };
        });
      };
      const onUp = () => {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      e.preventDefault();
    },
    [miniPlayerWidthPx],
  );

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
        const gatingLessonId = resolvedLessonIdOk
          ? resolvedLessonId
          : Number(lessonId);

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
          message.warning(describeDailyLessonBlock(gate));
          navigate(`/learning-paths/${learningPathId}`, { replace: true });
          return;
        }

        // Lesson API expects lessonSlug; fallback to param if slug not present.
        const apiLessonSlug =
          (typeof resolvedRow?.lesson?.slug === "string" &&
            resolvedRow.lesson.slug.trim()) ||
          (typeof lessonId === "string" ? lessonId : String(lessonId));

        const res = await getLearnerLesson(apiLessonSlug, learningPathId);
        if (cancelled) return;
        const pathRow =
          resolvedRow ?? findPathLessonRow(pathRes?.data?.lessons, lessonId);
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
            e?.response?.data?.message || e?.message || "Unable to load lesson";
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

  const title = lesson?.title || "Lesson";
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
    const lid = Number.isFinite(Number(lesson?.id))
      ? Number(lesson.id)
      : Number(lessonId);
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
    const hs = Array.isArray(contentWithIds?.headings)
      ? contentWithIds.headings
      : [];
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

  const readLivePlayback = useCallback(() => {
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
        return null;
      }
    }
    return null;
  }, []);

  const enforceLessonVideoPlaybackRules = useCallback(() => {
    const fence = lessonVideoMaxProgressRef.current;
    const yt = ytPlayerRef.current;
    if (yt?.getCurrentTime && yt?.seekTo) {
      try {
        const t = yt.getCurrentTime();
        if (!Number.isFinite(t)) return;
        if (t > fence + LESSON_VIDEO_MAX_PROGRESS_TOLERANCE_SEC) {
          yt.seekTo(fence, true);
        } else if (t >= fence - 0.05) {
          lessonVideoMaxProgressRef.current = Math.max(fence, t);
        }
        if (
          typeof yt.getPlaybackRate === "function" &&
          typeof yt.setPlaybackRate === "function"
        ) {
          const r = yt.getPlaybackRate();
          if (Number.isFinite(r) && Math.abs(r - 1) > 0.02) {
            yt.setPlaybackRate(1);
          }
        }
      } catch {
        /* noop */
      }
      return;
    }
    const html5 = videoRef.current;
    if (!html5) return;
    try {
      const t = html5.currentTime;
      if (!Number.isFinite(t)) return;
      if (t > fence + LESSON_VIDEO_MAX_PROGRESS_TOLERANCE_SEC) {
        html5.currentTime = fence;
      } else if (t >= fence - 0.05) {
        lessonVideoMaxProgressRef.current = Math.max(fence, t);
      }
      if (Math.abs(html5.playbackRate - 1) > 0.02) {
        html5.playbackRate = 1;
      }
    } catch {
      /* noop */
    }
  }, []);

  const getPlaybackPayload = useCallback(() => {
    const live = readLivePlayback();
    if (live != null) {
      playbackSnapshotRef.current = live;
      return live;
    }
    return { ...playbackSnapshotRef.current };
  }, [readLivePlayback]);

  useEffect(() => {
    if (!lesson || loading || error) return;
    const msRaw =
      lesson.lastWatchedTimeMs ??
      lesson.lessonProgress?.lastWatchedTimeMs ??
      lesson.progress?.lastWatchedTimeMs ??
      lesson.userLessonProgress?.lastWatchedTimeMs;
    const pctRaw =
      typeof lesson.progressPercentage === "number"
        ? lesson.progressPercentage
        : typeof lesson.lessonProgress?.progressPercentage === "number"
          ? lesson.lessonProgress.progressPercentage
          : typeof lesson.progress?.progressPercentage === "number"
            ? lesson.progress.progressPercentage
            : undefined;
    const ms = msRaw != null ? Math.max(0, Math.round(Number(msRaw))) : 0;
    const pct =
      pctRaw != null && Number.isFinite(Number(pctRaw))
        ? Math.min(100, Math.max(0, Number(pctRaw)))
        : 0;
    playbackSnapshotRef.current = {
      lastWatchedTimeMs: ms,
      progressPercentage: pct,
    };
  }, [lesson, loading, error]);

  useEffect(() => {
    if (!lesson || loading || error) return;
    const key = String(lesson.id ?? lessonId ?? "");
    const rs = lessonResumeSecondsFromPayload(lesson);
    const resumeSec = rs != null && Number.isFinite(rs) ? Math.max(0, rs) : 0;
    if (lessonVideoFenceLessonKeyRef.current !== key) {
      lessonVideoFenceLessonKeyRef.current = key;
      lessonVideoMaxProgressRef.current = resumeSec;
    } else {
      lessonVideoMaxProgressRef.current = Math.max(
        lessonVideoMaxProgressRef.current,
        resumeSec,
      );
    }
  }, [lesson, loading, error, lessonId]);

  useEffect(() => {
    const youtubeId = videoEmbedInfo.youtubeId;
    if (!youtubeId || !lesson) return;

    let cancelled = false;
    let snapshotTickId = null;
    let capEnforceTickId = null;

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
            disablekb: 1,
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
              try {
                const t0 =
                  typeof p.getCurrentTime === "function"
                    ? p.getCurrentTime()
                    : 0;
                if (Number.isFinite(t0)) {
                  lessonVideoMaxProgressRef.current = Math.max(
                    lessonVideoMaxProgressRef.current,
                    t0,
                  );
                }
              } catch {
                /* noop */
              }
              snapshotTickId = window.setInterval(() => {
                if (cancelled) return;
                const live = readLivePlayback();
                if (live != null) playbackSnapshotRef.current = live;
              }, 1500);
              capEnforceTickId = window.setInterval(() => {
                if (cancelled) return;
                enforceLessonVideoPlaybackRules();
              }, 250);
            },
            onStateChange: (e) => {
              if (cancelled) return;
              enforceLessonVideoPlaybackRules();
              const live = readLivePlayback();
              if (live != null) playbackSnapshotRef.current = live;
              if (e.data === YT_STATE_PLAYING && pathId && lid) {
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
      if (snapshotTickId != null) {
        window.clearInterval(snapshotTickId);
        snapshotTickId = null;
      }
      if (capEnforceTickId != null) {
        window.clearInterval(capEnforceTickId);
        capEnforceTickId = null;
      }
      const live = readLivePlayback();
      if (live != null) playbackSnapshotRef.current = live;
      ytPlayerRef.current = null;
      try {
        ytPlayerDestroyRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      ytPlayerDestroyRef.current = null;
    };
  }, [
    videoEmbedInfo.youtubeId,
    lesson,
    lessonId,
    learningPathId,
    readLivePlayback,
    enforceLessonVideoPlaybackRules,
  ]);

  getPlaybackPayloadRef.current = getPlaybackPayload;
  noticeRef.current = notice;

  useEffect(() => {
    if (loading || error || !lesson || isInactive) return;
    const nid = Number(lesson.id ?? lessonId);
    if (!Number.isFinite(nid)) return;
    lastLoadedProgressFlushRef.current = () => {
      const readPlayback = getPlaybackPayloadRef.current;
      const { lastWatchedTimeMs, progressPercentage } =
        typeof readPlayback === "function"
          ? readPlayback()
          : { lastWatchedTimeMs: 0, progressPercentage: 0 };
      return {
        lessonId: nid,
        progressPercentage: Number(progressPercentage),
        lastWatchedTimeMs: Math.max(0, Math.round(Number(lastWatchedTimeMs))),
        notice: String(noticeRef.current ?? "").trim(),
      };
    };
  }, [loading, error, lesson, isInactive, lessonId]);

  useEffect(() => {
    return () => {
      const build = lastLoadedProgressFlushRef.current;
      if (!build) return;
      const payload = build();
      if (!payload?.lessonId) return;
      void upsertUserLessonProgress(payload).catch(() => {});
    };
  }, [lessonId, learningPathId]);

  useEffect(() => {
    const onPageHide = () => {
      const build = lastLoadedProgressFlushRef.current;
      if (!build) return;
      const payload = build();
      if (!payload?.lessonId) return;
      void upsertUserLessonProgressKeepalive(payload);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
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
      message.success("Lesson progress saved");
      navigate(`/learning-paths/${learningPathId}`);
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Unable to update progress",
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
      lesson?.practiceSlug ?? lesson?.practice?.slug ?? lesson?.practice ?? "";
    return typeof raw === "string" ? raw.trim() : "";
  }, [lesson?.practiceSlug, lesson?.practice]);

  const practiceTagName = useMemo(() => {
    if (!lesson || typeof lesson !== "object") return "";
    const fromFields = lesson.practice;
    if (fromFields != null && String(fromFields).trim() !== "") {
      return String(fromFields).trim();
    }
    if (typeof lesson.practice === "string" && lesson.practice.trim() !== "") {
      return lesson.practice.trim();
    }
    return "";
  }, [lesson]);

  const showPracticeButton = Boolean(practiceSlug) && Boolean(practiceTagName);

  const handleOpenPractice = useCallback(async () => {
    if (!practiceSlug) return;
    try {
      setPracticeLoading(true);
      const res = await getMiniTestPracticeBySlug(practiceSlug);
      const testData = res?.data ?? null;
      if (!testData) {
        message.error("Unable to load practice data");
        return;
      }
      navigate("/do-mini-test", {
        state: {
          testData,
          selectedTags: [],
          partNumber:
            testData?.partNumber ?? testData?.part?.number ?? undefined,
          from: "learning-path-lesson",
          practiceSlug,
        },
      });
    } catch (e) {
      message.error(
        e?.response?.data?.message || e?.message || "Unable to load practice",
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
            {lesson?.topic ? (
              <Tag
                style={{ marginInlineEnd: 0 }}
                className="!m-0 !rounded-full !border-emerald-200 !bg-emerald-50 !px-3 !py-1 !text-xs !font-semibold !text-emerald-800"
              >
                Topic: {lesson.topic}
              </Tag>
            ) : null}
            {lesson?.level ? (
              <Tag
                style={{ marginInlineEnd: 0 }}
                className="!m-0 !rounded-full !border-slate-200 !bg-slate-50 !px-3 !py-1 !text-xs !font-semibold !text-slate-700"
              >
                Level: {String(lesson.level)}
              </Tag>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {stepInfo ? (
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                Step {stepInfo.index}/{stepInfo.total}
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
                  Lesson progress
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {Math.round(lessonProgressPct)}%
                  </span>
                  {lesson?.isCompleted ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Completed
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
            <Spin size="large" tip="Loading lesson..." spinning>
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
                This lesson is currently unavailable.
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
                          Lesson video
                        </div>
                        {resumeSecondsHint != null ? (
                          <Text
                            type="secondary"
                            className="!mb-0 block text-xs"
                          >
                            Resume from the previously saved position.
                          </Text>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black">
                    {lesson?.videoUrl ? (
                      <div ref={videoDockRef} className="relative w-full">
                        {showVideoMini ? (
                          <div
                            className="aspect-video w-full shrink-0"
                            aria-hidden
                          />
                        ) : null}
                        <div
                          className={
                            showVideoMini
                              ? "fixed z-[100] flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/15"
                              : "relative aspect-video w-full overflow-hidden"
                          }
                          style={
                            showVideoMini
                              ? {
                                  width: miniPlayerWidthPx,
                                  right: miniPlayerInset.right,
                                  bottom: `calc(${miniPlayerInset.bottom}px + env(safe-area-inset-bottom, 0px))`,
                                }
                              : undefined
                          }
                        >
                          {showVideoMini ? (
                            <div
                              className="flex h-9 shrink-0 cursor-grab select-none items-center gap-0.5 border-b border-white/10 bg-slate-900/95 px-1 active:cursor-grabbing touch-none"
                              onPointerDown={onMiniToolbarPointerDown}
                            >
                              <HolderOutlined className="ml-1 shrink-0 text-slate-400" />
                              <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium text-slate-200">
                                Lesson video
                              </span>
                              <Tooltip title="Return to the original position on the page">
                                <Button
                                  type="text"
                                  size="small"
                                  className="!text-slate-200"
                                  icon={<FullscreenExitOutlined />}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restoreVideoInline();
                                  }}
                                />
                              </Tooltip>
                            </div>
                          ) : null}
                          <div
                            className={
                              showVideoMini
                                ? "relative w-full shrink-0 overflow-visible"
                                : "relative h-full w-full overflow-hidden"
                            }
                            style={
                              showVideoMini
                                ? { aspectRatio: "16/9" }
                                : undefined
                            }
                          >
                            {videoEmbedInfo.youtubeId ? (
                              <div className="h-full w-full overflow-hidden">
                                <div
                                  ref={youtubeContainerRef}
                                  className="h-full w-full"
                                />
                              </div>
                            ) : (
                              <video
                                ref={videoRef}
                                className={`h-full w-full bg-black object-contain ${
                                  showVideoMini ? "" : "max-h-[70vh]"
                                }`}
                                controls
                                playsInline
                                src={
                                  videoEmbedInfo.directUrl || lesson.videoUrl
                                }
                                onLoadedMetadata={(e) => {
                                  const v = e.currentTarget;
                                  const hint =
                                    lessonResumeSecondsFromPayload(lesson);
                                  if (hint != null) {
                                    const t = clampResumeToDuration(
                                      hint,
                                      v.duration,
                                    );
                                    if (
                                      t != null &&
                                      Number.isFinite(v.duration) &&
                                      v.duration > 0
                                    ) {
                                      try {
                                        v.currentTime = t;
                                      } catch {
                                        /* noop */
                                      }
                                    }
                                  }
                                  const t0 = v.currentTime ?? 0;
                                  if (Number.isFinite(t0)) {
                                    lessonVideoMaxProgressRef.current =
                                      Math.max(
                                        lessonVideoMaxProgressRef.current,
                                        t0,
                                      );
                                  }
                                  try {
                                    v.playbackRate = 1;
                                  } catch {
                                    /* noop */
                                  }
                                  enforceLessonVideoPlaybackRules();
                                }}
                                onSeeked={enforceLessonVideoPlaybackRules}
                                onRateChange={(e) => {
                                  const v = e.currentTarget;
                                  try {
                                    if (Math.abs(v.playbackRate - 1) > 0.02) {
                                      v.playbackRate = 1;
                                    }
                                  } catch {
                                    /* noop */
                                  }
                                  enforceLessonVideoPlaybackRules();
                                }}
                                onTimeUpdate={(e) => {
                                  enforceLessonVideoPlaybackRules();
                                  const v = e.currentTarget;
                                  const live = computePlaybackProgress(
                                    v.currentTime ?? 0,
                                    v.duration,
                                  );
                                  playbackSnapshotRef.current = live;
                                }}
                                onPlaying={() =>
                                  markTodayPlayedLessonIfFirst(
                                    String(learningPathId),
                                    lessonId,
                                    lessonWasOpenedBeforePlaybackRef.current,
                                  )
                                }
                              >
                                Your browser does not support video.
                              </video>
                            )}
                            {showVideoMini ? (
                              <>
                                <div
                                  data-mini-resize="n"
                                  className="absolute top-0 left-8 right-8 z-20 h-3 cursor-ns-resize touch-none hover:bg-white/10"
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the top edge to resize"
                                />
                                <div
                                  data-mini-resize="s"
                                  className="absolute bottom-0 left-8 right-8 z-20 h-3 cursor-ns-resize touch-none hover:bg-white/10"
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the bottom edge to resize"
                                />
                                <div
                                  data-mini-resize="e"
                                  className="absolute right-0 top-8 bottom-8 z-20 w-3 cursor-ew-resize touch-none hover:bg-white/10"
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the right edge to resize"
                                />
                                <div
                                  data-mini-resize="w"
                                  className="absolute left-0 top-8 bottom-8 z-20 w-3 cursor-ew-resize touch-none hover:bg-white/10"
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the left edge to resize"
                                />
                                <div
                                  data-mini-resize="nw"
                                  className="absolute top-0 left-0 z-30 h-8 w-8 cursor-nwse-resize touch-none"
                                  style={{
                                    background:
                                      "linear-gradient(to bottom right, rgba(255,255,255,0.42), transparent 62%)",
                                  }}
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the top-left corner to resize"
                                />
                                <div
                                  data-mini-resize="ne"
                                  className="absolute top-0 right-0 z-30 h-8 w-8 cursor-nesw-resize touch-none"
                                  style={{
                                    background:
                                      "linear-gradient(to bottom left, rgba(255,255,255,0.42), transparent 62%)",
                                  }}
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the top-right corner to resize"
                                />
                                <div
                                  data-mini-resize="sw"
                                  className="absolute bottom-0 left-0 z-30 h-8 w-8 cursor-nesw-resize touch-none"
                                  style={{
                                    background:
                                      "linear-gradient(to top right, rgba(255,255,255,0.42), transparent 62%)",
                                  }}
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the bottom-left corner to resize"
                                />
                                <div
                                  data-mini-resize="se"
                                  className="absolute bottom-0 right-0 z-30 h-8 w-8 cursor-nwse-resize touch-none"
                                  style={{
                                    background:
                                      "linear-gradient(to top left, rgba(255,255,255,0.42), transparent 62%)",
                                  }}
                                  onPointerDown={onMiniVideoResizePointerDown}
                                  aria-label="Drag the bottom-right corner to resize"
                                />
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-10 text-center text-sm text-slate-200">
                        No video is available for this lesson.
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
                        {parse(
                          normalizeLessonHtml(String(contentWithIds.html)),
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Text type="secondary">No content available.</Text>
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
                      <div className="text-sm font-semibold text-slate-900">
                        Your notes
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {notice.trim().length
                          ? `${notice.trim().length} characters`
                          : "—"}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input.TextArea
                        value={notice}
                        onChange={(e) => setNotice(e.target.value)}
                        placeholder="Write down key ideas, new words, and points to remember... Notes will be saved with your lesson progress."
                        autoSize={{ minRows: 4, maxRows: 10 }}
                        maxLength={2000}
                        disabled={
                          loading || Boolean(error) || completeSubmitting
                        }
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        Notes will be saved with your lesson progress.
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
                        This content has no headings (H1-H3) to build a table of contents.
                      </Text>
                    )}
                  </Card>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Text type="secondary" className="!mb-0 block text-sm">
                      When you leave, the system will save your current video
                      position so you can continue next time.
                    </Text>

                    {showPracticeButton ? (
                      <Button
                        type="default"
                        size="large"
                        loading={practiceLoading}
                        disabled={loading || Boolean(error) || isInactive}
                        onClick={handleOpenPractice}
                        className="mt-3 w-full !border-sky-200 !bg-sky-50 !text-sky-800 hover:!border-sky-300 hover:!bg-sky-100"
                      >
                        Practice
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {lesson?.updatedAt ? (
              <div className="mt-6 text-xs text-slate-400">
                Updated: {lesson.updatedAt}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
