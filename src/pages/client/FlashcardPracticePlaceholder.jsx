import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Spin, message } from 'antd';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardReview } from '../../api/api';

const MODES = {
    match: {
        title: 'Match words with meanings',
        description: 'Drag and drop or select matching word-definition pairs. This feature is under development.',
    },
    quiz: {
        title: 'Multiple-choice quiz',
        description: 'A 4-option quiz where you choose the correct answer. This feature is under development.',
    },
    type: {
        title: 'See the meaning, type the English word',
        description: 'View the meaning and type the matching English vocabulary term. This feature is under development.',
    },
    'sentence-practice': {
        title: 'Sentence practice with AI',
        description: 'Create sentences with vocabulary and receive AI feedback. This feature is under development.',
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
                setError(err?.message || 'Unable to load practice data');
                message.error(err?.message || 'Unable to load practice data');
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
    const mode = modeKey ? MODES[modeKey] : { title: 'Practice mode', description: 'This feature is under development.' };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full shadow-lg rounded-xl">
                <div className="text-center py-6">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Spin size="large" />
                            <p className="text-gray-600">Loading practice data...</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">{mode.title}</h1>
                            <p className="text-gray-600 mb-2">{mode.description}</p>
                            {!error && reviewItems.length > 0 && (
                                <p className="text-sm text-gray-500 mb-4">Loaded {reviewItems.length} vocabulary terms from the review API.</p>
                            )}
                            <Button
                                type="primary"
                                icon={<ArrowLeftIcon className="w-4 h-4" />}
                                onClick={() => navigate(`/flashcards/${id}`)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Back to flashcard set
                            </Button>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default FlashcardPracticePlaceholder;
