import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, Spin, message } from "antd";
import { getSpeakingExam } from "../../api/api";

const FULL_TEST_SECONDS = 20 * 60;

function getQuestionTiming(partNumber, questionPosition) {
  if (partNumber === 1 && [1, 2].includes(questionPosition)) {
    return { prepare: 45, answer: 45 };
  }
  if (partNumber === 2 && [3, 4].includes(questionPosition)) {
    return { prepare: 45, answer: 30 };
  }
  if (partNumber === 3 && [5, 6, 7].includes(questionPosition)) {
    return { prepare: 3, answer: questionPosition === 7 ? 30 : 15 };
  }
  if (partNumber === 4 && [8, 9, 10].includes(questionPosition)) {
    return { prepare: 3, answer: questionPosition === 10 ? 30 : 15 };
  }
  if (partNumber === 5 && questionPosition === 11) {
    return { prepare: 30, answer: 60 };
  }
  return { prepare: 0, answer: 0 };
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parsePartNumber(partName) {
  const n = Number(String(partName || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sanitizeHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

const DoSpeakingTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const searchParams = new URLSearchParams(location.search);

  const testId = state.testId || searchParams.get("testId");
  const mode = state.mode || searchParams.get("mode") || "practice";
  const isFullTest = mode === "full";
  const partIds =
    state.parts ||
    (searchParams.get("parts")
      ? searchParams
          .get("parts")
          .split(",")
          .map((x) => Number(x.trim()))
      : [1, 2, 3, 4, 5]);

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [fullRemaining, setFullRemaining] = useState(FULL_TEST_SECONDS);
  const [phaseType, setPhaseType] = useState("prepare");
  const [phaseRemaining, setPhaseRemaining] = useState(0);
  const [groupReadDone, setGroupReadDone] = useState({});
  const [finished, setFinished] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [questionNotes, setQuestionNotes] = useState({});

  useEffect(() => {
    const init = async () => {
      if (!testId) {
        message.error("Thiếu thông tin đề Speaking");
        navigate("/speaking-tests");
        return;
      }
      setLoading(true);
      try {
        const res = await getSpeakingExam(testId, partIds);
        setTestData(res?.data || null);
      } catch (error) {
        message.error(error?.message || "Không thể tải đề Speaking");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [testId, navigate, partIds.join(",")]);

  const parts = testData?.partResponses || [];
  const currentPart = parts[currentPartIndex];
  const currentGroup = currentPart?.questionGroupResponses?.[currentGroupIndex];
  const questions = currentGroup?.questionDetailResponses || [];
  const currentQuestion = questions[currentQuestionIndex];
  const partNumber = parsePartNumber(currentPart?.partName);
  const questionPosition = currentQuestion?.position || 0;

  const currentTiming = useMemo(
    () => getQuestionTiming(partNumber, questionPosition),
    [partNumber, questionPosition],
  );

  const moveToNextQuestion = useCallback(() => {
    if (!currentPart) return false;
    const groupList = currentPart.questionGroupResponses || [];
    const questionList = currentGroup?.questionDetailResponses || [];

    if (currentQuestionIndex < questionList.length - 1) {
      setCurrentQuestionIndex((v) => v + 1);
      return true;
    }
    if (currentGroupIndex < groupList.length - 1) {
      setCurrentGroupIndex((v) => v + 1);
      setCurrentQuestionIndex(0);
      return true;
    }
    if (currentPartIndex < parts.length - 1) {
      setCurrentPartIndex((v) => v + 1);
      setCurrentGroupIndex(0);
      setCurrentQuestionIndex(0);
      return true;
    }
    return false;
  }, [
    currentPart,
    currentGroup,
    currentQuestionIndex,
    currentGroupIndex,
    currentPartIndex,
    parts.length,
  ]);

  useEffect(() => {
    if (!isFullTest || !currentGroup) return;
    const groupId = currentGroup.id;
    const mustReadPassage =
      (partNumber === 3 || partNumber === 4) && !!currentGroup.passage;
    const hasRead = !!groupReadDone[groupId];
    if (mustReadPassage && !hasRead && currentQuestionIndex === 0) {
      setPhaseType("read-passage");
      setPhaseRemaining(partNumber === 3 ? 15 : 45);
      return;
    }
    setPhaseType("prepare");
    setPhaseRemaining(currentTiming.prepare);
  }, [
    isFullTest,
    currentGroup,
    currentGroup?.id,
    partNumber,
    currentTiming.prepare,
    groupReadDone,
    currentQuestionIndex,
  ]);

  useEffect(() => {
    if (!isFullTest || finished) return;
    const timer = setInterval(() => {
      setFullRemaining((prev) => {
        if (prev <= 1) {
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullTest, finished]);

  useEffect(() => {
    if (!isFullTest || finished) return;
    const timer = setInterval(() => {
      setPhaseRemaining((prev) => {
        if (prev > 1) return prev - 1;

        if (phaseType === "read-passage") {
          if (currentGroup?.id) {
            setGroupReadDone((old) => ({ ...old, [currentGroup.id]: true }));
          }
          setPhaseType("prepare");
          return currentTiming.prepare;
        }

        if (phaseType === "prepare") {
          setPhaseType("answer");
          return currentTiming.answer;
        }

        const hasNext = moveToNextQuestion();
        if (!hasNext) {
          setFinished(true);
          return 0;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    isFullTest,
    finished,
    phaseType,
    currentTiming.prepare,
    currentTiming.answer,
    moveToNextQuestion,
    currentGroup?.id,
  ]);

  useEffect(() => {
    if (!finished) return;
    Modal.success({
      title: "Hoàn thành bài Speaking",
      content: isFullTest
        ? "Bạn đã hoàn thành full test Speaking."
        : "Bạn đã hoàn thành bài Speaking.",
      okText: "Quay lại chi tiết đề",
      onOk: () => navigate(`/speaking-tests/${testId}`),
    });
  }, [finished, isFullTest, navigate, testId]);

  const canGoPrevious =
    currentPartIndex > 0 || currentGroupIndex > 0 || currentQuestionIndex > 0;

  const handlePrevious = () => {
    if (isFullTest) return;
    if (!currentPart) return;
    const groups = currentPart.questionGroupResponses || [];
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((v) => v - 1);
      return;
    }
    if (currentGroupIndex > 0) {
      const prevGroupIndex = currentGroupIndex - 1;
      const prevQuestions =
        groups[prevGroupIndex]?.questionDetailResponses?.length || 0;
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentQuestionIndex(Math.max(0, prevQuestions - 1));
      return;
    }
    if (currentPartIndex > 0) {
      const prevPartIndex = currentPartIndex - 1;
      const prevGroups = parts[prevPartIndex]?.questionGroupResponses || [];
      const lastGroupIndex = Math.max(0, prevGroups.length - 1);
      const lastQuestionIndex = Math.max(
        0,
        (prevGroups[lastGroupIndex]?.questionDetailResponses?.length || 1) - 1,
      );
      setCurrentPartIndex(prevPartIndex);
      setCurrentGroupIndex(lastGroupIndex);
      setCurrentQuestionIndex(lastQuestionIndex);
    }
  };

  const handleNext = () => {
    if (isFullTest) return;
    const hasNext = moveToNextQuestion();
    if (!hasNext) setFinished(true);
  };

  const currentQuestionNote = currentQuestion?.id
    ? questionNotes[currentQuestion.id] || ""
    : "";

  if (loading) {
    return <Spin fullscreen tip="Đang tải đề Speaking..." />;
  }

  if (!testData || !currentPart || !currentGroup || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Không tìm thấy đề Speaking</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {testData.testName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentPart.partName} · Câu {currentQuestion.position}
              </p>
            </div>
            <div className="text-right">
              {isFullTest ? (
                <>
                  <div className="text-xs text-gray-500">Thời gian full test</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatTime(fullRemaining)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">
                  Luyện tập: không áp dụng timer Speaking
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          {currentGroup.passage ? (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-sm font-medium text-amber-800 mb-2">
                Passage
              </div>
              <div
                className="text-gray-800 prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(currentGroup.passage),
                }}
              />
            </div>
          ) : null}

          {currentGroup.imageUrl ? (
            <div className="mb-4">
              <img
                src={currentGroup.imageUrl}
                alt="Speaking question"
                className="max-h-80 rounded-lg border"
              />
            </div>
          ) : null}

          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Question {currentQuestion.position}
          </h2>
          <p className="text-gray-800 whitespace-pre-wrap">{currentQuestion.content}</p>

          {isFullTest ? (
            <div className="mt-5 p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="text-sm text-blue-800">
                {phaseType === "read-passage" && "Đang đọc passage"}
                {phaseType === "prepare" && "Thời gian chuẩn bị"}
                {phaseType === "answer" && "Thời gian trả lời"}
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {formatTime(phaseRemaining)}
              </div>
            </div>
          ) : null}

          <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowNoteEditor((prev) => !prev)}
                className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                Viết ghi chú / dàn ý
              </button>
            </div>

            {showNoteEditor ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú cho câu {currentQuestion.position}
                </label>
                <textarea
                  value={currentQuestionNote}
                  onChange={(e) =>
                    setQuestionNotes((prev) => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value,
                    }))
                  }
                  placeholder="Viết ý chính, từ vựng, cấu trúc câu trả lời..."
                  className="w-full min-h-[120px] rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            ) : null}

            <div className="text-sm font-medium text-gray-700 mb-2">Recording</div>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-800 text-white opacity-60 cursor-not-allowed"
              disabled
            >
              Record (coming soon)
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious || isFullTest}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
          >
            Câu trước
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isFullTest}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            Câu tiếp
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoSpeakingTest;
