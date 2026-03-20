import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Spin, message, Modal } from 'antd';
import { ArrowLeftIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardReview, callSubmitFlashcardProgress, callFetchFlashcardDueItems } from '../../api/api';

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildOptions(currentItem, allItems) {
    const correct = {
        vocabulary: currentItem.vocabulary || currentItem.word || '',
        pronunciation: currentItem.pronunciation || null,
        isCorrect: true,
    };
    const others = allItems.filter((item) => item.id !== currentItem.id);
    const wrongPool = others.map((item) => ({
        vocabulary: item.vocabulary || item.word || '',
        pronunciation: item.pronunciation || null,
        isCorrect: false,
    }));
    let wrong = [];
    if (wrongPool.length >= 3) {
        wrong = shuffleArray(wrongPool).slice(0, 3);
    } else {
        wrong = [...wrongPool];
        while (wrong.length < 3) {
            wrong.push(wrongPool[Math.floor(Math.random() * wrongPool.length)]);
        }
    }
    return shuffleArray([correct, ...wrong]);
}

const FlashcardQuizPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isDueMode = location.pathname.startsWith('/flashcards/due/');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedKey, setSelectedKey] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [results, setResults] = useState({});
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
                    setItems(shuffleArray(list));
                    setCurrentIndex(0);
                    setSelectedKey(null);
                    setRevealed(false);
                    setResults({});
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
                setItems(shuffleArray(list));
                setCurrentIndex(0);
                setSelectedKey(null);
                setRevealed(false);
                setResults({});
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
    const currentItemId = currentItem?.id;
    const options = useMemo(() => {
        if (!currentItem || items.length === 0) return [];
        return buildOptions(currentItem, items);
    }, [currentItem, items]);

    const total = items.length;
    const isCompleted = total > 0 && currentIndex >= total - 1 && revealed;

    const markCorrect = (itemId) => {
        if (!itemId) return;
        setProgressMap((prev) => {
            const existing = prev[itemId];
            if (existing && existing.isCorrect === false) return prev;
            return { ...prev, [itemId]: { isCorrect: true } };
        });
    };

    const markWrong = (itemId) => {
        if (!itemId) return;
        setProgressMap((prev) => {
            const existing = prev[itemId];
            if (existing && existing.isCorrect === false) return prev;
            return { ...prev, [itemId]: { isCorrect: false } };
        });
    };

    const handleSelect = (opt) => {
        if (revealed) return;
        setSelectedKey(opt.vocabulary);
        setRevealed(true);
        setResults((prev) => ({
            ...prev,
            [currentIndex]: opt.isCorrect ? 'correct' : 'wrong',
        }));
        if (opt.isCorrect) {
            markCorrect(currentItemId);
        } else {
            markWrong(currentItemId);
        }
    };

    const handleNext = () => {
        if (currentIndex < total - 1) {
            setCurrentIndex((i) => i + 1);
            setSelectedKey(null);
            setRevealed(false);
        }
    };

    const handleSkip = () => {
        setRevealed(true);
        setSelectedKey(null);
        setResults((prev) => ({ ...prev, [currentIndex]: 'wrong' }));
        markWrong(currentItemId);
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
        if (submittingExit) return;
        const target = isDueMode ? '/flashcards/due' : `/flashcards/${id}`;

        // Nếu đã hoàn thành thì tự động gửi tiến độ và điều hướng,
        // không hiển thị cảnh báo xác nhận.
        if (isCompleted) {
            (async () => {
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
            })();
            return;
        }

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spin size="large" className="text-green-600" />
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center text-gray-600">
                    <p className="mb-4">Chưa có từ vựng để luyện tập.</p>
                    <button
                        onClick={() => navigate(isDueMode ? '/flashcards/due' : `/flashcards/${id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Quay lại bộ thẻ
                    </button>
                </div>
            </div>
        );
    }

    if (items.length < 4) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center text-gray-600">
                    <p className="mb-4">Cần ít nhất 4 từ vựng để chơi. Hiện có {items.length} từ.</p>
                    <button
                        onClick={() => navigate(isDueMode ? '/flashcards/due' : `/flashcards/${id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Quay lại bộ thẻ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <button
                    onClick={handleExit}
                    className="p-2 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Quay lại</span>
                </button>
                <span className="text-sm text-gray-600">Trắc nghiệm lựa chọn</span>
            </div>

            {/* Progress bar: đỏ khi chọn sai */}
            <div className="px-4 pt-4">
                <div className="flex items-center gap-1 overflow-hidden rounded-full bg-gray-200">
                    {items.map((_, i) => {
                        const isWrong = results[i] === 'wrong';
                        const isPastOrCurrentRevealed = i < currentIndex || (i === currentIndex && revealed);
                        const segmentBg = isWrong
                            ? 'bg-red-200'
                            : isPastOrCurrentRevealed
                                ? 'bg-green-200'
                                : 'bg-gray-300';
                        return (
                            <div
                                key={i}
                                className={`h-2 flex-1 min-w-0 transition-colors ${segmentBg}`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-sm">
                    <span className="text-green-700 font-medium">{currentIndex + 1}</span>
                    <span className="text-gray-500">{total}</span>
                </div>
            </div>

            <div className="px-4 py-6 flex-1">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Định nghĩa
                </h2>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                    {currentItem?.definition || '—'}
                </p>

                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    Chọn đáp án đúng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt, idx) => {
                        const selected = selectedKey === opt.vocabulary;
                        const showCorrect = revealed && opt.isCorrect;
                        const showWrong = revealed && selected && !opt.isCorrect;
                        const disabled = revealed;
                        const bg = showCorrect
                            ? 'bg-green-100 border-green-300'
                            : showWrong
                                ? 'bg-red-100 border-red-300'
                                : selected
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50';
                        return (
                            <button
                                key={`${opt.vocabulary}-${idx}`}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleSelect(opt)}
                                className={`p-4 rounded-xl border text-left transition ${bg} ${
                                    disabled ? 'cursor-default' : 'cursor-pointer'
                                }`}
                            >
                                <span className="font-medium text-gray-900 block">{opt.vocabulary}</span>
                                {opt.pronunciation && (
                                    <span className="text-sm text-gray-600 mt-1">
                                        /{opt.pronunciation}/
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-end">
                    {!revealed ? (
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm transition"
                        >
                            <QuestionMarkCircleIcon className="w-5 h-5" />
                            Bỏ qua
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (currentIndex >= total - 1) {
                                    handleExit();
                                } else {
                                    handleNext();
                                }
                            }}
                            disabled={submittingExit}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                        >
                            {currentIndex >= total - 1 ? 'Kết thúc' : 'Tiếp theo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashcardQuizPage;
