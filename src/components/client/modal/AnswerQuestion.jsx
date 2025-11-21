import { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { viewAnswersQuestionDetail } from '../../../api/api';
import { message } from 'antd';
import parse from 'html-react-parser';
import AudioPlayerUI from './AudioPlayerUI';
import ImageDisplay from '../../exam/ImageDisplay';
import PassageDisplay from '../../exam/PassageDisplay';

/**
 * Modal component to display detailed answer for a question
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {string} userAnswerId - ID of the user answer to fetch details for
 * @param {function} onReport - Callback when report icon is clicked
 * @param {function} onChatAI - Callback when chat AI icon is clicked
 */
const AnswerQuestion = ({ open, onClose, userAnswerId, onReport, onChatAI }) => {
    const [questionData, setQuestionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    useEffect(() => {
        if (open && userAnswerId) {
            fetchQuestionDetails();
        } else {
            // Reset state when modal closes
            setQuestionData(null);
            setShowTranscript(false);
            setShowExplanation(false);
        }
    }, [open, userAnswerId]);

    const fetchQuestionDetails = async () => {
        if (!userAnswerId) return;

        setLoading(true);
        try {
            const response = await viewAnswersQuestionDetail(userAnswerId);
            const data = response.data || null;
            
            // Ensure options is always an array (keep null values for rendering)
            if (data && data.options) {
                data.options = Array.isArray(data.options) 
                    ? data.options 
                    : [];
            }
            
            if (data) {
                setQuestionData({
                    ...data,
                    userAnswerId: data.userAnswerId ?? userAnswerId
                });
            } else {
                setQuestionData(null);
            }
        } catch (error) {
            console.error('Error fetching question details:', error);
            message.error('Không thể tải chi tiết câu hỏi');
            setQuestionData(null);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const {
        questionId,
        position,
        tags = [],
        audioUrl,
        imageUrl,
        passage,
        transcript,
        questionContent,
        options = [],
        correctOption,
        userAnswer = '',
        explanation,
    } = questionData || {};

    // Ensure options is a valid array (keep null values)
    const allOptions = Array.isArray(options) ? options : [];

    // Determine how many options to show based on array length
    // API already handles the options array (Part 2 has 3, other parts have 4)
    const maxOptions = allOptions.length > 0 ? allOptions.length : 0;
    const shouldShowOptions = maxOptions > 0;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            closable={true}
            className="answer-question-modal"
            styles={{
                body: {
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '24px'
                }
            }}
        >
            <div className="answer-question-content">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Đáp án chi tiết #{position || ''}
                        </h2>
                        {/* Action Icons */}
                        <div className="flex items-center gap-3">
                            {/* Report Icon */}
                            <button
                                onClick={() => {
                                    if (onReport && questionData) {
                                        onReport(questionData);
                                        onClose(); // Đóng modal AnswerQuestion
                                    }
                                }}
                                className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all group shadow-sm hover:shadow-md"
                                title="Báo cáo câu hỏi"
                            >
                                <svg
                                    className="w-5 h-5 text-red-600 group-hover:text-red-700 transition-colors"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            {/* Chat AI Icon */}
                            <button
                                onClick={() => {
                                    if (onChatAI && questionData) {
                                        onChatAI(questionData);
                                        onClose(); // Đóng modal AnswerQuestion
                                    }
                                }}
                                className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all group shadow-sm hover:shadow-md"
                                title="Chat với AI về câu hỏi này"
                            >
                                <svg
                                    className="w-5 h-5 text-blue-600 group-hover:text-blue-700 transition-colors"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Tags */}
                    {tags && Array.isArray(tags) && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tags
                                .filter(tag => tag != null)
                                .map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                        </div>
                    )}
                </div>

                {/* Audio Player */}
                {audioUrl && <AudioPlayerUI audioUrl={audioUrl} />}

                {/* Image */}
                {imageUrl && (
                    <div className="mb-4">
                        <ImageDisplay imageUrl={imageUrl} />
                    </div>
                )}

                {/* Passage */}
                {passage && (
                    <div className="mb-4">
                        <PassageDisplay passage={passage} />
                    </div>
                )}

                {/* Transcript Section (Collapsible) */}
                {transcript && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                        >
                            <span className="text-sm font-medium text-gray-700">
                                {showTranscript ? 'Ẩn Transcript' : 'Hiện Transcript'}
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-500 transition-transform ${showTranscript ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showTranscript && (
                            <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-gray-800 text-sm leading-relaxed">
                                    {parse(transcript)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Question Section */}
                <div className="mb-6">
                    {/* Question Number */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                            {position || ''}
                        </div>
                        {/* Question Content */}
                        {questionContent && (
                            <div className="flex-1 text-gray-800 text-base leading-relaxed">
                                {questionContent}
                            </div>
                        )}
                    </div>

                    {/* Options - Always show if there are options in array or part is known */}
                    {shouldShowOptions && (
                        <div className="space-y-2 ml-14">
                            {Array.from({ length: maxOptions }, (_, index) => {
                                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                                const option = allOptions[index];
                                const isCorrectOption = optionLetter === correctOption;
                                const isUserAnswer = optionLetter === userAnswer && userAnswer !== '';
                                
                                // Determine color based on user answer and correct answer
                                // Only color the option that user selected
                                // Green: user selected this option and it's correct
                                const isCorrect = isUserAnswer && isCorrectOption;
                                // Red: user selected this option but it's wrong
                                const isWrong = isUserAnswer && !isCorrectOption;
                                // Default: not answered or not user's selected option
                                
                                // If option is null or empty, just show letter without text
                                // Display option text as-is from API (may contain A, B, C, D prefix)
                                const optionText = (option != null && typeof option === 'string') ? option : '';

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                                            isCorrect
                                                ? 'bg-green-50 border-green-300'
                                                : isWrong
                                                ? 'bg-red-50 border-red-300'
                                                : 'bg-white border-gray-200'
                                        }`}
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
                                            <span className="text-gray-800 text-sm">{optionText}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Correct Answer Display - Only show if user hasn't answered or answered incorrectly */}
                    {correctOption && (!userAnswer || userAnswer !== correctOption) && (
                        <div className="mt-4 ml-14">
                            <p className="text-sm font-semibold text-green-600">
                                Đáp án đúng: {correctOption}
                            </p>
                        </div>
                    )}
                </div>

                {/* Explanation Section (Collapsible) */}
                {explanation && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowExplanation(!showExplanation)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                        >
                            <span className="text-sm font-medium text-gray-700">
                                Giải thích chi tiết đáp án
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-500 transition-transform ${showExplanation ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showExplanation && (
                            <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                    {explanation}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12 text-gray-500">
                        Đang tải...
                    </div>
                )}

                {/* No Data State */}
                {!loading && !questionData && (
                    <div className="text-center py-12 text-gray-500">
                        Không có dữ liệu câu hỏi
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AnswerQuestion;

