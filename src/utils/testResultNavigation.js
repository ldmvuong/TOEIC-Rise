/**
 * Build /test-result/:id URL. Writing tests use ?writing=1 so the result page
 * calls GET /learner/user-tests/writing/{id} instead of the default statistics endpoint.
 */
export function buildTestResultPath(userTestId, options = {}) {
  const { parts, forceWriting } = options;
  const writing =
    forceWriting === true ||
    (Array.isArray(parts) &&
      parts.some((p) => /writing/i.test(String(p))));
  const q = writing ? "?writing=1" : "";
  return `/test-result/${userTestId}${q}`;
}
