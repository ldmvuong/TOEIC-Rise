import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, FlagOutlined } from '@ant-design/icons';
import {
    getUserTestStatisticsResult,
    getWritingTestStatisticsResult,
    getSpeakingTestStatisticsResult,
    getLevelLearningPath,
    createUserLearningPath,
    getLearningPathDetail,
} from '../../api/api';
import { message, Modal, Button, Spin } from 'antd';
import AnswerQuestion from '../client/modal/AnswerQuestion';
import ChatQuestion from '../client/modal/ChatQuestion';
import ReportQuestion from '../client/modal/ReportQuestion';
import { toSlug } from '../../utils/slug';

/** Map WritingTestResultResponse into the shape this page expects for summary cards. */
function writingStatsResponseToViewModel(w) {
    const totalQ = Number(w?.totalQuestions) || 0;
    const totalA = Number(w?.totalAnswers) || 0;
    return {
        ...w,
        correctAnswers: totalA,
        correctPercent: totalQ > 0 ? (100 * totalA) / totalQ : 0,
        isWritingSummary: true,
        userAnswersByPart: null,
        parts: Array.isArray(w.parts) ? w.parts : [],
    };
}

function shouldPreferWritingStatisticsApi(data) {
    if (!data) return false;
    if (
        Array.isArray(data.parts) &&
        data.parts.some((p) => /writing/i.test(String(p)))
    ) {
        return true;
    }
    if (
        data.userAnswersByPart &&
        Object.keys(data.userAnswersByPart).some((k) =>
            /writing/i.test(String(k)),
        )
    ) {
        return true;
    }
    return false;
}

function shouldPreferSpeakingStatisticsApi(data) {
    if (!data) return false;
    if (
        Array.isArray(data.parts) &&
        data.parts.some((p) => /speaking/i.test(String(p)))
    ) {
        return true;
    }
    if (
        data.userAnswersByPart &&
        Object.keys(data.userAnswersByPart).some((k) =>
            /speaking/i.test(String(k)),
        )
    ) {
        return true;
    }
    return false;
}

const StatisticalResults = ({ userTestId, testId, onViewAnswers }) => {
    const [activePartTab, setActivePartTab] = useState(null);
    const [data, setData] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatQuestionData, setChatQuestionData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportQuestionData, setReportQuestionData] = useState(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const writingFromUrl = searchParams.get('writing') === '1';
    const speakingFromUrl = searchParams.get('speaking') === '1';

    const [learningPathLoading, setLearningPathLoading] = useState(false);
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [levelOptions, setLevelOptions] = useState([]);
    const [recommendedLevel, setRecommendedLevel] = useState(null);

    const handleLearningPathClick = async () => {
        if (!data) return;
        const slug = toSlug(data.testName || 'test');
        try {
            setLearningPathLoading(true);
            let testType = "LISTENING_AND_READING";
            if (data.isWritingSummary) {
                if (speakingFromUrl || shouldPreferSpeakingStatisticsApi(data)) {
                    testType = "SPEAKING";
                } else {
                    testType = "WRITING";
                }
            } else if (!fullTest) {
                testType = "MINI_TEST";
            }

            const res = await getLevelLearningPath(slug, testType);
            const result = res?.data ?? {};

            if (result.currentLevel != null) {
                try {
                    await getLearningPathDetail(slug);
                } catch (detailErr) {
                    console.warn("Learning path detail prefetch:", detailErr);
                }
                navigate(`/learning-paths/${slug}`);
                return;
            }

            setRecommendedLevel(result.chooseLevel ?? "BEGINNER");
            const choose = result.chooseLevel;
            let options = ["BEGINNER"];
            if (choose === "INTERMEDIATE") {
                options = ["BEGINNER", "INTERMEDIATE"];
            } else if (choose === "ADVANCED") {
                options = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
            }
            setLevelOptions(options);
            setShowLevelModal(true);
        } catch (error) {
            console.error('Error fetching level learning path:', error);
            message.error(error?.message || 'Không thể tải thông tin lộ trình');
        } finally {
            setLearningPathLoading(false);
        }
    };

    const handleSelectLevel = async (level) => {
        const slug = toSlug(data?.testName || 'test');
        try {
            setLearningPathLoading(true);
            await createUserLearningPath(slug, level);
            try {
                await getLearningPathDetail(slug);
            } catch (detailErr) {
                console.warn("Learning path detail after save:", detailErr);
                message.warning(
                    detailErr?.message ||
                        "Đã lưu cấp độ; không tải được chi tiết ngay. Đang mở trang lộ trình…",
                );
            }
            message.success('Tạo lộ trình thành công!');
            setShowLevelModal(false);
            navigate(`/learning-paths/${slug}`);
        } catch (error) {
            console.error('Error creating learning path:', error);
            message.error(error?.message || 'Lỗi khi tạo lộ trình');
            setShowLevelModal(true);
        } finally {
            setLearningPathLoading(false);
        }
    };

    // Fetch data from API
    useEffect(() => {
        if (!userTestId) {
            setHasFetched(true);
            return;
        }

        const fetchData = async () => {
            try {
                if (writingFromUrl) {
                    const res = await getWritingTestStatisticsResult(userTestId);
                    setData(writingStatsResponseToViewModel(res.data));
                    return;
                }
                if (speakingFromUrl) {
                    const res = await getSpeakingTestStatisticsResult(userTestId);
                    setData(writingStatsResponseToViewModel(res.data));
                    return;
                }
                const response = await getUserTestStatisticsResult(userTestId);
                const responseData = response.data;
                if (shouldPreferWritingStatisticsApi(responseData)) {
                    const wRes = await getWritingTestStatisticsResult(userTestId);
                    setData(writingStatsResponseToViewModel(wRes.data));
                    return;
                }
                if (shouldPreferSpeakingStatisticsApi(responseData)) {
                    const sRes = await getSpeakingTestStatisticsResult(userTestId);
                    setData(writingStatsResponseToViewModel(sRes.data));
                    return;
                }
                setData(responseData);
            } catch (error) {
                if (!writingFromUrl) {
                    try {
                        const wRes = await getWritingTestStatisticsResult(
                            userTestId,
                        );
                        setData(writingStatsResponseToViewModel(wRes.data));
                        return;
                    } catch {
                        /* fall through */
                    }
                }
                if (!speakingFromUrl) {
                    try {
                        const sRes = await getSpeakingTestStatisticsResult(
                            userTestId,
                        );
                        setData(writingStatsResponseToViewModel(sRes.data));
                        return;
                    } catch {
                        /* fall through */
                    }
                }
                console.error('Error fetching statistics:', error);
                message.error('Không thể tải thống kê kết quả');
            } finally {
                setHasFetched(true);
            }
        };

        fetchData();
    }, [userTestId, writingFromUrl, speakingFromUrl]);

    // Get parts list - memoized to use in multiple places
    const partsList = useMemo(() => {
        if (!data) return [];
        
        if (data.parts === null && data.userAnswersByPart) {
            // Full test: get parts from userAnswersByPart keys
            const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
            const partsFromData = Object.keys(data.userAnswersByPart);
            return partsFromData.sort((a, b) => {
                const indexA = partOrder.indexOf(a);
                const indexB = partOrder.indexOf(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        } else if (Array.isArray(data.parts) && data.parts.length > 0) {
            // Practice: use parts array directly
            return data.parts;
        }
        
        return [];
    }, [data]);

    // Set default active part tab when partsList changes
    useEffect(() => {
        if (partsList.length > 0) {
            // Set first part as active if:
            // 1. No active part is set, OR
            // 2. Current active part is not in the parts list (data changed)
            if (!activePartTab || !partsList.includes(activePartTab)) {
                setActivePartTab(partsList[0]);
            }
        } else {
            // If no parts, reset activePartTab
            setActivePartTab(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partsList]); // Only depend on partsList, check activePartTab inside

    // Helper functions (must be defined before hooks)
    const formatTime = (seconds) => {
        if (!seconds) return '0:00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Calculate derived values using useMemo to ensure hooks are always called
    // Full test: parts === null
    // Practice: parts is an array with specific parts
    const fullTest = useMemo(() => {
        if (!data) return false;
        // If parts is null, it's a full test
        return data.parts === null;
    }, [data]);

    const incorrectAnswers = useMemo(() => {
        if (!data) return 0;
        if (data.isWritingSummary) {
            return Math.max(
                0,
                (data.totalQuestions ?? 0) - (data.totalAnswers ?? 0),
            );
        }
        if (fullTest) {
            // For full test: sum wrongAnswers from all parts' Total
            let totalIncorrect = 0;
            if (data.userAnswersByPart) {
                Object.values(data.userAnswersByPart).forEach((partData) => {
                    const total = partData.find(item => item.tag === 'Total');
                    if (total) {
                        totalIncorrect += total.wrongAnswers || 0;
                    }
                });
            }
            return totalIncorrect;
        } else {
            // For practice: totalQuestions - correctAnswers (all answered questions are either correct or incorrect)
            return data.totalQuestions - data.correctAnswers;
        }
    }, [data, fullTest]);


    // Use partsList for tabs
    const parts = partsList;

    // Memoize part details to avoid recalculating on every render
    const currentPartDetails = useMemo(() => {
        if (!activePartTab || !data || !data.userAnswersByPart || !data.userAnswersByPart[activePartTab]) {
            return null;
        }

        const partData = data.userAnswersByPart[activePartTab];
        const total = partData.find(item => item.tag === 'Total');
        const totalCorrect = total?.correctAnswers || 0;
        const totalIncorrect = total?.wrongAnswers || 0;
        
        const categories = partData
            .filter(item => item.tag !== 'Total')
            .map(item => {
                const correctCount = item.correctAnswers || 0;
                const wrongCount = item.wrongAnswers || 0;
                
                // Get question positions with status and userAnswerId
                const questions = item.userAnswerOverallResponses?.map(q => ({
                    position: q.position,
                    correct: q.correct,
                    userAnswerId: q.userAnswerId || q.id || null
                })) || [];

                return {
                    name: item.tag,
                    correct: correctCount,
                    incorrect: wrongCount,
                    accuracy: item.correctPercent || 0,
                    questions: questions
                };
            });

        // Calculate totals from categories
        let sumCorrect = 0;
        let sumIncorrect = 0;
        categories.forEach(cat => {
            sumCorrect += cat.correct;
            sumIncorrect += cat.incorrect;
        });

        const totalAccuracy = total?.correctPercent || 0;

        return {
            categories,
            total: {
                correct: totalCorrect || sumCorrect,
                incorrect: totalIncorrect || sumIncorrect,
                accuracy: totalAccuracy
            }
        };
    }, [activePartTab, data]);

    if (hasFetched && !data) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-12 text-gray-500">
                    Không có dữ liệu thống kê
                </div>
            </div>
        );
    }
    
    if (!hasFetched || !data) {
        return null;
    }

    return (
        <div className="relative bg-white rounded-xl border border-gray-200 p-6">
            {learningPathLoading ? (
                <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85 px-4 py-8 backdrop-blur-[1px]"
                    aria-busy="true"
                    aria-live="polite"
                >
                    <Spin size="large" />
                    <div className="text-center text-sm text-gray-600">
                        Đang xử lý lộ trình…
                    </div>
                </div>
            ) : null}
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Kết quả thi: {data.testName || 'Test'}
                </h1>
                <div className="flex gap-3">
                    {onViewAnswers && (
                        <button 
                            onClick={onViewAnswers}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Xem đáp án
                        </button>
                    )}
                    <button 
                        onClick={handleLearningPathClick}
                        disabled={learningPathLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center min-w-[160px]"
                    >
                        {learningPathLoading ? "Đang xử lý…" : "Lộ trình học tập"}
                    </button>
                    <button 
                        onClick={() => {
                            if (data.isWritingSummary && data.testId != null) {
                                const slug = toSlug(data.testName || 'test');
                                if (speakingFromUrl) {
                                    navigate(`/speaking-tests/${data.testId}/${slug}`);
                                    return;
                                }
                                navigate(`/writing-tests/${data.testId}/${slug}`);
                                return;
                            }
                            if (testId && data?.testName) {
                                const slug = toSlug(data.testName);
                                navigate(`/online-tests/${testId}/${slug}`);
                            } else {
                                navigate('/online-tests');
                            }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                    >
                        Quay về trang đề thi
                    </button>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Kết quả làm bài</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.correctAnswers}/{data.totalQuestions}
                    </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">
                        {data.isWritingSummary
                            ? 'Tỷ lệ hoàn thành'
                            : 'Độ chính xác'}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {data.correctPercent?.toFixed(1) || '0.0'}%
                    </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Thời gian hoàn thành</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatTime(data.timeSpent)}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className={`grid gap-4 mb-6 ${fullTest ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-2'}`}>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircleOutlined className="text-3xl text-green-600" />
                    <div>
                        <div className="text-sm text-gray-600">Trả lời đúng</div>
                        <div className="text-xl font-bold text-gray-900">{data.correctAnswers || 0} câu hỏi</div>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <CloseCircleOutlined className="text-3xl text-red-600" />
                    <div>
                        <div className="text-sm text-gray-600">
                            {data.isWritingSummary
                                ? 'Chưa trả lời'
                                : 'Trả lời sai'}
                        </div>
                        <div className="text-xl font-bold text-gray-900">{incorrectAnswers} câu hỏi</div>
                    </div>
                </div>
                {fullTest && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <FlagOutlined className="text-3xl text-blue-600" />
                        <div>
                            <div className="text-sm text-gray-600">Điểm</div>
                            <div className="text-xl font-bold text-gray-900">{data.score || 0}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Scores - Only show for Full Test */}
            {fullTest && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-blue-700 font-semibold mb-2">Listening</div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {data.listeningScore || 0}/495
                        </div>
                        <div className="text-sm text-gray-600">
                            Trả lời đúng: {data.listeningCorrectAnswers || 0}/100
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-blue-700 font-semibold mb-2">Reading</div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {data.readingScore || 0}/495
                        </div>
                        <div className="text-sm text-gray-600">
                            Trả lời đúng: {data.readingCorrectAnswers || 0}/100
                        </div>
                    </div>
                </div>
            )}

            {/* Phân tích chi tiết (không áp dụng cho tóm tắt Writing từ API riêng) */}
            {parts.length > 0 && !data.isWritingSummary && (
                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Phân tích chi tiết</h2>
                    
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
                        {parts.map((part) => (
                            <button
                                key={part}
                                onClick={() => setActivePartTab(part)}
                                className={`px-4 py-2 font-medium ${
                                    activePartTab === part
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                {part}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    {!currentPartDetails || !currentPartDetails.categories || currentPartDetails.categories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {activePartTab ? `Không có dữ liệu cho ${activePartTab}` : 'Chọn một part để xem chi tiết'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left border border-gray-200">Phân loại câu hỏi</th>
                                        <th className="px-4 py-3 text-center border border-gray-200">Số câu đúng</th>
                                        <th className="px-4 py-3 text-center border border-gray-200">Số câu sai</th>
                                        <th className="px-4 py-3 text-center border border-gray-200">Độ chính xác</th>
                                        <th className="px-4 py-3 text-left border border-gray-200">Danh sách câu hỏi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentPartDetails.categories.map((category, idx) => (
                                        <tr key={idx} className="odd:bg-white even:bg-gray-50">
                                            <td className="px-4 py-3 border border-gray-200">{category.name}</td>
                                            <td className="px-4 py-3 text-center border border-gray-200">{category.correct}</td>
                                            <td className="px-4 py-3 text-center border border-gray-200">{category.incorrect}</td>
                                            <td className="px-4 py-3 text-center border border-gray-200">
                                                {category.accuracy.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-3 border border-gray-200">
                                                <div className="flex flex-wrap gap-1 justify-start">
                                                    {category.questions && category.questions.length > 0 ? (
                                                        category.questions.map((q, qIdx) => {
                                                            const bgColor = q.correct 
                                                                ? 'bg-green-500 text-white' 
                                                                : 'bg-red-500 text-white';
                                                            
                                                            return (
                                                                <button
                                                                    key={qIdx}
                                                                    onClick={() => {
                                                                        if (q.userAnswerId) {
                                                                            setSelectedQuestionId(q.userAnswerId);
                                                                            setIsAnswerModalOpen(true);
                                                                        }
                                                                    }}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${bgColor} ${
                                                                        q.userAnswerId ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'
                                                                    }`}
                                                                    title={q.userAnswerId ? 'Xem chi tiết' : ''}
                                                                >
                                                                    {q.position}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total row */}
                                    {currentPartDetails.total && (
                                        <tr className="bg-gray-100 font-semibold">
                                            <td className="px-4 py-3 border border-gray-200">Total</td>
                                            <td className="px-4 py-3 text-center border border-gray-200">
                                                {currentPartDetails.total.correct}
                                            </td>
                                            <td className="px-4 py-3 text-center border border-gray-200">
                                                {currentPartDetails.total.incorrect}
                                            </td>
                                            <td className="px-4 py-3 text-center border border-gray-200">
                                                {currentPartDetails.total.accuracy.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-3 border border-gray-200"></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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

            <Modal
                title={
                    <div>
                        <div className="text-base font-semibold text-gray-900">
                            Chọn cấp độ lộ trình
                        </div>
                        <div className="mt-0.5 text-xs font-normal text-gray-500">
                            Select your learning level
                        </div>
                    </div>
                }
                open={showLevelModal}
                onCancel={() => !learningPathLoading && setShowLevelModal(false)}
                footer={null}
                destroyOnClose
                maskClosable={!learningPathLoading}
            >
                <p className="mb-1 mt-2 text-sm text-gray-600">
                    Mức có nhãn{" "}
                    <span className="font-medium text-amber-700">Recommended for you</span>{" "}
                    (⭐) là gợi ý phù hợp với kết quả làm bài của bạn.
                </p>
                <div className="flex flex-col gap-3 mt-4">
                    {levelOptions.map(level => {
                        const isRecommended = level === recommendedLevel;
                        let bgColor = "bg-slate-50 hover:bg-slate-100 border-slate-200";
                        let textColor = "text-slate-700";
                        
                        if (level === "BEGINNER") {
                            bgColor = "bg-green-50 hover:bg-green-100 border-green-200";
                            textColor = "text-green-700";
                        } else if (level === "INTERMEDIATE") {
                            bgColor = "bg-orange-50 hover:bg-orange-100 border-orange-200";
                            textColor = "text-orange-700";
                        } else if (level === "ADVANCED") {
                            bgColor = "bg-purple-50 hover:bg-purple-100 border-purple-200";
                            textColor = "text-purple-700";
                        }

                        return (
                            <Button 
                                key={level} 
                                onClick={() => handleSelectLevel(level)}
                                disabled={learningPathLoading}
                                size="large"
                                className={`w-full text-left flex justify-between items-center h-auto py-3 border ${bgColor}`}
                            >
                                <span className={`font-medium ${textColor}`}>
                                    {level === "BEGINNER" ? "Người mới bắt đầu (Beginner)" :
                                     level === "INTERMEDIATE" ? "Trung cấp (Intermediate)" : "Nâng cao (Advanced)"}
                                </span>
                                {isRecommended ? (
                                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80">
                                        <span aria-hidden>⭐</span>
                                        Recommended for you
                                    </span>
                                ) : null}
                            </Button>
                        );
                    })}
                </div>
            </Modal>

        </div>
    );
};

export default StatisticalResults;

