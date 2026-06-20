import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message, Card } from 'antd';
import { ArrowLeftIcon, ArrowsRightLeftIcon, ClipboardDocumentCheckIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { callFetchFlashcardDueItems } from '../../api/api';

const GAMES = [
    {
        key: 'match',
        title: 'Match words with meanings',
        description: 'Drag and drop or select matching word-definition pairs',
        path: '/flashcards/due/match',
        icon: ArrowsRightLeftIcon,
        accentBorder: 'border-l-blue-600',
        iconWrap: 'bg-blue-50 text-blue-600',
        colSpan: 'md:col-span-2',
    },
    {
        key: 'quiz',
        title: 'Multiple-choice quiz',
        description: 'A 4-option quiz where you choose the correct answer for each word',
        path: '/flashcards/due/quiz',
        icon: ClipboardDocumentCheckIcon,
        accentBorder: 'border-l-violet-600',
        iconWrap: 'bg-violet-50 text-violet-600',
        colSpan: 'md:col-span-2',
    },
    {
        key: 'type',
        title: 'See the meaning, type the English word',
        description: 'View the meaning and type the matching English vocabulary term',
        path: '/flashcards/due/type',
        icon: LanguageIcon,
        accentBorder: 'border-l-amber-500',
        iconWrap: 'bg-amber-50 text-amber-600',
        colSpan: 'md:col-span-2',
    },
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
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <button
                    type="button"
                    onClick={() => navigate('/flashcards', { state: { activeTab: 'review' } })}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Review</span>
                </button>

                <Card className="shadow-md rounded-xl border-gray-200 bg-white">
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Words due for review</h1>
                            <p className="text-gray-600">
                                You have <span className="font-semibold text-gray-800">{dueItems.length}</span> vocabulary terms due for review. Choose a practice mode below to begin.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="shadow-sm rounded-xl border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {GAMES.map((game) => {
                            const Icon = game.icon;
                            return (
                                <button
                                    key={game.key}
                                    type="button"
                                    onClick={() => navigate(game.path)}
                                    className={`p-4 rounded-xl text-left bg-white border border-gray-200 border-l-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all ${game.accentBorder} ${game.colSpan}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${game.iconWrap}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold text-gray-800 leading-snug">
                                            {game.title}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {game.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FlashcardDueChoosePage;
