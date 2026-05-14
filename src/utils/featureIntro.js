const STORAGE_PREFIX = "toeicrise_feature_intro_v1_";

export function getFeatureIntroStorageKey(featureId) {
  return `${STORAGE_PREFIX}${featureId}`;
}

export function resolveFeatureIntroId(pathname, ctx) {
  if (pathname === "/" || pathname === "") return null;

  if (pathname.startsWith("/learning-paths")) {
    if (!ctx.isLearner) return null;
    return "learning_paths";
  }
  if (pathname.startsWith("/flashcards")) {
    if (!ctx.isLearner) return null;
    return "flashcards";
  }
  if (pathname.startsWith("/statistics")) {
    if (!ctx.isLearner) return null;
    return "statistics";
  }
  if (pathname.startsWith("/exam-structure")) return "exam_structure";

  const testPrefixes = [
    "/online-tests",
    "/do-test",
    "/do-mini-test",
    "/mini-test-result",
    "/test-result",
    "/test-result-detail",
    "/redo-wrong",
    "/fix-wrong-one-by-one",
  ];
  if (
    testPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return "online_tests";
  }

  if (pathname.startsWith("/profile")) {
    if (!ctx.isAuthenticated) return null;
    return "profile";
  }

  return null;
}
