import { useEffect, useState } from 'react';
import {
    getUserTestAnswersOverall,
    getWrongAnswerExam,
    getDoWrongAnswer,
    viewTestResultDetails,
} from '../../api/api';
import { message, Modal } from 'antd';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import AnswerQuestion from '../client/modal/AnswerQuestion';
import ChatQuestion from '../client/modal/ChatQuestion';
import ReportQuestion from '../client/modal/ReportQuestion';

function isWritingListeningOrSpeakingPartName(partName) {
    return /writing|listening|speaking/i.test(String(partName || ''));
}

function extractPartOrderNumber(partName) {
    const m = String(partName || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Learner answer id for GET /learner/user-answers/{userAnswerId}.
 * Matches TestResultDetail.prepareQuestionData and answers-overall variants.
 */
function resolveUserAnswerIdFromRow(q) {
    if (!q || typeof q !== 'object') return null;
    const direct =
        q.userAnswerId ??
        q.userAnswerID ??
        q.learnerAnswerId ??
        q.learnerAnswerID;
    if (direct != null && direct !== '') return direct;
    const nested =
        q.userAnswer && typeof q.userAnswer === 'object'
            ? q.userAnswer.id ?? q.userAnswer.userAnswerId
            : null;
    if (nested != null && nested !== '') return nested;
    if (q.id != null && q.id !== '') return q.id;
    return null;
}

function normalizeAnswersDataByPart(map) {
    if (!map || typeof map !== 'object') return map;
    const out = {};
    for (const [partName, questions] of Object.entries(map)) {
        if (!Array.isArray(questions)) {
            out[partName] = questions;
            continue;
        }
        out[partName] = questions.map((q) => ({
            ...q,
            userAnswerId: resolveUserAnswerIdFromRow(q),
        }));
    }
    return out;
}

/** Same shape as GET /learner/user-tests/answers-overall/{id} (part → question rows). */
function mapTestDetailToAnswersByPart(detail) {
    const parts = detail?.partResponses;
    if (!Array.isArray(parts) || parts.length === 0) return {};
    const out = {};
    for (const part of parts) {
        const partName = part.partName || 'Part';
        const rows = [];
        for (const group of part.questionGroups || []) {
            for (const q of group.questions || []) {
                rows.push({
                    userAnswerId: resolveUserAnswerIdFromRow(q),
                    position: q.position ?? q.questionPosition,
                    userAnswer: q.userAnswer ?? q.selectedAnswer ?? '',
                    userAnswerText: q.userAnswerText ?? q.userTextAnswer ?? '',
                    userAnswerAudioUrl: q.userAnswerAudioUrl ?? '',
                    correctAnswer: q.correctAnswer ?? q.correctOption ?? null,
                });
            }
        }
        rows.sort(
            (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0),
        );
        if (rows.length > 0) {
            out[partName] = rows;
        }
    }
    return out;
}

const AnswerSheet = ({ userTestId, testId }) => {
    const [answersData, setAnswersData] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [activeView, setActiveView] = useState('answers'); // 'answers', 'detailed'
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatQuestionData, setChatQuestionData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportQuestionData, setReportQuestionData] = useState(null);
    const [isRedoWrongLoading, setIsRedoWrongLoading] = useState(false);
    const [showRedoWrongChoiceModal, setShowRedoWrongChoiceModal] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const skipAnswersForWriting = searchParams.get('writing') === '1';

    useEffect(() => {
        if (!userTestId) {
            setHasFetched(true);
            return;
        }

        if (skipAnswersForWriting) {
            setHasFetched(false);
            setAnswersData(null);
            const fetchWritingFromDetail = async () => {
                try {
                    const response = await viewTestResultDetails(userTestId);
                    const mapped = mapTestDetailToAnswersByPart(response?.data);
                    setAnswersData(
                        mapped && Object.keys(mapped).length > 0 ? mapped : null,
                    );
                } catch (error) {
                    console.error('Error fetching writing test detail:', error);
                    message.error(
                        error?.message ||
                            'Không thể tải chi tiết bài Writing (đáp án).',
                    );
                    setAnswersData(null);
                } finally {
                    setHasFetched(true);
                }
            };
            void fetchWritingFromDetail();
            return;
        }

        const fetchAnswers = async () => {
            try {
                const response = await getUserTestAnswersOverall(userTestId);
                setAnswersData(
                    normalizeAnswersDataByPart(response.data || {}),
                );
            } catch (error) {
                console.error('Error fetching answers:', error);
                message.error('Không thể tải đáp án');
            } finally {
                setHasFetched(true);
            }
        };

        fetchAnswers();
    }, [userTestId, skipAnswersForWriting]);

    // Helper function to determine question status
    const getQuestionStatus = (question) => {
        const hasChoiceAnswer =
            question.userAnswer != null && String(question.userAnswer).trim() !== '';
        const hasTextAnswer =
            question.userAnswerText != null && String(question.userAnswerText).trim() !== '';
        const hasAudioAnswer =
            question.userAnswerAudioUrl != null &&
            String(question.userAnswerAudioUrl).trim() !== '';

        if (!hasChoiceAnswer && !hasTextAnswer && !hasAudioAnswer) {
            return 'skipped'; // Chưa trả lời
        }
        if (hasAudioAnswer) {
            return 'answered'; // Đã nộp file âm thanh (Speaking)
        }
        if (hasTextAnswer && !question.correctAnswer) {
            return 'answered'; // Đã trả lời dạng text (writing)
        }
        if (hasChoiceAnswer && question.userAnswer === question.correctAnswer) {
            return 'correct'; // Đúng
        }
        return 'incorrect'; // Sai
    };

    // Render question answer display with clear structure
    const renderQuestionAnswer = (question, partName) => {
        const status = getQuestionStatus(question);
        const userAnswer = question.userAnswer || '';
        const userAnswerText = question.userAnswerText || '';
        const userAnswerAudioUrl = question.userAnswerAudioUrl || '';
        const correctAnswer = question.correctAnswer;
        const hasTextAnswer = String(userAnswerText).trim() !== '';
        const hasAudioAnswer = String(userAnswerAudioUrl).trim() !== '';
        const hideCorrectKey = isWritingListeningOrSpeakingPartName(partName);

        if (hasAudioAnswer) {
            return (
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 font-medium">Bản ghi:</span>
                        <span className="text-xs text-emerald-700 font-semibold">Đã nộp</span>
                    </div>
                    <audio
                        controls
                        src={userAnswerAudioUrl}
                        className="w-full max-h-9"
                        preload="metadata"
                    />
                </div>
            );
        }

        if (hasTextAnswer) {
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 font-medium">Câu trả lời:</span>
                        <span className="text-xs text-emerald-700 font-semibold">Đã nhập</span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                        {userAnswerText}
                    </p>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 flex-wrap">
                {!hideCorrectKey && (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 font-medium">Đáp án:</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-semibold text-xs min-w-[28px] text-center">
                                {correctAnswer}
                            </span>
                        </div>
                        <span className="text-gray-300">|</span>
                    </>
                )}

                {/* Câu trả lời của bạn */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 font-medium">Của bạn:</span>
                    {status === 'skipped' ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">
                            Chưa trả lời
                        </span>
                    ) : (
                        <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-xs min-w-[28px] text-center ${
                                status === 'correct'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                            }`}
                        >
                            {userAnswer}
                        </span>
                    )}
                </div>

                {/* Status Icon */}
                <div className="flex items-center">
                    {status === 'correct' && (
                        <span className="text-lg text-green-600 font-bold">✓</span>
                    )}
                    {status === 'incorrect' && (
                        <span className="text-lg text-red-600 font-bold">✗</span>
                    )}
                    {status === 'answered' && (
                        <span className="text-base text-emerald-600 font-bold">●</span>
                    )}
                    {status === 'skipped' && (
                        <span className="text-base text-gray-400 font-bold">—</span>
                    )}
                </div>
            </div>
        );
    };

    if (skipAnswersForWriting && !hasFetched) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-12 text-gray-500">
                    Đang tải đáp án Writing...
                </div>
            </div>
        );
    }

    // Only show "no data" message after fetch is complete
    if (hasFetched && (!answersData || Object.keys(answersData).length === 0)) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-12 text-gray-500">
                    {skipAnswersForWriting
                        ? 'Không có dữ liệu chi tiết bài Writing. Bạn vẫn có thể xem thống kê phía trên hoặc mở trang chi tiết đáp án.'
                        : 'Không có dữ liệu đáp án'}
                </div>
            </div>
        );
    }
    
    // Don't render anything while fetching
    if (!hasFetched || !answersData || Object.keys(answersData).length === 0) {
        return null;
    }

    const partKeys = Object.keys(answersData);
    const needsWritingListeningSort = partKeys.some((k) =>
        isWritingListeningOrSpeakingPartName(k),
    );
    const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
    const sortedParts = needsWritingListeningSort
        ? [...partKeys].sort((a, b) => {
              const na = extractPartOrderNumber(a);
              const nb = extractPartOrderNumber(b);
              if (na !== nb) return na - nb;
              return String(a).localeCompare(String(b), 'vi');
          })
        : [...partKeys].sort((a, b) => {
              const indexA = partOrder.indexOf(a);
              const indexB = partOrder.indexOf(b);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
          });

    const hideRedoWrong = partKeys.some((k) =>
        isWritingListeningOrSpeakingPartName(k),
    );

    const openAnswerDetailModal = (question) => {
        const id = resolveUserAnswerIdFromRow(question);
        if (id == null || id === '') {
            message.warning(
                'Không tìm thấy mã câu trả lời để xem chi tiết.',
            );
            return;
        }
        setSelectedQuestionId(id);
        setIsAnswerModalOpen(true);
    };

    const handleViewDetails = () => {
        if (userTestId) {
            navigate(
                `/test-result-detail/${userTestId}${location.search || ''}`,
            );
        } else {
            message.error('Không tìm thấy ID bài thi');
        }
    };

    const handleRedoWrongAnswers = async () => {
        if (!userTestId) {
            message.error('Không tìm thấy ID bài thi');
            return;
        }

        setIsRedoWrongLoading(true);
        try {
            const res = await getWrongAnswerExam(userTestId);
            const wrongExam = res?.data;

            if (!wrongExam?.partResponses?.length) {
                message.info('Bạn không có câu sai để làm lại.');
                return;
            }

            setShowRedoWrongChoiceModal(false);
            navigate('/do-test', {
                state: {
                    mode: 'wrong',
                    testId: wrongExam.id,
                    preloadedTestData: wrongExam,
                    wrongUserTestId: userTestId
                }
            });
        } catch (error) {
            console.error('Error fetching wrong answers exam:', error);
            message.error(error?.response?.data?.message || 'Không thể tải danh sách câu sai');
        } finally {
            setIsRedoWrongLoading(false);
        }
    };

    const handleFixOneByOne = async () => {
        if (!userTestId) {
            message.error('Không tìm thấy ID bài thi');
            return;
        }

        setIsRedoWrongLoading(true);
        try {
            const res = await getDoWrongAnswer(userTestId);
            const data = res?.data;

            if (!data?.partResponses?.length) {
                message.info('Bạn không có câu sai để sửa từng câu.');
                return;
            }

            setShowRedoWrongChoiceModal(false);
            navigate(`/fix-wrong-one-by-one/${userTestId}`, {
                state: { fixOneByOneData: data }
            });
        } catch (error) {
            console.error('Error fetching do-wrong-answer:', error);
            message.error(error?.response?.data?.message || 'Không thể tải danh sách câu sai');
        } finally {
            setIsRedoWrongLoading(false);
        }
    };

    const openRedoWrongModal = () => {
        if (!userTestId) {
            message.error('Không tìm thấy ID bài thi');
            return;
        }
        setShowRedoWrongChoiceModal(true);
    };


    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setActiveView("answers")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "answers"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Đáp án
            </button>
            <button
              onClick={handleViewDetails}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "detailed"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Xem chi tiết đáp án
            </button>
            {!hideRedoWrong && (
              <button
                onClick={openRedoWrongModal}
                disabled={isRedoWrongLoading}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeView === "detailed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isRedoWrongLoading ? "Đang tải..." : "Làm lại câu sai"}
              </button>
            )}
          </div>
        </div>

        {/* Tips Section */}
        {activeView === "detailed" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="text-sm text-green-800">
                <strong>Tips:</strong> Khi xem chi tiết đáp án, bạn có thể tạo
                và lưu highlight từ vựng, keywords và tạo note để học và tra cứu
                khi có nhu cầu ôn lại đề thi này trong tương lai.
              </div>
            </div>
          </div>
        )}

        {/* Answer Sheet */}
        {activeView === "answers" && (
          <div className="space-y-6">
            {sortedParts.map((partName) => {
              const questions = answersData[partName] || [];
              if (questions.length === 0) return null;

              const questionsPerColumn = Math.ceil(questions.length / 2);

              return (
                <div
                  key={partName}
                  className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {partName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left Column */}
                    <div className="space-y-2">
                      {questions
                        .slice(0, questionsPerColumn)
                        .map((question) => {
                          const status = getQuestionStatus(question);
                          return (
                            <div
                              key={
                                resolveUserAnswerIdFromRow(question) ??
                                `${partName}-${question.position}-l`
                              }
                              className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                                status === "correct"
                                  ? "bg-green-50 border-green-200"
                                  : status === "incorrect"
                                    ? "bg-red-50 border-red-200"
                                    : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {/* Question Number */}
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                  {question.position}
                                </div>

                                {/* Answer Info */}
                                <div className="flex-1 min-w-0">
                                  {renderQuestionAnswer(question, partName)}
                                </div>

                                {/* Detail Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAnswerDetailModal(question)
                                  }
                                  className="flex-shrink-0 text-blue-600 text-xs font-medium hover:text-blue-800 hover:underline whitespace-nowrap"
                                >
                                  Chi tiết
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Right Column */}
                    {questions.length > questionsPerColumn && (
                      <div className="space-y-2">
                        {questions.slice(questionsPerColumn).map((question) => {
                          const status = getQuestionStatus(question);
                          return (
                            <div
                              key={
                                resolveUserAnswerIdFromRow(question) ??
                                `${partName}-${question.position}-r`
                              }
                              className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                                status === "correct"
                                  ? "bg-green-50 border-green-200"
                                  : status === "incorrect"
                                    ? "bg-red-50 border-red-200"
                                    : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {/* Question Number */}
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                  {question.position}
                                </div>

                                {/* Answer Info */}
                                <div className="flex-1 min-w-0">
                                  {renderQuestionAnswer(question, partName)}
                                </div>

                                {/* Detail Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAnswerDetailModal(question)
                                  }
                                  className="flex-shrink-0 text-blue-600 text-xs font-medium hover:text-blue-800 hover:underline whitespace-nowrap"
                                >
                                  Chi tiết
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed View Placeholder */}
        {activeView === "detailed" && (
          <div className="text-center py-12 text-gray-500">
            Tính năng xem chi tiết đáp án đang được phát triển
          </div>
        )}

        {/* Answer Question Modal */}
        <AnswerQuestion
          open={isAnswerModalOpen}
          onClose={() => {
            setIsAnswerModalOpen(false);
            setSelectedQuestionId(null);
          }}
          userAnswerId={selectedQuestionId}
          onReport={(questionData) => {
            setReportQuestionData(questionData);
            setIsReportModalOpen(true);
          }}
          onChatAI={(questionData) => {
            setChatQuestionData(questionData);
            setIsChatModalOpen(true);
          }}
        />

        {/* Chat Question Modal */}
        <ChatQuestion
          open={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setChatQuestionData(null);
          }}
          questionData={chatQuestionData}
        />

        {/* Report Question Modal */}
        <ReportQuestion
          open={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportQuestionData(null);
          }}
          questionData={reportQuestionData}
        />

        {!hideRedoWrong && (
          <Modal
            title="Làm lại câu sai"
            open={showRedoWrongChoiceModal}
            onCancel={() => setShowRedoWrongChoiceModal(false)}
            footer={null}
            centered
            width={420}
          >
            <div className="pt-1 pb-2">
              <p className="text-sm text-gray-600 mb-4">
                Chọn cách hiển thị đáp án khi làm lại các câu sai.
              </p>

              <div className="space-y-3">
              <button
                type="button"
                onClick={handleFixOneByOne}
                disabled={isRedoWrongLoading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isRedoWrongLoading ? 'Đang tải...' : 'Hiển thị đáp án ngay'}
              </button>
              <button
                type="button"
                onClick={handleRedoWrongAnswers}
                disabled={isRedoWrongLoading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Hiển thị đáp án sau khi hoàn thành
              </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
};

export default AnswerSheet;

