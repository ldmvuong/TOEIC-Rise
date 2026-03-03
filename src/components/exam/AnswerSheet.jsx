import { useEffect, useState } from 'react';
import { getUserTestAnswersOverall, getWrongAnswerExam } from '../../api/api';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import AnswerQuestion from '../client/modal/AnswerQuestion';
import ChatQuestion from '../client/modal/ChatQuestion';
import ReportQuestion from '../client/modal/ReportQuestion';

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
    const navigate = useNavigate();

    useEffect(() => {
        if (!userTestId) {
            setHasFetched(true);
            return;
        }

        const fetchAnswers = async () => {
            try {
                const response = await getUserTestAnswersOverall(userTestId);
                setAnswersData(response.data || {});
            } catch (error) {
                console.error('Error fetching answers:', error);
                message.error('Không thể tải đáp án');
            } finally {
                setHasFetched(true);
            }
        };

        fetchAnswers();
    }, [userTestId]);

    // Helper function to determine question status
    const getQuestionStatus = (question) => {
        if (!question.userAnswer || question.userAnswer === '') {
            return 'skipped'; // Chưa trả lời
        }
        if (question.userAnswer === question.correctAnswer) {
            return 'correct'; // Đúng
        }
        return 'incorrect'; // Sai
    };

    // Render question answer display with clear structure
    const renderQuestionAnswer = (question) => {
        const status = getQuestionStatus(question);
        const userAnswer = question.userAnswer || '';
        const correctAnswer = question.correctAnswer;

        return (
            <div className="flex items-center gap-2 flex-wrap">
                {/* Đáp án đúng */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 font-medium">Đáp án:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-semibold text-xs min-w-[28px] text-center">
                        {correctAnswer}
                    </span>
                </div>

                {/* Separator */}
                <span className="text-gray-300">|</span>

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
                    {status === 'skipped' && (
                        <span className="text-base text-gray-400 font-bold">—</span>
                    )}
                </div>
            </div>
        );
    };

    // Only show "no data" message after fetch is complete
    if (hasFetched && (!answersData || Object.keys(answersData).length === 0)) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-12 text-gray-500">
                    Không có dữ liệu đáp án
                </div>
            </div>
        );
    }
    
    // Don't render anything while fetching
    if (!hasFetched || !answersData || Object.keys(answersData).length === 0) {
        return null;
    }

    // Sort parts in order: Part 1, Part 2, ..., Part 7
    const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
    const sortedParts = Object.keys(answersData).sort((a, b) => {
        const indexA = partOrder.indexOf(a);
        const indexB = partOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handleViewDetails = () => {
        // Navigate to detailed answer view
        if (userTestId) {
            navigate(`/test-result-detail/${userTestId}`);
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

            navigate('/do-test', {
                state: {
                    mode: 'wrong',
                    testId: wrongExam.id,
                    preloadedTestData: wrongExam
                }
            });
        } catch (error) {
            console.error('Error fetching wrong answers exam:', error);
            message.error(error?.response?.data?.message || 'Không thể tải danh sách câu sai');
        } finally {
            setIsRedoWrongLoading(false);
        }
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
            <button
              onClick={handleRedoWrongAnswers}
              disabled={isRedoWrongLoading}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === "detailed"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {isRedoWrongLoading ? "Đang tải..." : "Làm lại các câu sai"}
            </button>
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

              // Determine part number for grouping
              const partNumber = parseInt(partName.replace("Part ", ""));
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
                              key={question.userAnswerId}
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
                                  {renderQuestionAnswer(question)}
                                </div>

                                {/* Detail Button */}
                                <button
                                  onClick={() => {
                                    setSelectedQuestionId(
                                      question.userAnswerId,
                                    );
                                    setIsAnswerModalOpen(true);
                                  }}
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
                              key={question.userAnswerId}
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
                                  {renderQuestionAnswer(question)}
                                </div>

                                {/* Detail Button */}
                                <button
                                  onClick={() => {
                                    setSelectedQuestionId(
                                      question.userAnswerId,
                                    );
                                    setIsAnswerModalOpen(true);
                                  }}
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
      </div>
    );
};

export default AnswerSheet;

