import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, message } from "antd";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpeakerWaveIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";   
import { callFetchFlashcardReview } from "../../api/api";

const FlashcardSentencePracticePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [evaluating, setEvaluating] = useState(false);

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

  const handlePlayAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNext = () => {
    setShowExample(false);
    setSentence("");
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const handleEvaluate = () => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      message.warning("Vui lòng nhập câu của bạn.");
      return;
    }
    setEvaluating(true);
    // TODO: gọi API AI đánh giá câu khi backend sẵn sàng
    message.info(
      'Tính năng đánh giá bằng AI đang được phát triển. Câu của bạn: "' +
        trimmed +
        '"',
      4,
    );
    setTimeout(() => setEvaluating(false), 500);
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
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <span className="text-gray-600 font-medium">
            {currentIndex + 1} / {total}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= total - 1}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ArrowRightIcon className="w-6 h-6" />
          </button>
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

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-70 transition"
          >
            <SparklesIcon className="w-5 h-5" />
            Đánh giá
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardSentencePracticePage;
