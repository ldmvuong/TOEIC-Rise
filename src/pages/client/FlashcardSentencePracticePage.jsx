import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, message } from "antd";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import {
  callFetchFlashcardReview,
  evaluateFlashcardSentenceStream,
} from "../../api/api";

const normalizePronunciation = (value) =>
  String(value || "").replace(/^\/+|\/+$/g, "").trim();

const FlashcardSentencePracticePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [sentenceError, setSentenceError] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationText, setEvaluationText] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchReview = async () => {
      setLoading(true);
      try {
        const res = await callFetchFlashcardReview(id);
        const data = res?.data;
        const list = Array.isArray(data) ? data : (data?.result ?? []);
        setItems(list);
        setCurrentIndex(0);
        setSentence("");
        setSentenceError("");
      } catch (err) {
        message.error(err?.message || "Unable to load practice data");
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id]);

  const currentItem = items[currentIndex] ?? null;
  const total = items.length;
  const vocabulary = currentItem?.vocabulary || currentItem?.word || "";
  const pronunciation = currentItem?.pronunciation || "";
  const definition = currentItem?.definition || "";
  const audioUrl = currentItem?.audioUrl || null;

  const evaluationSections = useMemo(() => {
    const text = (evaluationText ?? "").replace(/\r\n/g, "\n").trim();
    if (!text) return null;

    const formatParsedObject = (obj) => {
      if (!obj || typeof obj !== "object") return null;

      const suggestionText = (obj.suggestion ?? "").toString().trim();
      const improveText = (obj.improvement ?? "").toString().trim();
      const commentText = (obj.remark ?? "").toString().trim();
      const score =
        obj.score !== undefined && obj.score !== null
          ? Number(obj.score)
          : null;

      const improvements = improveText
        ? improveText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .flatMap((l) => l.split("•").map((x) => x.trim()))
            .map((l) => l.replace(/^[-*•]\s+/, ""))
            .filter(Boolean)
        : [];

      return {
        score: Number.isFinite(score) ? score : null,
        suggestionText,
        improvements,
        commentText,
      };
    };

    const tryParseMarkdownFence = () => {
      const fence =
        text.match(/```json\s*([\s\S]*?)\s*```/i) ||
        text.match(/```\s*([\s\S]*?)\s*```/);
      if (!fence?.[1]) return null;
      try {
        return formatParsedObject(JSON.parse(fence[1].trim()));
      } catch {
        return null;
      }
    };

    const tryParseDirectJson = () => {
      // Tìm vị trí dấu { đầu tiên và dấu } cuối cùng để tránh tạp chất văn bản bên ngoài nếu có
      const startIdx = text.indexOf("{");
      const endIdx = text.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonRaw = text.slice(startIdx, endIdx + 1);
        try {
          return formatParsedObject(JSON.parse(jsonRaw));
        } catch {
          return null;
        }
      }
      return null;
    };

    const parsedMarkdown = tryParseMarkdownFence();
    if (parsedMarkdown) return parsedMarkdown;

    const parsedDirect = tryParseDirectJson();
    if (parsedDirect) return parsedDirect;

    const findIndex = (re) => {
      const m = text.match(re);
      return m ? m.index : -1;
    };

    const idxSuggestion = findIndex(/(^|\n)\s*Suggestion\s*:/i);
    const idxImprove = findIndex(/(^|\n)\s*(?:CẢI\s*THIỆN|CAI\s*THIEN)\s*:/i);
    const idxComment = findIndex(/(^|\n)\s*(?:NHẬN\s*XÉT|NHAN\s*XET)\s*:/i);

    const sliceSection = (startIdx, endIdx) => {
      if (startIdx < 0) return "";
      const raw = text.slice(startIdx, endIdx < 0 ? undefined : endIdx);
      return raw.trim();
    };

    const suggestionRaw = sliceSection(
      idxSuggestion,
      [idxImprove, idxComment].filter((x) => x >= 0).sort((a, b) => a - b)[0] ??
        -1,
    );
    const improveRaw = sliceSection(
      idxImprove,
      [idxComment].filter((x) => x >= 0).sort((a, b) => a - b)[0] ?? -1,
    );
    const commentRaw = sliceSection(idxComment, -1);

    const extractAfterLabel = (raw, labelRe) => {
      const m = raw.match(labelRe);
      if (!m) return raw.trim();
      return raw.slice((m.index ?? 0) + m[0].length).trim();
    };

    const suggestionText = extractAfterLabel(
      suggestionRaw,
      /Suggestion\s*:\s*/i,
    );
    const improveText = extractAfterLabel(
      improveRaw,
      /(?:CẢI\s*THIỆN|CAI\s*THIEN)\s*:\s*/i,
    );
    const commentText = extractAfterLabel(
      commentRaw,
      /(?:NHẬN\s*XÉT|NHAN\s*XET)\s*:\s*/i,
    );

    const improvements = improveText
      ? improveText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => l.replace(/^[-*•]\s+/, ""))
          .filter(Boolean)
      : [];

    return {
      score: null,
      suggestionText,
      improvements,
      commentText,
    };
  }, [evaluationText]);

  const handlePlayAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNext = () => {
    setEvaluating(false);
    setSentence("");
    setSentenceError("");
    setEvaluationText("");
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setEvaluating(false);
    setSentence("");
    setSentenceError("");
    setEvaluationText("");
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleEvaluate = () => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      setSentenceError("Please enter your sentence.");
      return;
    }
    setSentenceError("");
    setEvaluating(true);
    setEvaluationText("");

    evaluateFlashcardSentenceStream(
      { sentence: trimmed, keyword: vocabulary },
      {
        onChunk: (chunk) => {
          setEvaluationText((prev) => prev + chunk);
        },
        onDone: () => {
          setEvaluating(false);
        },
        onError: (err) => {
          setEvaluating(false);
          message.error(
            err?.message ||
              "Unable to evaluate the sentence. Please try again.",
          );
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">
          <p className="mb-4">
            No vocabulary terms available for sentence practice.
          </p>
          <button
            onClick={() => navigate(`/flashcards/${id}`)}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            Back to flashcard set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-5rem)] bg-gray-50 text-gray-900 flex flex-col overflow-hidden">
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {/* Header */}
      <div className="flex-shrink-0 grid grid-cols-3 items-center px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(`/flashcards/${id}`)}
          className="justify-self-start p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition inline-flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="justify-self-center text-sm font-medium text-gray-600">
          {currentIndex + 1} / {total}
        </span>
        <span />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
        <div className="max-w-2xl mx-auto w-full">
          <p className="text-gray-700 font-medium mb-5">
            Create a complete sentence using the following vocabulary:
          </p>

          <div className="mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                {vocabulary || "—"}
              </span>
              {audioUrl && (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 transition shrink-0"
                  aria-label="Play pronunciation"
                >
                  <SpeakerWaveIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {pronunciation && (
              <p className="text-gray-500 text-sm mt-1">
                /{normalizePronunciation(pronunciation)}/
              </p>
            )}
            {definition && (
              <p className="text-gray-800 mt-2">{definition}</p>
            )}
          </div>

          <textarea
            value={sentence}
            onChange={(e) => {
              setSentence(e.target.value);
              if (sentenceError) setSentenceError("");
            }}
            placeholder="Enter your sentence here..."
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border bg-white focus:ring-2 outline-none transition text-gray-900 placeholder-gray-400 resize-none ${
              sentenceError
                ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                : "border-gray-300 focus:border-teal-500 focus:ring-teal-200"
            }`}
          />
          {sentenceError && (
            <p className="text-sm text-red-600 mt-2">{sentenceError}</p>
          )}

          {(evaluating || !!evaluationText) && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-gray-800">
                  Evaluation result
                </p>
                {evaluating && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Spin size="small" />
                    <span>Evaluating...</span>
                  </div>
                )}
              </div>

              {!evaluationSections ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-gray-600">
                  <div className="flex items-center gap-3">
                    <Spin />
                    <span>Receiving results from the system...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!!evaluationSections.suggestionText && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        Suggestion:&nbsp;
                      </span>
                      <span className="text-gray-900">
                        {evaluationSections.suggestionText}
                      </span>
                      {vocabulary &&
                        new RegExp(
                          `\\(\\s*${vocabulary.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\)`,
                          "i",
                        ).test(evaluationSections.suggestionText) && (
                          <span className="ml-1 text-red-500 line-through">
                            ({vocabulary})
                          </span>
                        )}
                    </div>
                  )}

                  {!!evaluationSections.improvements?.length && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <WrenchScrewdriverIcon className="w-5 h-5 text-gray-500" />
                        <p className="text-xs font-semibold tracking-wide text-gray-600">
                          IMPROVEMENTS:
                        </p>
                      </div>
                      <ul className="list-disc pl-5 space-y-2 text-gray-800">
                        {evaluationSections.improvements.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!evaluationSections.commentText && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-500" />
                        <p className="text-xs font-semibold tracking-wide text-gray-600">
                          COMMENTS:
                        </p>
                      </div>
                      <p className="whitespace-pre-wrap text-gray-800">
                        {evaluationSections.commentText}
                      </p>
                    </div>
                  )}

                  {!evaluationSections.suggestionText &&
                    !evaluationSections.improvements?.length &&
                    !evaluationSections.commentText && (
                      <p className="whitespace-pre-wrap text-gray-900">
                        {evaluationText}
                      </p>
                    )}

                  {evaluationSections.score !== null && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-950">Score:</span>
                      <span className="px-2.5 py-0.5 bg-teal-100 text-teal-700 rounded-full font-bold text-sm">
                        {evaluationSections.score} / 10
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-70 transition shadow-sm"
          >
            <SparklesIcon className="w-5 h-5" />
            {evaluating ? "Evaluating..." : "Evaluate"}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= total - 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardSentencePracticePage;
