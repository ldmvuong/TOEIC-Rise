import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import parse from 'html-react-parser';
import PassageDisplay from '../../components/exam/PassageDisplay';
import ImageDisplay from '../../components/exam/ImageDisplay';
import MiniTestSidebar from '../../components/mini-test/sidebar';
import { scrollToElement } from '../../utils/scrollUtils';

const MiniTestResult = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const resultData = location.state?.resultData;
    const testData = location.state?.testData;
    const selectedTags = location.state?.selectedTags || [];
    const partNumber = location.state?.partNumber;

    if (!resultData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow px-6 py-4 text-center">
                    <p className="text-gray-700 mb-3">Không tìm thấy dữ liệu kết quả mini test.</p>
                    <button
                        onClick={() => navigate('/statistics')}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Quay lại thống kê
                    </button>
                </div>
            </div>
        );
    }

    const { totalQuestions = 0, correctAnswers = 0, questionGroups = [] } = resultData;
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : '0.00';

    const letterAt = (index) => String.fromCharCode(65 + index);
    const isListeningPart = partNumber >= 1 && partNumber <= 4;

    // Ensure page is scrolled to top when opening result
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    // Flatten all questions for sidebar/navigation and answers map
    const { allQuestions, answersMap } = useMemo(() => {
        const flat = [];
        const ans = {};

        questionGroups.forEach((group) => {
            (group.questions || []).forEach((q) => {
                flat.push({
                    ...q,
                    groupId: group.id,
                    groupIndex: group.index,
                    groupPosition: group.position,
                });

                if (q.userAnswer) {
                    const idx = q.userAnswer.charCodeAt(0) - 65;
                    if (idx >= 0 && idx < (q.options?.length || 0)) {
                        ans[q.id] = idx;
                    }
                }
            });
        });

        return { allQuestions: flat, answersMap: ans };
    }, [questionGroups]);

    const [currentQuestionId, setCurrentQuestionId] = useState(allQuestions[0]?.id || null);
    const [expandedQuestions, setExpandedQuestions] = useState({}); // { questionId: bool }
    const [expandedTranscripts, setExpandedTranscripts] = useState({}); // { groupId: bool }

    const handleNavigateToQuestion = (questionId) => {
        setCurrentQuestionId(questionId);
        scrollToElement(`result-question-${questionId}`, { behavior: 'smooth', block: 'start' });
    };

    const toggleExplanation = (questionId) => {
        setExpandedQuestions((prev) => ({
            ...prev,
            [questionId]: !prev[questionId],
        }));
    };

    const toggleTranscript = (groupId) => {
        // Giữ nguyên vị trí cuộn dọc khi ẩn/hiện transcript để tránh cảm giác "nhảy trang"
        const currentScrollY = window.scrollY;
        setExpandedTranscripts((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
        // Đợi layout cập nhật rồi cuộn lại đúng vị trí cũ
        setTimeout(() => {
            window.scrollTo({ top: currentScrollY, left: 0, behavior: 'auto' });
        }, 0);
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row lg:h-screen overflow-hidden bg-gray-50">
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-y-auto px-4 pb-10 lg:min-w-0 lg:overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full space-y-6 mt-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Kết quả Mini Test</h1>
                                {selectedTags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedTags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => navigate('/statistics')}
                                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Quay lại thống kê
                            </button>
                    </div>

                    {/* Summary */}
                    <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500 mb-1">Tổng số câu</div>
                                <div className="text-2xl font-semibold text-gray-900">{totalQuestions}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500 mb-1">Số câu đúng</div>
                                <div className="text-2xl font-semibold text-emerald-600">{correctAnswers}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500 mb-1">Độ chính xác</div>
                                <div className="text-2xl font-semibold text-blue-600">{accuracy}%</div>
                            </div>
                    </div>

                    {/* Question groups & questions */}
                    <div className="space-y-6 pb-8">
                            {questionGroups.map((group) => (
                                <div
                                    key={group.id}
                                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
                                >
                                    {/* Audio (nếu có) */}
                                    {group.audioUrl && (
                                        <div className="mb-3">
                                            <audio
                                                controls
                                                src={group.audioUrl}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    {/* Hình ảnh (nếu có và là phần nghe) */}
                                    {isListeningPart && group.imageUrl && (
                                        <div className="mb-3">
                                            <ImageDisplay imageUrl={group.imageUrl} />
                                        </div>
                                    )}

                                    {/* Passage (nếu có, dùng lại PassageDisplay) */}
                                    {group.passage && <PassageDisplay passage={group.passage} />}

                                    {/* Transcript (nếu có, ẩn/hiện được như phần giải thích: mở ra mới chiếm chỗ */}
                                    {group.transcript && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-900">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-semibold">Transcript</div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTranscript(group.id)}
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                                                >
                                                    {expandedTranscripts[group.id] ? 'Ẩn transcript' : 'Xem transcript'}
                                                </button>
                                            </div>
                                            {expandedTranscripts[group.id] && (
                                                <div className="mt-1 max-h-48 overflow-y-auto pr-1 text-xs sm:text-sm leading-relaxed">
                                                    {parse(group.transcript)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Questions in group */}
                                    <div className="space-y-4">
                                        {group.questions.map((q) => {
                                            const userAnswer = q.userAnswer || '';
                                            const correctLetter = q.correctOption || '';
                                            const isCorrect = q.isCorrect;

                                            return (
                                                <div
                                                    key={q.id}
                                                    id={`result-question-${q.id}`}
                                                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 scroll-mt-4"
                                                >
                                                    {/* Question header: index + position */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                                                                {q.index ?? q.position}
                                                            </span>
                                                            {partNumber === 6 && q.position != null && (
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-300">
                                                                    {q.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {q.content}
                                                        </div>
                                                    </div>

                                                    {/* Options */}
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, idx) => {
                                                            const letter = letterAt(idx);
                                                            const isUser = userAnswer === letter;
                                                            const isOptCorrect = correctLetter === letter;

                                                            let baseClasses =
                                                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm';
                                                            let colorClasses =
                                                                'border-gray-200 bg-white text-gray-800';

                                                            if (isOptCorrect) {
                                                                colorClasses =
                                                                    'border-emerald-500 bg-emerald-50 text-emerald-800';
                                                            }
                                                            if (isUser && !isOptCorrect) {
                                                                colorClasses =
                                                                    'border-rose-400 bg-rose-50 text-rose-800';
                                                            }

                                                            return (
                                                                <div
                                                                    key={letter}
                                                                    className={`${baseClasses} ${colorClasses}`}
                                                                >
                                                                    <span className="font-semibold w-6">{letter}.</span>
                                                                    <span className="flex-1">{opt}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Answer summary & explanation */}
                                                    <div className="pt-2 border-t border-dashed border-gray-200 space-y-2 text-sm">
                                                        <div className="flex flex-wrap gap-3 text-gray-700 items-center justify-between">
                                                            {!userAnswer && (
                                                                <div className="text-gray-600 italic">
                                                                    Chưa trả lời
                                                                </div>
                                                            )}
                                                            {q.explanation && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExplanation(q.id)}
                                                                    className="px-3 py-1 rounded-full text-xs font-medium border border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
                                                                >
                                                                    {expandedQuestions[q.id]
                                                                        ? 'Ẩn giải thích'
                                                                        : 'Xem giải thích'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {q.explanation && expandedQuestions[q.id] && (
                                                            <div className="mt-2 rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-sky-900 whitespace-pre-line text-xs sm:text-sm max-h-48 overflow-y-auto pr-1">
                                                                <div className="font-semibold mb-1">Giải thích</div>
                                                                {q.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Sidebar cố định bên phải */}
            <MiniTestSidebar
                partNumber={partNumber}
                questions={allQuestions}
                currentQuestionId={currentQuestionId}
                onNavigateToQuestion={handleNavigateToQuestion}
                answers={answersMap}
                flaggedQuestions={[]}
                onToggleFlag={() => {}}
                selectedTags={selectedTags}
                questionResults={allQuestions.reduce((acc, q) => {
                    if (q.userAnswer) {
                        acc[q.id] = q.isCorrect ? 'correct' : 'wrong';
                    }
                    return acc;
                }, {})}
            />
        </div>
    );
};

export default MiniTestResult;
