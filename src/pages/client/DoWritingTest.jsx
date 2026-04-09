import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, Spin, message } from "antd";
import { getWritingExam, submitWritingTestExam } from "../../api/api";

const FULL_TEST_SECONDS = 60 * 60;
const PART_TIME_LIMIT_SECONDS = {
  1: 8 * 60,
  2: 20 * 60,
  3: 30 * 60,
};

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

const DoWritingTest = () => {
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
      : [1, 2, 3]);

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [fullRemaining, setFullRemaining] = useState(FULL_TEST_SECONDS);
  const [partRemaining, setPartRemaining] = useState(0);
  const [partStartDone, setPartStartDone] = useState(false);
  const [finished, setFinished] = useState(false);

  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [questionNotes, setQuestionNotes] = useState({});
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (!testId) {
        message.error("Thiếu thông tin đề Writing");
        navigate("/writing-tests");
        return;
      }
      setLoading(true);
      try {
        const res = await getWritingExam(testId, partIds);
        setTestData(res?.data || null);
      } catch (error) {
        message.error(error?.message || "Không thể tải đề Writing");
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
  const currentPartNumber = parsePartNumber(currentPart?.partName);
  const canSwapWithinPart = isFullTest && (currentPartNumber === 1 || currentPartNumber === 2);

  const currentPartQuestionMap = useMemo(() => {
    if (!currentPart) return [];
    const groups = currentPart.questionGroupResponses || [];
    return groups.flatMap((group, gIdx) =>
      (group.questionDetailResponses || []).map((q, qIdx) => ({
        id: q.id,
        position: q.position,
        groupIndex: gIdx,
        questionIndex: qIdx,
      })),
    );
  }, [currentPart]);

  const hasNextQuestion = useMemo(() => {
    if (!currentPart || !currentGroup) return false;
    const groups = currentPart.questionGroupResponses || [];
    if (currentQuestionIndex < questions.length - 1) return true;
    if (currentGroupIndex < groups.length - 1) return true;
    return currentPartIndex < parts.length - 1;
  }, [
    currentPart,
    currentGroup,
    currentQuestionIndex,
    currentGroupIndex,
    questions.length,
    currentPartIndex,
    parts.length,
  ]);

  const moveToNextQuestion = useCallback(() => {
    if (!currentPart || !currentGroup) return false;
    const groupList = currentPart.questionGroupResponses || [];

    if (currentQuestionIndex < questions.length - 1) {
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
      setPartStartDone(false);
      return true;
    }
    return false;
  }, [
    currentPart,
    currentGroup,
    currentQuestionIndex,
    currentGroupIndex,
    questions.length,
    currentPartIndex,
    parts.length,
  ]);

  useEffect(() => {
    if (!isFullTest || !currentPart) return;
    if (partStartDone) return;
    setPartRemaining(PART_TIME_LIMIT_SECONDS[currentPartNumber] || 0);
    setPartStartDone(true);
  }, [isFullTest, currentPart, currentPartNumber, partStartDone]);

  useEffect(() => {
    if (!isFullTest || finished || isSubmitted) return;
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
  }, [isFullTest, finished, isSubmitted]);

  useEffect(() => {
    if (!isFullTest || finished || isSubmitted || !partStartDone) return;
    const timer = setInterval(() => {
      setPartRemaining((prev) => {
        if (prev > 1) return prev - 1;
        if (currentPartIndex < parts.length - 1) {
          setCurrentPartIndex((v) => v + 1);
          setCurrentGroupIndex(0);
          setCurrentQuestionIndex(0);
          setPartStartDone(false);
          return 0;
        }
        setFinished(true);
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullTest, finished, isSubmitted, partStartDone, currentPartIndex, parts.length]);

  const submitWriting = useCallback(async () => {
    if (!testData || !testId || isSubmitting || isSubmitted) return;

    const allAnswers = [];
    testData.partResponses.forEach((part) => {
      part.questionGroupResponses.forEach((group) => {
        group.questionDetailResponses.forEach((q) => {
          allAnswers.push({
            questionId: q.id,
            answerText: questionAnswers[q.id] || "",
          });
        });
      });
    });

    const payload = {
      testId: Number(testId),
      timeSpent: isFullTest ? FULL_TEST_SECONDS - fullRemaining : 1,
      parts: isFullTest ? null : testData.partResponses.map((p) => p.partName),
      answers: allAnswers,
    };

    try {
      setIsSubmitting(true);
      const res = await submitWritingTestExam(payload);
      if (res?.data) {
        setIsSubmitted(true);
        setTestResult(res.data);
      }
    } catch (error) {
      message.error(
        error?.response?.data?.message || error?.message || "Không thể nộp bài Writing",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    testData,
    testId,
    isSubmitting,
    isSubmitted,
    questionAnswers,
    isFullTest,
    fullRemaining,
  ]);

  useEffect(() => {
    if (!finished || isSubmitted) return;
    submitWriting();
  }, [finished, isSubmitted, submitWriting]);

  const canGoPrevious =
    currentPartIndex > 0 || currentGroupIndex > 0 || currentQuestionIndex > 0;

  const handlePrevious = () => {
    if (isFullTest || !currentPart) return;
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
    const ok = moveToNextQuestion();
    if (!ok) setFinished(true);
  };

  const currentQuestionNote = currentQuestion?.id
    ? questionNotes[currentQuestion.id] || ""
    : "";
  const currentQuestionAnswer = currentQuestion?.id
    ? questionAnswers[currentQuestion.id] || ""
    : "";

  if (loading) {
    return <Spin fullscreen tip="Đang tải đề Writing..." />;
  }

  if (!testData || !currentPart || !currentGroup || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Không tìm thấy đề Writing</div>
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
            <div className="text-right space-y-1">
              {isFullTest ? (
                <>
                  <div className="text-xs text-gray-500">Thời gian full test</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatTime(fullRemaining)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Thời gian phần hiện tại
                  </div>
                  <div className="text-lg font-semibold text-blue-700">
                    {formatTime(partRemaining)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">
                  Luyện tập: không áp dụng timer Writing
                </div>
              )}
            </div>
          </div>
          {canSwapWithinPart ? (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-600 mb-2">
                Chọn nhanh câu hỏi trong {currentPart.partName}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentPartQuestionMap.map((item) => {
                  const isActive =
                    item.groupIndex === currentGroupIndex &&
                    item.questionIndex === currentQuestionIndex;
                  return (
                    <button
                      key={item.id || `${item.groupIndex}-${item.questionIndex}`}
                      type="button"
                      onClick={() => {
                        setCurrentGroupIndex(item.groupIndex);
                        setCurrentQuestionIndex(item.questionIndex);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        isActive
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      Câu {item.position}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white border rounded-xl p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 min-h-[420px]">
              <div className="text-sm font-medium text-amber-800 mb-2">Passage</div>
              {currentGroup.passage ? (
                <div
                  className="text-gray-800 prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(currentGroup.passage),
                  }}
                />
              ) : (
                <div className="text-gray-500 text-sm italic">
                  Câu này không có passage.
                </div>
              )}
              {currentGroup.imageUrl ? (
                <div className="mt-4">
                  <img
                    src={currentGroup.imageUrl}
                    alt="Writing question"
                    className="max-h-80 rounded-lg border"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 min-h-[420px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Question {currentQuestion.position}
              </h2>
              <p className="text-gray-700 mb-4">
                Hãy viết câu trả lời cho câu hỏi này.
              </p>

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
                    placeholder="Viết dàn ý, từ vựng, cấu trúc bài viết..."
                    className="w-full min-h-[120px] rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              ) : null}

              <div className="text-sm font-medium text-gray-700 mb-2">
                Bài viết của bạn
              </div>
              <textarea
                value={currentQuestionAnswer}
                onChange={(e) =>
                  setQuestionAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: e.target.value,
                  }))
                }
                placeholder="Nhập câu trả lời cho câu hỏi này..."
                className="w-full min-h-[220px] rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
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
            disabled={isFullTest || !hasNextQuestion}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            Câu tiếp
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              Modal.confirm({
                title: "Xác nhận nộp bài",
                content:
                  "Bạn có chắc chắn muốn nộp bài Writing? Sau khi nộp bạn không thể chỉnh sửa.",
                okText: "Nộp bài",
                cancelText: "Tiếp tục làm",
                onOk: () => submitWriting(),
              })
            }
            disabled={isSubmitting || isSubmitted}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Đang nộp..." : isSubmitted ? "Đã nộp" : "Nộp bài"}
          </button>
        </div>
      </div>

      {testResult ? (
        <Modal
          title="Kết quả bài Writing"
          open={!!testResult}
          onOk={() => navigate(`/test-result/${testResult.userTestId}`)}
          onCancel={() => navigate(`/test-result/${testResult.userTestId}`)}
          okText="Xem chi tiết"
          cancelText="Đóng"
          width={600}
          centered
        >
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-gray-700 font-medium">Tổng số câu hỏi:</span>
                <span className="text-lg font-semibold text-blue-600">
                  {testResult.totalQuestions}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="text-gray-700 font-medium">
                  Số câu đã trả lời:
                </span>
                <span className="text-lg font-semibold text-green-600">
                  {testResult.totalAnswers}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-gray-700 font-medium">
                  Thời gian làm bài:
                </span>
                <span className="text-lg font-semibold text-orange-600">
                  {formatTime(testResult.timeSpent)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    {testResult.totalQuestions > 0
                      ? `${Math.round((testResult.totalAnswers / testResult.totalQuestions) * 100)}%`
                      : "0%"}
                  </div>
                  <div className="text-sm text-gray-600">
                    Tỷ lệ câu đã hoàn thành
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default DoWritingTest;
