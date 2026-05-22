export const MIN_PROGRESS_TO_UNLOCK_NEXT = 80;
export const MAX_NEW_LESSONS_PER_DAY = 5;

/** @typedef {{ lesson?: { id?: number|string, createdAt?: string|null }, progressUpdatedAt?: string|null }} LessonProgressLike */

export function formatLocalYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseFlexibleDate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function sameLocalCalendarDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function isCreatedAtLocalToday(isoLike, reference = new Date()) {
  const d = parseFlexibleDate(isoLike);
  if (!d) return false;
  return sameLocalCalendarDay(d, reference);
}

export function getProgressCreatedAt(item) {
  const candidates = [item?.createdAt, item?.lesson?.createdAt];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "string" && !String(c).trim()) continue;
    if (parseFlexibleDate(c) != null) return c;
  }
  return null;
}

export function lessonWasEverOpened(item) {
  return getProgressCreatedAt(item) != null;
}

export function previousLessonMeetsAdvanceGate(prevItem) {
  if (!prevItem) return true;
  if (Boolean(prevItem.isCompleted)) return true;
  const pct = Math.min(
    100,
    Math.max(0, Number(prevItem.progressPercentage ?? 0)),
  );
  return pct >= MIN_PROGRESS_TO_UNLOCK_NEXT;
}

function sortLessonProgressItems(items) {
  return [...(items || [])].sort((a, b) => {
    const oa = a?.lesson?.orderIndex ?? 0;
    const ob = b?.lesson?.orderIndex ?? 0;
    return oa - ob;
  });
}

export function findNextEnterableNewLessonId(lessonItems) {
  const sorted = sortLessonProgressItems(lessonItems);
  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    if (lessonWasEverOpened(it)) continue;
    const gatedPrev = i === 0 || previousLessonMeetsAdvanceGate(sorted[i - 1]);
    if (gatedPrev) return sorted[i]?.lesson?.id ?? null;
    return null;
  }
  return null;
}

export function canAccessSequentialLesson(lessonItems, targetLessonId) {
  const sorted = sortLessonProgressItems(lessonItems);
  const idx = sorted.findIndex(
    (x) => Number(x?.lesson?.id) === Number(targetLessonId),
  );
  if (idx < 0) return { ok: false, reason: "not_in_path" };
  const it = sorted[idx];
  if (lessonWasEverOpened(it)) return { ok: true };
  if (idx === 0) return { ok: true };
  if (previousLessonMeetsAdvanceGate(sorted[idx - 1])) return { ok: true };
  return { ok: false, reason: "need_prev_progress" };
}

export function dailyVideoSessionKey(learningPathId) {
  return `toeic.rise.lp.daily_video.${learningPathId}.${formatLocalYYYYMMDD()}`;
}

function parseStoredLessonIds(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
  } catch {
    const asNum = Number(text);
    return Number.isFinite(asNum) ? [asNum] : [];
  }
}

function stringifyStoredLessonIds(ids) {
  return JSON.stringify(
    [...new Set((ids || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))],
  );
}

export function getStoredTodayPlayedLessonIds(learningPathId) {
  try {
    return parseStoredLessonIds(
      sessionStorage.getItem(dailyVideoSessionKey(learningPathId)),
    );
  } catch {
    return [];
  }
}

function clearStoredTodayPlayedLessonIfAny(learningPathId) {
  try {
    sessionStorage.removeItem(dailyVideoSessionKey(learningPathId));
  } catch {
    /* noop */
  }
}

export function markTodayPlayedLessonIfFirst(
  learningPathId,
  lessonId,
  lessonWasAlreadyOpened = false,
) {
  if (!learningPathId || lessonId == null) return;
  if (lessonWasAlreadyOpened) return;
  try {
    const key = dailyVideoSessionKey(learningPathId);
    const current = parseStoredLessonIds(sessionStorage.getItem(key));
    const lid = Number(lessonId);
    if (!Number.isFinite(lid)) return;
    if (current.includes(lid)) return;
    if (current.length >= MAX_NEW_LESSONS_PER_DAY) return;
    sessionStorage.setItem(key, stringifyStoredLessonIds([...current, lid]));
  } catch {
    /* private mode etc. */
  }
}

export function coerceLessonProgressList(apiLessons) {
  const rows = Array.isArray(apiLessons)
    ? apiLessons
    : apiLessons &&
        typeof apiLessons === "object" &&
        Array.isArray(apiLessons.result)
      ? apiLessons.result
      : [];
  return rows.map((raw) => {
    const nested = raw?.lesson != null && typeof raw.lesson === "object";
    const lessonObj = nested ? raw.lesson : raw;
    const id = nested ? lessonObj?.id : (lessonObj?.id ?? raw?.id);
    const orderIndex =
      lessonObj?.orderIndex != null
        ? Number(lessonObj.orderIndex)
        : Number(raw?.orderIndex ?? 0) || 0;
    const fromLesson =
      nested &&
      lessonObj?.createdAt != null &&
      String(lessonObj.createdAt).trim() !== ""
        ? lessonObj.createdAt
        : null;
    const wrapperCreatedAt =
      raw?.createdAt != null && String(raw.createdAt).trim() !== ""
        ? raw.createdAt
        : null;
    const mergedCreatedAt = fromLesson ?? wrapperCreatedAt ?? null;

    const progressPercentage =
      typeof raw?.progressPercentage === "number" &&
      Number.isFinite(raw.progressPercentage)
        ? raw.progressPercentage
        : 0;
    const isCompleted = Boolean(raw?.isCompleted);

    return {
      lesson:
        id != null
          ? { id, createdAt: mergedCreatedAt, orderIndex }
          : {
              createdAt: mergedCreatedAt,
              orderIndex,
            },
      createdAt: wrapperCreatedAt,
      progressUpdatedAt: raw?.progressUpdatedAt ?? null,
      progressPercentage,
      isCompleted,
    };
  });
}

export function describeDailyLessonBlock(check) {
  if (check.ok) return "";
  const limitHint = `You can study up to ${MAX_NEW_LESSONS_PER_DAY} new lessons in a learning path each day. You have reached today's limit. Please return tomorrow or review lessons you have already opened.`;
  if (check.reason === "session_video") {
    return limitHint;
  }
  if (check.reason === "server_lesson_opened_today") {
    return limitHint;
  }
  return "Unable to open this lesson today.";
}

export function describeSequentialLessonBlock(check) {
  if (check.ok) return "";
  if (check.reason === "need_prev_progress") {
    return `Reach at least ${MIN_PROGRESS_TO_UNLOCK_NEXT}% progress in the previous lesson, or complete it, to unlock this lesson.`;
  }
  if (check.reason === "not_in_path")
    return "This lesson does not belong to this learning path.";
  return "Unable to open this lesson.";
}

function countDistinctLessonsOpenedNewToday(
  items,
  targetLessonId,
  ref = new Date(),
) {
  const tgt = Number(targetLessonId);
  const openedToday = new Set();
  for (const item of items || []) {
    const lid = item?.lesson?.id;
    if (lid == null || Number(lid) === tgt) continue;
    const ca = getProgressCreatedAt(item);
    if (!ca || (typeof ca === "string" && !ca.trim())) continue;
    if (isCreatedAtLocalToday(ca, ref)) openedToday.add(Number(lid));
  }
  return openedToday.size;
}

export function canOpenLessonToday(
  learningPathId,
  targetLessonId,
  lessonItems,
  ref = new Date(),
) {
  const tgt = Number(targetLessonId);
  const targetItem = (lessonItems || []).find(
    (x) => Number(x?.lesson?.id) === tgt,
  );

  if (lessonWasEverOpened(targetItem)) {
    return { ok: true };
  }

  if (
    countDistinctLessonsOpenedNewToday(lessonItems, tgt, ref) >=
    MAX_NEW_LESSONS_PER_DAY
  ) {
    return { ok: false, reason: "server_lesson_opened_today" };
  }

  const playedIds = getStoredTodayPlayedLessonIds(learningPathId);
  const freshPlayedIds = playedIds.filter((id) => {
    const item = (lessonItems || []).find(
      (x) => Number(x?.lesson?.id) === Number(id),
    );
    const createdAt = item ? getProgressCreatedAt(item) : null;
    return (
      createdAt != null &&
      String(createdAt).trim() !== "" &&
      parseFlexibleDate(createdAt) != null &&
      isCreatedAtLocalToday(createdAt, ref)
    );
  });

  if (freshPlayedIds.length !== playedIds.length) {
    if (freshPlayedIds.length === 0) {
      clearStoredTodayPlayedLessonIfAny(learningPathId);
    } else {
      try {
        sessionStorage.setItem(
          dailyVideoSessionKey(learningPathId),
          stringifyStoredLessonIds(freshPlayedIds),
        );
      } catch {
        /* noop */
      }
    }
  }

  if (
    freshPlayedIds.length >= MAX_NEW_LESSONS_PER_DAY &&
    !freshPlayedIds.includes(tgt)
  ) {
    return {
      ok: false,
      reason: "session_video",
    };
  }

  return { ok: true };
}
