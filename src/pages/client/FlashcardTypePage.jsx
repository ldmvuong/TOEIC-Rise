import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Spin, message, Modal } from 'antd';
import {
    ArrowLeftIcon,
    LightBulbIcon,
    CheckCircleIcon,
    Cog6ToothIcon,
    ExclamationTriangleIcon,
    ArrowRightCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { callFetchFlashcardReview, callSubmitFlashcardProgress, callFetchFlashcardDueItems } from '../../api/api';

const normalizeAnswer = (s) => (s || '').trim().toLowerCase();

const FlashcardTypePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isDueMode = location.pathname.startsWith('/flashcards/due/');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState(null); // null | 'correct' | { status: 'wrong' | 'hint-wrong', userAnswer: string, correctWord: string }
    const [progressMap, setProgressMap] = useState({}); // { [flashcardItemId]: { isCorrect: boolean } }
    const [submittingExit, setSubmittingExit] = useState(false);

    useEffect(() => {
        if (isDueMode) {
            const fetchDue = async () => {
                setLoading(true);
                try {
                    const res = await callFetchFlashcardDueItems();
                    const data = res?.data;
                    const list = Array.isArray(data) ? data : (data?.result ?? []);
                    setItems(list);
                    setCurrentIndex(0);
                    setInputValue('');
                    setFeedback(null);
                    setProgressMap({});
                } catch (err) {
                    message.error(err?.message || 'Không thể tải từ cần ôn');
                } finally {
                    setLoading(false);
                }
            };
            fetchDue();
            return;
        }
        if (!id) return;
        const fetchReview = async () => {
            setLoading(true);
            try {
                const res = await callFetchFlashcardReview(id);
                const data = res?.data;
                const list = Array.isArray(data) ? data : (data?.result ?? []);
                setItems(list);
                setCurrentIndex(0);
                setInputValue('');
                setFeedback(null);
                setProgressMap({});
            } catch (err) {
                message.error(err?.message || 'Không thể tải dữ liệu luyện tập');
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [id, isDueMode]);

    const currentItem = items[currentIndex] ?? null;
    const correctWord = currentItem?.vocabulary || currentItem?.word || '';
    const total = items.length;
    const currentItemId = currentItem?.id;

    const markCorrect = (itemId) => {
        if (!itemId) return;
        setProgressMap((prev) => {
            const existing = prev[itemId];
            if (existing && existing.isCorrect === false) return prev;
            return {
                ...prev,
                [itemId]: { isCorrect: true },
            };
        });
    };

    const markWrong = (itemId) => {
        if (!itemId) return;
        setProgressMap((prev) => {
            const existing = prev[itemId];
            if (existing && existing.isCorrect === false) return prev;
            return {
                ...prev,
                [itemId]: { isCorrect: false },
            };
        });
    };

    const handleCheck = () => {
        if (!currentItem) return;
        const user = normalizeAnswer(inputValue);
        const correct = normalizeAnswer(correctWord);
        if (!user) {
            message.info('Vui lòng nhập từ tiếng Anh');
            return;
        }
        if (user === correct) {
            setFeedback('correct');
            markCorrect(currentItemId);
            setTimeout(() => {
                goNext();
            }, 600);
        } else {
            markWrong(currentItemId);
            setFeedback({
                status: 'wrong',
                userAnswer: inputValue.trim(),
                correctWord,
            });
        }
    };

    const goNext = () => {
        setInputValue('');
        setFeedback(null);
        setCurrentIndex((i) => (i < total - 1 ? i + 1 : total));
    };

    const handleHint = () => {
        // Sau khi người dùng bấm Kiểm tra và sai, nút gợi ý sẽ bị disable
        if (feedback?.status === 'wrong') return;

        if (!currentItem) return;
        const correct = correctWord || '';
        if (!correct) return;

        const trimmedInput = inputValue.trim();

        // Chưa nhập gì -> gợi ý ký tự đầu tiên
        if (!trimmedInput) {
            setInputValue(correct.charAt(0));
            return;
        }

        const normInput = normalizeAnswer(trimmedInput);
        const normCorrect = normalizeAnswer(correct);

        // Nếu người dùng đang gõ đúng prefix -> thêm 1 ký tự tiếp theo
        if (normCorrect.startsWith(normInput)) {
            const nextLen = Math.min(trimmedInput.length + 1, correct.length);
            // Nếu đã gợi ý > 50% hoặc toàn bộ từ, tính là sai
            if (correct.length > 0 && nextLen / correct.length > 0.5) {
                markWrong(currentItemId);
            }
            setInputValue(correct.slice(0, nextLen));
            return;
        }

        // Người dùng gõ sai prefix: hiển thị gạch đỏ, sau đó reset input về ký tự đầu tiên và tính sai
        markWrong(currentItemId);
        setFeedback({
            status: 'hint-wrong',
            userAnswer: trimmedInput,
            correctWord: correct,
        });
        setInputValue(correct.charAt(0));
    };

    const handleSkip = () => {
        // Bỏ qua từ hiện tại và chuyển sang từ tiếp theo
        setFeedback(null);
        setInputValue('');
        goNext();
    };

    const hasProgress = Object.keys(progressMap).length > 0;

    const buildProgressPayload = () => {
        const items = Object.entries(progressMap).map(([itemId, value]) => ({
            flashcardItemId: Number(itemId),
            correct: !!value.isCorrect,
        }));
        return { items };
    };

    const handleExit = () => {
        const target = isDueMode ? '/flashcards/due' : `/flashcards/${id}`;
        if (!hasProgress) {
            navigate(target);
            return;
        }
        Modal.confirm({
            title: 'Thoát luyện tập?',
            content: 'Tiến độ trả lời của bạn sẽ được gửi và không thể hoàn tác.',
            okText: 'Gửi & thoát',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    setSubmittingExit(true);
                    const payload = buildProgressPayload();
                    if (payload.items.length) {
                        await callSubmitFlashcardProgress(payload);
                    }
                } catch (err) {
                    message.error(err?.message || 'Không thể gửi tiến độ, vui lòng thử lại.');
                } finally {
                    setSubmittingExit(false);
                    navigate(target);
                }
            },
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleCheck();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spin size="large" className="text-teal-500" />
                    <p className="text-gray-400">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4">
                <div className="text-center text-gray-400">
                    <p className="mb-4">Chưa có từ vựng để luyện tập.</p>
                    <button
                        onClick={() => navigate(isDueMode ? '/flashcards/due' : `/flashcards/${id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D3748] text-white rounded-xl hover:bg-[#4A5568] transition"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Quay lại bộ thẻ
                    </button>
                </div>
            </div>
        );
    }

    const isWrong =
        feedback && (feedback.status === 'wrong' || feedback.status === 'hint-wrong');

    return (
        <div className="min-h-screen bg-[#1A202C] text-gray-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2D3748]">
                <button
                    onClick={handleExit}
                    className="p-2 rounded-lg hover:bg-[#2D3748] transition flex items-center gap-2 text-gray-300 hover:text-white"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Quay lại</span>
                </button>
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-gray-500" />
                    <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                    <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
                {currentIndex >= total ? (
                    <div className="text-center">
                        <p className="text-xl font-semibold text-teal-400 mb-4">Hoàn thành!</p>
                        <p className="text-gray-400 mb-6">Bạn đã ôn hết các từ trong lượt này.</p>
                        <button
                            onClick={handleExit}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                        >
                            {isDueMode ? 'Quay lại chọn game' : 'Quay lại bộ thẻ'}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Vietnamese word - luôn hiển thị */}
                        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">
                            {currentItem?.definition || '—'}
                        </h1>

                        {/* Khi đúng: khối feedback xanh */}
                        {feedback === 'correct' && (
                            <div className="w-full rounded-xl border-2 border-green-500 bg-[#1A202C] p-6 mb-6">
                                <div className="flex items-center justify-center gap-2 text-green-500 mb-3">
                                    <CheckCircleSolid className="w-8 h-8" />
                                    <span className="text-xl font-semibold">Chính xác!</span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-green-500 text-center">
                                    {correctWord}
                                </p>
                            </div>
                        )}

                        {/* Khi sai (bấm Kiểm tra): khối feedback đỏ */}
                        {feedback?.status === 'wrong' && (
                            <div className="w-full rounded-xl border-2 border-red-400/80 bg-red-950/20 p-6 mb-6">
                                <div className="flex items-center justify-center gap-2 text-red-400 mb-3">
                                    <XCircleIcon className="w-8 h-8" />
                                    <span className="text-xl font-semibold">Chưa đúng</span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
                                    {feedback.correctWord}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                                    <span>Bạn gõ:</span>
                                    <span className="text-red-400 line-through font-medium">
                                        {feedback.userAnswer || '—'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Input - ẩn khi đang hiển thị feedback đúng/sai từ Kiểm tra */}
                        {feedback !== 'correct' && feedback?.status !== 'wrong' && (
                            <>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Gõ từ tiếng Anh..."
                                    className="w-full px-4 py-3 rounded-xl bg-[#2D3748] border border-[#4A5568] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg mb-4"
                                />
                                {/* hint-wrong: chỉ dòng gạch đỏ */}
                                {isWrong && (
                                    <div className="w-full mb-2">
                                        <p className="text-red-400 line-through text-lg">
                                            {feedback.userAnswer || '—'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Buttons */}
                        <div className="flex items-center gap-3 mt-8 w-full">
                            <button
                                type="button"
                                onClick={handleHint}
                                disabled={feedback?.status === 'wrong'}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-gray-300 transition border border-[#4A5568] disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Gợi ý thêm 1 ký tự"
                            >
                                <LightBulbIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">
                                    Gợi ý
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-gray-300 transition border border-[#4A5568]"
                                title="Bỏ qua từ này"
                            >
                                <ArrowRightCircleIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Bỏ qua</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCheck}
                                disabled={feedback === 'correct'}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white font-medium transition"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                Kiểm tra
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Progress */}
            <div className="p-4 text-center text-sm text-gray-500">
                {Math.min(currentIndex + 1, total)} / {total}
            </div>
        </div>
    );
};

export default FlashcardTypePage;
