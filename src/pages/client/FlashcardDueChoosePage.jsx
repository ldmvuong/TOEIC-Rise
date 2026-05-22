import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardDueItems } from '../../api/api';

const GAMES = [
    { key: 'match', label: 'Match words with meanings', path: '/flashcards/due/match', color: '#3b82f6' },
    { key: 'quiz', label: 'Multiple-choice quiz', path: '/flashcards/due/quiz', color: '#8b5cf6' },
    { key: 'type', label: 'See the meaning, type the English word', path: '/flashcards/due/type', color: '#f97316' },
];

const FlashcardDueChoosePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dueItems, setDueItems] = useState([]);

    useEffect(() => {
        const fetchDue = async () => {
            setLoading(true);
            try {
                const res = await callFetchFlashcardDueItems();
                const data = res?.data;
                const list = Array.isArray(data) ? data : (data?.result ?? []);
                setDueItems(list);
            } catch (err) {
                console.error(err);
                message.error(err?.message || 'Unable to load words due for review');
            } finally {
                setLoading(false);
            }
        };
        fetchDue();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (!dueItems.length) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <p className="text-gray-600 mb-6">No words are due for review right now.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/flashcards', { state: { activeTab: 'review' } })}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Review
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto max-w-2xl">
                <button
                    type="button"
                    onClick={() => navigate('/flashcards', { state: { activeTab: 'review' } })}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Review
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Choose a practice mode</h1>
                <p className="text-gray-500 mb-8">
                    You have <span className="font-semibold text-gray-700">{dueItems.length}</span> words due for review. Choose a game below to begin.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {GAMES.map((game) => (
                        <button
                            key={game.key}
                            type="button"
                            onClick={() => navigate(game.path)}
                            className="rounded-2xl p-6 text-left text-white font-medium shadow-md hover:shadow-lg transition flex flex-col items-center justify-center min-h-[120px]"
                            style={{ backgroundColor: game.color }}
                        >
                            <span className="text-center">{game.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FlashcardDueChoosePage;
