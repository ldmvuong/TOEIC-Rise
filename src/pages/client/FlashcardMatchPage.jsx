import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Spin, message, Modal } from 'antd';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardReview, callSubmitFlashcardProgress, callFetchFlashcardDueItems } from '../../api/api';

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const PAIRS_PER_BATCH = 6;

const FlashcardMatchPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isDueMode = location.pathname.startsWith('/flashcards/due/');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [batchIndex, setBatchIndex] = useState(0);
    const [selectedCard, setSelectedCard] = useState(null);
    const [matchedPairIds, setMatchedPairIds] = useState(new Set());
    const [feedback, setFeedback] = useState(null); // { status: 'correct' | 'wrong', cards: [{ pairId, type }, { pairId, type }] }
    const [progressMap, setProgressMap] = useState({}); // { [flashcardItemId]: { isCorrect: boolean } }
    const [submittingExit, setSubmittingExit] = useState(false);

    const currentBatchItems = useMemo(
        () => items.slice(batchIndex * PAIRS_PER_BATCH, (batchIndex + 1) * PAIRS_PER_BATCH),
        [items, batchIndex]
    );

    const cards = useMemo(() => {
        if (!currentBatchItems.length) return [];
        const list = currentBatchItems.map((item) => {
            const pairId = item.id;
            const def = item.definition || '';
            const voc = item.vocabulary || item.word || '';
            return [
                { pairId, type: 'definition', text: def },
                { pairId, type: 'vocabulary', text: voc, pronunciation: item.pronunciation || null },
            ];
        });
        return shuffleArray(list.flat());
    }, [currentBatchItems]);

    useEffect(() => {
        if (isDueMode) {
            const fetchDue = async () => {
                setLoading(true);
                try {
                    const res = await callFetchFlashcardDueItems();
                    const data = res?.data;
                    const list = Array.isArray(data) ? data : (data?.result ?? []);
                    setItems(list);
                    setBatchIndex(0);
                    setSelectedCard(null);
                    setMatchedPairIds(new Set());
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
                setBatchIndex(0);
                setSelectedCard(null);
                setMatchedPairIds(new Set());
                setProgressMap({});
            } catch (err) {
                message.error(err?.message || 'Không thể tải dữ liệu luyện tập');
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [id, isDueMode]);

    const totalBatches = Math.ceil(items.length / PAIRS_PER_BATCH);
    const isLastBatch = batchIndex >= totalBatches - 1;
    const batchComplete = currentBatchItems.length > 0 && matchedPairIds.size === currentBatchItems.length;

    useEffect(() => {
        if (batchComplete && !isLastBatch) {
            setBatchIndex((i) => i + 1);
            setMatchedPairIds(new Set());
            setSelectedCard(null);
        }
    }, [batchComplete, isLastBatch]);

    const visibleCards = useMemo(
        () => cards.filter((c) => !matchedPairIds.has(c.pairId)),
        [cards, matchedPairIds]
    );

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

    const handleCardClick = (card) => {
        // Đang hiển thị feedback thì không cho click thêm
        if (feedback) return;

        if (!selectedCard) {
            setSelectedCard({ pairId: card.pairId, type: card.type });
            return;
        }

        // Bấm lại đúng ô đang chọn -> bỏ chọn
        if (selectedCard.pairId === card.pairId && selectedCard.type === card.type) {
            setSelectedCard(null);
            return;
        }

        const secondCard = { pairId: card.pairId, type: card.type };
        const isMatch = selectedCard.pairId === secondCard.pairId && selectedCard.type !== secondCard.type;

        if (isMatch) {
            markCorrect(secondCard.pairId);
            const cardsInPair = [selectedCard, secondCard];
            setFeedback({ status: 'correct', cards: cardsInPair });

            setTimeout(() => {
                setMatchedPairIds((prev) => {
                    const next = new Set(prev);
                    next.add(secondCard.pairId);
                    return next;
                });
                setSelectedCard(null);
                setFeedback(null);
            }, 500);
        } else {
            // Sai 1 lần là tính sai vĩnh viễn cho cả 2 item liên quan
            markWrong(selectedCard.pairId);
            markWrong(secondCard.pairId);
            const wrongCards = [selectedCard, secondCard];
            setFeedback({ status: 'wrong', cards: wrongCards });

            setTimeout(() => {
                setSelectedCard(null);
                setFeedback(null);
            }, 700);
        }
    };

    const isSelected = (card) =>
        !feedback &&
        selectedCard &&
        selectedCard.pairId === card.pairId &&
        selectedCard.type === card.type;

    const isInFeedback = (card, status) =>
        feedback &&
        feedback.status === status &&
        feedback.cards?.some((c) => c.pairId === card.pairId && c.type === card.type);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1e222d] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Spin size="large" className="text-green-500" />
                    <p className="text-gray-400">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="min-h-screen bg-[#1e222d] flex items-center justify-center p-4">
                <div className="text-center text-gray-400">
                    <p className="mb-4">Chưa có từ vựng để luyện tập.</p>
                    <button
                        onClick={() => navigate(isDueMode ? '/flashcards/due' : `/flashcards/${id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B3141] text-white rounded-xl hover:bg-[#353b4a] transition"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Quay lại bộ thẻ
                    </button>
                </div>
            </div>
        );
    }

    const allMatched = visibleCards.length === 0;
    const allDone = allMatched && isLastBatch;
    const totalMatchedSoFar = batchIndex * PAIRS_PER_BATCH + matchedPairIds.size;

    return (
        <div className="min-h-screen bg-[#1e222d] text-gray-100 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2B3141]">
                <button
                    onClick={handleExit}
                    className="p-2 rounded-lg hover:bg-[#2B3141] transition flex items-center gap-2 text-gray-300 hover:text-white"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Quay lại</span>
                </button>
                <span className="text-sm text-gray-400">
                    Nối từ với nghĩa · Lượt {batchIndex + 1}/{totalBatches} · Đã nối {totalMatchedSoFar}/{items.length} cặp
                </span>
            </div>

            <div className="flex-1 p-4 overflow-auto flex flex-col min-h-0">
                {allDone ? (
                    <div className="flex flex-col items-center justify-center py-16 flex-1">
                        <p className="text-xl font-semibold text-green-400 mb-4">Hoàn thành!</p>
                        <p className="text-gray-400 mb-6">Bạn đã nối đúng tất cả cặp từ.</p>
                        <button
                            onClick={handleExit}
                            disabled={submittingExit}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
                        >
                            {isDueMode ? 'Quay lại chọn game' : 'Quay lại bộ thẻ'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 grid-rows-3 flex-1 w-full min-h-[50vh] gap-3 sm:gap-4">
                        {visibleCards.map((card, indexInVisible) => {
                            const selected = isSelected(card);
                            const isCorrectFeedback = isInFeedback(card, 'correct');
                            const isWrongFeedback = isInFeedback(card, 'wrong');
                            return (
                                <button
                                    key={`${card.pairId}-${card.type}-${indexInVisible}`}
                                    type="button"
                                    onClick={() => handleCardClick(card)}
                                    className={`p-4 sm:p-5 rounded-xl text-left transition min-h-[80px] sm:min-h-[120px] flex flex-col justify-center flex-1 md:min-h-0 md:h-full ${
                                        isCorrectFeedback
                                            ? 'bg-green-600 border-2 border-green-400'
                                            : isWrongFeedback
                                                ? 'bg-red-600 border-2 border-red-400'
                                                : selected
                                                    ? 'bg-[#5F677A] border-2 border-[#7a8299]'
                                                    : 'bg-[#2B3141] border border-[#353b4a] hover:border-[#4a5166]'
                                    }`}
                                >
                                    <span className="text-white font-medium text-base sm:text-lg leading-snug break-words">
                                        {card.text || '—'}
                                    </span>
                                    {card.pronunciation && (
                                        <span className="text-gray-400 text-sm mt-1">
                                            /{card.pronunciation}/
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardMatchPage;
