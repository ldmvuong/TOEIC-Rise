import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { viewTestResultDetails } from '../../api/api';
import parse from 'html-react-parser';
import AudioPlayerUI from '../../components/client/modal/AudioPlayerUI';
import ImageDisplay from '../../components/exam/ImageDisplay';
import PassageDisplay from '../../components/exam/PassageDisplay';
import ChatQuestion from '../../components/client/modal/ChatQuestion';
import ReportQuestion from '../../components/client/modal/ReportQuestion';

const TestResultDetail = () => {
    const { userTestId } = useParams();
    const navigate = useNavigate();
    const [testData, setTestData] = useState(null);
    const [selectedPartIndex, setSelectedPartIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatQuestionData, setChatQuestionData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportQuestionData, setReportQuestionData] = useState(null);

    useEffect(() => {
        const fetchTestData = async () => {
            if (!userTestId) {
                message.error('Không tìm thấy ID bài thi');
                navigate('/online-tests');
                return;
            }

            setLoading(true);
            try {
                const response = await viewTestResultDetails(userTestId);
                if (response && response.data) {
                    setTestData(response.data);
                }
            } catch (error) {
                console.error('Error fetching test data:', error);
                message.error('Không thể tải dữ liệu bài thi');
            } finally {
                setLoading(false);
            }
        };

        fetchTestData();
    }, [userTestId, navigate]);

    // Get all questions from all parts for sidebar
    const getAllQuestions = () => {
        if (!testData?.partResponses) return [];
        
        const allQuestions = [];
        testData.partResponses.forEach((part) => {
            part.questionGroups?.forEach((group) => {
                group.questions?.forEach((question) => {
                    allQuestions.push({
                        ...question,
                        partName: part.partName,
                        partNumber: parseInt(part.partName.replace('Part ', ''))
                    });
                });
            });
        });
        return allQuestions;
    };

    // Scroll to question
    const scrollToQuestion = (position) => {
        setTimeout(() => {
            const element = document.getElementById(`question-${position}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 200);
    };

    const prepareQuestionData = (question, group, part) => {
        if (!question) return null;

        const normalizedOptions = Array.isArray(question.options)
            ? question.options
            : [];

        return {
            ...question,
            questionContent: question.questionContent || question.content || '',
            options: normalizedOptions,
            audioUrl: question.audioUrl ?? group?.audioUrl ?? null,
            imageUrl: question.imageUrl ?? group?.imageUrl ?? null,
            passage: question.passage ?? group?.passage ?? null,
            transcript: question.transcript ?? group?.transcript ?? null,
            tags: question.tags ?? group?.tags ?? [],
            correctOption: question.correctOption ?? question.correctAnswer ?? null,
            userAnswer: question.userAnswer ?? question.selectedAnswer ?? '',
            explanation: question.explanation ?? group?.explanation ?? null,
            partName: part?.partName ?? question.partName ?? null,
            questionId: question.questionId ?? question.id ?? null,
            userAnswerId:
                question.userAnswerId ??
                question.userAnswerID ??
                question.userAnswer?.id ??
                question.learnerAnswerId ??
                question.learnerAnswerID ??
                null,
        };
    };

    const handleOpenChatModal = (questionData) => {
        if (!questionData) return;
        setChatQuestionData(questionData);
        setIsChatModalOpen(true);
    };

    const handleOpenReportModal = (questionData) => {
        if (!questionData) return;
        setReportQuestionData(questionData);
        setIsReportModalOpen(true);
    };

    const handleCloseChatModal = () => {
        setIsChatModalOpen(false);
        setChatQuestionData(null);
    };

    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
        setReportQuestionData(null);
    };

    // Render question with answer status
    const renderQuestion = (question, partNumber, group, part) => {
        const isPart2 = partNumber === 2;
        const isPart6Or7 = partNumber === 6 || partNumber === 7;
        const maxOptions = isPart2 ? 3 : 4;
        const options = question.options || [];
        const preparedQuestion = prepareQuestionData(question, group, part);

        return (
            <div id={`question-${question.position}`} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
                {/* Question Header */}
                <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {question.position}
                        </div>
                        {question.content && (
                            <div className="flex-1 text-gray-800 text-sm leading-relaxed">
                                {question.content}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-start">
                        <button
                            type="button"
                            onClick={() => handleOpenReportModal(preparedQuestion)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Báo cáo câu hỏi"
                            aria-label="Báo cáo câu hỏi"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path
                                    fillRule="evenodd"
                                    d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.75 6.75a.75.75 0 10-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 8.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="sr-only">Báo cáo câu hỏi</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenChatModal(preparedQuestion)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Chat với AI"
                            aria-label="Chat với AI"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="sr-only">Chat với AI</span>
                        </button>
                    </div>
                </div>

                {/* Options */}
                {options.length > 0 && (
                    <div className="space-y-1 ml-11">
                        {Array.from({ length: maxOptions }, (_, index) => {
                            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                            const option = options[index];
                            const optionText = (option != null && typeof option === 'string') ? option : '';
                            const isCorrectOption = optionLetter === question.correctOption;
                            const isUserAnswer = optionLetter === question.userAnswer && question.userAnswer !== '';
                            const isCorrect = isUserAnswer && isCorrectOption;
                            const isWrong = isUserAnswer && !isCorrectOption;

                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                            isCorrect
                                                ? 'bg-green-500 text-white'
                                                : isWrong
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        {optionLetter}
                                    </div>
                                    {optionText && (
                                        <span className={`text-sm leading-tight ${
                                            isCorrect
                                                ? 'text-green-700 font-medium'
                                                : isWrong
                                                ? 'text-red-700 font-medium'
                                                : 'text-gray-800'
                                        }`}>{optionText}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Correct Answer Display */}
                {question.correctOption && (!question.userAnswer || question.userAnswer !== question.correctOption) && (
                    <div className="mt-4 ml-11">
                        <p className="text-sm font-semibold text-green-600">
                            Đáp án đúng: {question.correctOption}
                        </p>
                    </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                    <div className="mt-4 ml-11">
                        <details className="cursor-pointer">
                            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                Giải thích chi tiết đáp án
                            </summary>
                            <div className="mt-2">
                                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                                    {question.explanation}
                                </div>
                            </div>
                        </details>
                    </div>
                )}
            </div>
        );
    };

    // Get question range text for group
    const getQuestionRangeText = (questions) => {
        if (!questions || questions.length === 0) return '';
        
        const positions = questions.map(q => q.position).filter(p => p != null);
        if (positions.length === 0) return '';
        
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        if (minPos === maxPos) {
            return `Câu ${minPos}`;
        } else {
            return `Câu ${minPos}-${maxPos}`;
        }
    };

    // Render question group
    const renderQuestionGroup = (group, partNumber) => {
        const isPart6Or7 = partNumber === 6 || partNumber === 7;
        const questionRangeText = getQuestionRangeText(group.questions);

        if (isPart6Or7) {
            // Layout 2 cột cho Part 6-7
            return (
                <div key={group.id} className="mb-8">
                    {/* Header hiển thị phạm vi câu hỏi */}
                    {questionRangeText && (
                        <div className="mb-2">
                            <span className="text-sm font-semibold text-gray-700">
                                {questionRangeText}
                            </span>
                        </div>
                    )}
                    {/* Khung bao ngoài question group */}
                    <div className="relative rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Accent bar ở trên */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"></div>
                        <div className="p-5 pt-6">
                            <div className="flex gap-4">
                                {/* Cột trái: Passage (có scroll riêng) */}
                                <div className="w-[55%] overflow-y-auto pr-4" style={{ maxHeight: '70vh' }}>
                                    {group.passage && (
                                        <div className="mb-4">
                                            <PassageDisplay passage={group.passage} />
                                        </div>
                                    )}
                                    {group.imageUrl && (
                                        <div className="mb-4">
                                            <ImageDisplay imageUrl={group.imageUrl} />
                                        </div>
                                    )}
                                    {/* Transcript */}
                                    {group.transcript && (
                                        <div className="mb-4 mt-4 pt-4 border-t border-gray-200">
                                            <details className="cursor-pointer">
                                                <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                                    Hiện Transcript
                                                </summary>
                                                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="text-gray-800 text-sm leading-relaxed">
                                                        {parse(group.transcript)}
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                </div>

                                {/* Cột phải: Questions (có scroll riêng) */}
                                <div className="w-[45%] overflow-y-auto pl-4" style={{ maxHeight: '70vh' }}>
                                    {group.questions?.map((question) => renderQuestion(question, partNumber, group, selectedPart))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            // Layout 1 cột cho Part 1-5
            return (
                <div key={group.id} className="mb-8">
                    {/* Header hiển thị phạm vi câu hỏi */}
                    {questionRangeText && (
                        <div className="mb-2">
                            <span className="text-sm font-semibold text-gray-700">
                                {questionRangeText}
                            </span>
                        </div>
                    )}
                    {/* Khung bao ngoài question group */}
                    <div className="relative rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Accent bar ở trên */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"></div>
                        <div className="p-5 pt-6">
                            {/* Audio Player */}
                            {group.audioUrl && <AudioPlayerUI audioUrl={group.audioUrl} />}

                            {/* Image */}
                            {group.imageUrl && (
                                <div className="mb-4">
                                    <ImageDisplay imageUrl={group.imageUrl} />
                                </div>
                            )}

                            {/* Passage (cho Part 5) */}
                            {group.passage && (
                                <div className="mb-4">
                                    <PassageDisplay passage={group.passage} />
                                </div>
                            )}

                            {/* Questions */}
                            <div className="space-y-6">
                                {group.questions?.map((question) => renderQuestion(question, partNumber, group, selectedPart))}
                            </div>

                            {/* Transcript */}
                            {group.transcript && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <details className="cursor-pointer">
                                        <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                            Hiện Transcript
                                        </summary>
                                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="text-gray-800 text-sm leading-relaxed">
                                                {parse(group.transcript)}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Đang tải...</div>
            </div>
        );
    }

    if (!testData || !testData.partResponses || testData.partResponses.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Không có dữ liệu bài thi</div>
            </div>
        );
    }

    const selectedPart = testData.partResponses[selectedPartIndex];
    const allQuestions = getAllQuestions();
    const partNumber = selectedPart ? parseInt(selectedPart.partName.replace('Part ', '')) : null;

    return (
        <>
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-full mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Đáp án chi tiết: {testData.testName || ''}
                        </h1>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Quay về trang kết quả
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
                {/* Main Content (85%) */}
                <div className="flex-1 overflow-y-auto" style={{ width: '85%' }}>
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        {/* Part Tabs */}
                        <div className="mb-6 flex gap-2 border-b border-gray-200">
                            {testData.partResponses.map((part, index) => (
                                <button
                                    key={part.id}
                                    onClick={() => setSelectedPartIndex(index)}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                        selectedPartIndex === index
                                            ? 'bg-blue-600 text-white rounded-t-lg'
                                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
                                    }`}
                                >
                                    {part.partName}
                                </button>
                            ))}
                        </div>

                        {/* Selected Part Content */}
                        {selectedPart && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                                    {selectedPart.partName}
                                </h2>

                                {selectedPart.questionGroups?.map((group) =>
                                    renderQuestionGroup(group, partNumber)
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (15%) */}
                <div className="bg-white border-l border-gray-200 overflow-y-auto" style={{ width: '15%' }}>
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Danh sách câu hỏi</h3>
                        
                        {/* Group by Part */}
                        {testData.partResponses.map((part) => (
                            <div key={part.id} className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                                    {part.partName}
                                </h4>
                                <div className="grid grid-cols-5 gap-1">
                                    {part.questionGroups?.map((group) =>
                                        group.questions?.map((question) => {
                                            const status = question.isCorrect
                                                ? 'correct'
                                                : question.userAnswer
                                                ? 'incorrect'
                                                : 'skipped';

                                            return (
                                                <button
                                                    key={question.id}
                                                    onClick={() => {
                                                        // Find part index and switch to it
                                                        const partIndex = testData.partResponses.findIndex(
                                                            (p) => p.id === part.id
                                                        );
                                                        if (partIndex !== -1) {
                                                            setSelectedPartIndex(partIndex);
                                                            scrollToQuestion(question.position);
                                                        }
                                                    }}
                                                    className={`w-8 h-8 text-xs font-semibold rounded transition-colors ${
                                                        status === 'correct'
                                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                                            : status === 'incorrect'
                                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                    }`}
                                                    title={`Câu ${question.position}: ${
                                                        status === 'correct'
                                                            ? 'Đúng'
                                                            : status === 'incorrect'
                                                            ? 'Sai'
                                                            : 'Chưa trả lời'
                                                    }`}
                                                >
                                                    {question.position}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <ChatQuestion open={isChatModalOpen} onClose={handleCloseChatModal} questionData={chatQuestionData} />
        <ReportQuestion open={isReportModalOpen} onClose={handleCloseReportModal} questionData={reportQuestionData} />
        </>
    );
};

export default TestResultDetail;

