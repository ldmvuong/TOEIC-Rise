import { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { getQuestionDetail } from '../../../api/api';
import AudioPlayerUI from './AudioPlayerUI';
import ImageDisplay from '../../exam/ImageDisplay';
import PassageDisplay from '../../exam/PassageDisplay';
import DictionaryText from '../../shared/DictionaryText';

/**
 * Modal hiển thị chi tiết 1 câu hỏi (dùng cho bình luận, xem nhanh)
 *
 * Props:
 * - open: boolean - mở / đóng modal
 * - onClose: () => void - callback khi đóng
 * - questionId: number | null - id câu hỏi cần xem
 */
const QuestionModal = ({ open, onClose, questionId }) => {
    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    useEffect(() => {
        if (!open || !questionId) {
            setQuestion(null);
            setShowTranscript(false);
            setShowExplanation(false);
            return;
        }

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await getQuestionDetail(questionId);
                const data = res?.data ?? res;
                setQuestion(data || null);
            } catch (err) {
                message.error(err?.message || 'Không thể tải chi tiết câu hỏi');
                setQuestion(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [open, questionId]);

    if (!open) return null;

    const {
        position,
        content,
        options = [],
        correctOption,
        explanation,
        tags = [],
        group = {},
    } = question || {};

    const {
        audioUrl,
        imageUrl,
        passage,
        transcript,
        partName,
    } = group || {};

    const allOptions = Array.isArray(options) ? options : [];
    // Với Part 2 chỉ hiển thị 3 lựa chọn A/B/C, các part khác hiển thị theo số lượng options thực tế
    const maxOptions =
        partName && partName.trim().toLowerCase().startsWith('part 2')
            ? 3
            : allOptions.length > 0
            ? allOptions.length
            : 0;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            closable
            className="answer-question-modal"
            styles={{
                body: {
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '24px',
                },
            }}
        >
            <div className="answer-question-content">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Câu {position}{partName ? ` • ${partName}` : ''}
                        </h2>
                    </div>

                    {/* Tags */}
                    {tags && Array.isArray(tags) && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tags
                                .filter((tag) => tag != null)
                                .map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200"
                                    >
                                        {tag.name}
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
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>
                        {showTranscript && (
                            <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <DictionaryText className="text-gray-800 text-sm leading-relaxed">
                                    {transcript}
                                </DictionaryText>
                            </div>
                        )}
                    </div>
                )}

                {/* Question Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {position}
                        </div>
                        {content && (
                            <DictionaryText className="flex-1 text-gray-800 text-sm leading-relaxed">
                                {content}
                            </DictionaryText>
                        )}
                    </div>

                    {/* Options */}
                    {maxOptions > 0 && (
                        <div className="space-y-1 ml-11">
                            {Array.from({ length: maxOptions }, (_, index) => {
                                const option = allOptions[index];
                                const optionLetter = String.fromCharCode(65 + index);
                                const optionText =
                                    option != null && typeof option === 'string' ? option : '';
                                const isCorrect = optionLetter === correctOption;

                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        <div
                                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                isCorrect
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {optionLetter}
                                        </div>
                                        {optionText && (
                                            <DictionaryText
                                                className={`text-sm leading-tight ${
                                                    isCorrect
                                                        ? 'text-green-700 font-medium'
                                                        : 'text-gray-800'
                                                }`}
                                            >
                                                {optionText}
                                            </DictionaryText>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {correctOption && (
                        <div className="mt-4 ml-11">
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
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
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

                {/* Loading / Empty states */}
                {loading && (
                    <div className="text-center py-12 text-gray-500">
                        Đang tải...
                    </div>
                )}

                {!loading && !question && (
                    <div className="text-center py-12 text-gray-500">
                        Không có dữ liệu câu hỏi
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QuestionModal;