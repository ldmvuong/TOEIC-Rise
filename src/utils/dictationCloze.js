function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  const s = String(str ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isWordToken(token) {
  // ASCII-focused (TOEIC is English). Avoids `\p{..}` which can break in some builds.
  return /^[A-Za-z0-9]+(?:[’'\-][A-Za-z0-9]+)*$/.test(token);
}

export function tokenizeText(text) {
  const raw = String(text ?? "");
  // Split while keeping separators (spaces/punct) as tokens
  const splitTokens = raw
    // Keep English contractions as one token: I'm, I'll, don't, we're...
    // Also keep hyphenated words together: state-of-the-art
    .split(/(\s+|[^A-Za-z0-9’'\-\s]+)/g)
    .filter((t) => t !== "");

  // Merge time-like tokens: "3:30", "12:05", "1:02:03" should be treated as a single token.
  // After split, ":" is usually its own token, so we stitch number ":" number (repeatable).
  const merged = [];
  for (let i = 0; i < splitTokens.length; i++) {
    const cur = splitTokens[i];
    if (!/^\d+$/.test(cur)) {
      merged.push(cur);
      continue;
    }

    let acc = cur;
    let j = i;
    while (
      splitTokens[j + 1] === ":" &&
      typeof splitTokens[j + 2] === "string" &&
      /^\d+$/.test(splitTokens[j + 2])
    ) {
      acc = `${acc}:${splitTokens[j + 2]}`;
      j += 2;
    }

    merged.push(acc);
    i = j;
  }

  return merged;
}

export function buildCloze(text, ratio, seedKey) {
  const tokens = tokenizeText(text);
  const seed = String(seedKey ?? "");
  const wordIndexes = [];
  for (let i = 0; i < tokens.length; i++) {
    if (isWordToken(tokens[i])) wordIndexes.push(i);
  }

  const r = Math.max(0, Math.min(1, Number(ratio) || 0));
  const hideCount = Math.max(0, Math.min(wordIndexes.length, Math.round(wordIndexes.length * r)));

  const rng = mulberry32(hashString(`${seedKey ?? ""}::${text ?? ""}::${hideCount}`));

  // Fisher–Yates shuffle indexes deterministically
  const shuffled = [...wordIndexes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const hiddenSet = new Set(shuffled.slice(0, hideCount));

  const cloze = tokens.map((t, idx) => ({
    t,
    isWord: isWordToken(t),
    hidden: hiddenSet.has(idx),
    // Must be unique per "line" (option A/B/C/D, passage, transcript...)
    // Otherwise inputs from different lines share the same state keys.
    key: `${seed}::${idx}-${t}`,
  }));

  return { tokens: cloze, hiddenCount: hideCount, wordCount: wordIndexes.length };
}

export function normalizeAnswer(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

