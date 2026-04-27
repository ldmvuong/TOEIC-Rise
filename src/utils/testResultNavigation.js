/**
 * Build /test-result/:id URL.
 * - ?writing=1 → statistics from GET /learner/user-tests/writing/{id}
 * - ?speaking=1 → statistics from GET /learner/user-tests/speaking/{id}
 */
export function buildTestResultPath(userTestId, options = {}) {
  const { parts, forceWriting, forceSpeaking } = options;
  if (forceSpeaking === true) {
    return `/test-result/${userTestId}?speaking=1`;
  }
  const writing =
    forceWriting === true ||
    (Array.isArray(parts) &&
      parts.some((p) => /writing/i.test(String(p))));
  if (writing) {
    return `/test-result/${userTestId}?writing=1`;
  }
  const speakingFromParts =
    Array.isArray(parts) &&
    parts.some((p) => /speaking/i.test(String(p)));
  const q = speakingFromParts ? "?speaking=1" : "";
  return `/test-result/${userTestId}${q}`;
}
