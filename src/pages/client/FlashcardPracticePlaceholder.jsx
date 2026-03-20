import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Spin, message } from 'antd';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardReview } from '../../api/api';

const MODES = {
    match: {
        title: 'Nối từ với nghĩa',
        description: 'Kéo thả hoặc chọn cặp từ vựng – nghĩa tương ứng. Tính năng đang được phát triển.',
    },
    quiz: {
        title: 'Trắc nghiệm lựa chọn',
        description: 'Trắc nghiệm 4 đáp án, chọn 1 đáp án đúng. Tính năng đang được phát triển.',
    },
    type: {
        title: 'Hiển thị tiếng Việt, nhập từ tiếng Anh',
        description: 'Xem nghĩa tiếng Việt và gõ từ vựng tiếng Anh tương ứng. Tính năng đang được phát triển.',
    },
    'sentence-practice': {
        title: 'Luyện câu với AI',
        description: 'Tạo câu với từ vựng và nhận phản hồi từ AI. Tính năng đang được phát triển.',
    },
};

const FlashcardPracticePlaceholder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [loading, setLoading] = useState(true);
    const [reviewItems, setReviewItems] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        const fetchReview = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await callFetchFlashcardReview(id);
                const data = res?.data;
                const list = Array.isArray(data) ? data : (data?.result ?? []);
                setReviewItems(list);
            } catch (err) {
                setError(err?.message || 'Không thể tải dữ liệu luyện tập');
                message.error(err?.message || 'Không thể tải dữ liệu luyện tập');
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [id]);

    const modeKey = pathname.includes('sentence-practice')
        ? 'sentence-practice'
        : pathname.includes('match')
            ? 'match'
            : pathname.includes('quiz')
                ? 'quiz'
                : pathname.includes('type')
                    ? 'type'
                    : null;
    const mode = modeKey ? MODES[modeKey] : { title: 'Chế độ luyện tập', description: 'Tính năng đang được phát triển.' };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full shadow-lg rounded-xl">
                <div className="text-center py-6">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Spin size="large" />
                            <p className="text-gray-600">Đang tải dữ liệu luyện tập...</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">{mode.title}</h1>
                            <p className="text-gray-600 mb-2">{mode.description}</p>
                            {!error && reviewItems.length > 0 && (
                                <p className="text-sm text-gray-500 mb-4">Đã tải {reviewItems.length} từ vựng từ API review.</p>
                            )}
                            <Button
                                type="primary"
                                icon={<ArrowLeftIcon className="w-4 h-4" />}
                                onClick={() => navigate(`/flashcards/${id}`)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Quay lại bộ thẻ
                            </Button>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default FlashcardPracticePlaceholder;
