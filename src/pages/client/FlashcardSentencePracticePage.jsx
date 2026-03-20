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

const FlashcardSentencePracticePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentence, setSentence] = useState("");
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
      } catch (err) {
        message.error(err?.message || "Không thể tải dữ liệu luyện tập");
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

    const tryParseJsonFromMarkdownFence = () => {
      // Match ```json ... ``` (or ``` ... ```)
      const fence =
        text.match(/```json\s*([\s\S]*?)\s*```/i) ||
        text.match(/```\s*([\s\S]*?)\s*```/);
      if (!fence?.[1]) return null;
      const raw = fence[1].trim();
      try {
        const obj = JSON.parse(raw);
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
      } catch {
        return null;
      }
    };

    const parsedJson = tryParseJsonFromMarkdownFence();
    if (parsedJson) return parsedJson;

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

    const suggestionText = extractAfterLabel(suggestionRaw, /Suggestion\s*:\s*/i);
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
    setEvaluationText("");
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setEvaluating(false);
    setSentence("");
    setEvaluationText("");
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleEvaluate = () => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      message.warning("Vui lòng nhập câu của bạn.");
      return;
    }
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
          message.error(err?.message || "Không thể đánh giá câu. Vui lòng thử lại.");
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
          <p className="mb-4">Chưa có từ vựng để luyện câu.</p>
          <button
            onClick={() => navigate(`/flashcards/${id}`)}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            Quay lại bộ thẻ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
        {/* Header: Back | 1/25 | Next */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/flashcards/${id}`)}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition inline-flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-6 h-6" />
              <span className="hidden sm:inline">Quay lại</span>
          </button>
          <span className="text-gray-600 font-medium">
            {currentIndex + 1} / {total}
          </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
              >
                <span className="hidden sm:inline">Trước</span>
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= total - 1}
                className="px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
              >
                <span className="hidden sm:inline">Sau</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
        </div>

        {/* Instruction */}
        <p className="text-gray-800 font-medium mb-4">
          Tạo một câu hoàn chỉnh sử dụng từ vựng sau:
        </p>

        {/* Vocabulary + pronunciation + meaning */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              {vocabulary || "—"}
            </span>
            {audioUrl && (
              <button
                type="button"
                onClick={handlePlayAudio}
                className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition flex-shrink-0"
              >
                <SpeakerWaveIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          {pronunciation && (
            <p className="text-gray-500 italic text-sm mt-1">
              /{pronunciation}/
            </p>
          )}
          {definition && <p className="text-gray-800 mt-2">{definition}</p>}
        </div>

        {/* Input */}
        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="Nhập câu của bạn tại đây..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border-2 border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition text-gray-900 placeholder-gray-400 resize-y mb-6"
        />

        {(evaluating || !!evaluationText) && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-gray-800">
                Kết quả đánh giá
              </p>
              {evaluating && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Spin size="small" />
                  <span>Đang đánh giá...</span>
                </div>
              )}
            </div>

            {!evaluationSections ? (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-gray-600">
                <div className="flex items-center gap-3">
                  <Spin />
                  <span>Đang nhận kết quả từ hệ thống...</span>
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
                        CẢI THIỆN:
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
                        NHẬN XÉT:
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
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          {!evaluationText && (
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-70 transition"
            >
              <SparklesIcon className="w-5 h-5" />
              {evaluating ? "Đang đánh giá..." : "Đánh giá"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardSentencePracticePage;
