import { useState, useEffect } from 'react';
import { Modal, Input, Button, message } from 'antd';
import parse from 'html-react-parser';
import AudioPlayerUI from './AudioPlayerUI';
import ImageDisplay from '../../exam/ImageDisplay';
import PassageDisplay from '../../exam/PassageDisplay';
import { reportQuestionIssue } from '../../../api/api';

const { TextArea } = Input;

/**
 * Enum for question report reasons
 */
const EQuestionReportReason = {
    WRONG_ANSWER: 'WRONG_ANSWER',
    TYPO: 'TYPO',
    WRONG_EXPLANATION: 'WRONG_EXPLANATION',
    INCORRECT_CONTENT: 'INCORRECT_CONTENT',
    MISSING_MEDIA: 'MISSING_MEDIA',
    OFFENSIVE_CONTENT: 'OFFENSIVE_CONTENT',
    OTHER: 'OTHER'
};

/**
 * Mapping reasons to Vietnamese labels
 */
const REASON_LABELS = {
    [EQuestionReportReason.WRONG_ANSWER]: 'Đáp án sai',
    [EQuestionReportReason.TYPO]: 'Lỗi chính tả',
    [EQuestionReportReason.WRONG_EXPLANATION]: 'Giải thích sai',
    [EQuestionReportReason.INCORRECT_CONTENT]: 'Nội dung không chính xác',
    [EQuestionReportReason.MISSING_MEDIA]: 'Thiếu file đính kèm (audio/image)',
    [EQuestionReportReason.OFFENSIVE_CONTENT]: 'Nội dung phản cảm',
    [EQuestionReportReason.OTHER]: 'Lý do khác'
};

/**
 * Modal component to report a question issue
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {object} questionData - Question data from UserAnswerDetailResponse
 */
const ReportQuestion = ({ open, onClose, questionData }) => {
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    useEffect(() => {
        if (open && questionData) {
            // Reset form when modal opens
            setSelectedReasons([]);
            setDescription('');
            setShowTranscript(false);
            setShowExplanation(false);
        }
    }, [open, questionData]);

    const handleReasonChange = (reason, checked) => {
        if (checked) {
            setSelectedReasons(prev => [...prev, reason]);
        } else {
            setSelectedReasons(prev => prev.filter(r => r !== reason));
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (selectedReasons.length === 0) {
            message.warning('Vui lòng chọn ít nhất một lý do báo cáo');
            return;
        }

        // Get questionId from questionData
        // API response includes questionId field directly
        const questionId = questionData?.questionId;
        
        if (!questionId) {
            console.error('Question data:', questionData);
            message.error('Không tìm thấy ID câu hỏi để báo cáo. Vui lòng thử lại sau.');
            return;
        }
        
        console.log('Reporting question with questionId:', questionId);

        setSubmitting(true);
        try {
            // Prepare payload matching backend QuestionReportRequest structure
            const payload = {
                questionId: typeof questionId === 'string' ? parseInt(questionId, 10) : Number(questionId),
                reasons: selectedReasons, // Array of EQuestionReportReason enum values
                description: description.trim() || null // Optional field, use null instead of undefined
            };

            // Remove description if it's empty/null to match backend optional field
            if (!payload.description) {
                delete payload.description;
            }

            console.log('Sending report payload:', payload);

            const response = await reportQuestionIssue(payload);
            
            console.log('Report response:', response);
            
            message.success('Báo cáo đã được gửi thành công. Cảm ơn bạn đã đóng góp!');
            
            // Reset form and close modal
            setSelectedReasons([]);
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Error reporting question:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const {
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

    // Ensure options is a valid array
    const allOptions = Array.isArray(options) ? options : [];
    const maxOptions = allOptions.length > 0 ? allOptions.length : 0;
    const shouldShowOptions = maxOptions > 0;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={1200}
            centered
            closable={true}
            className="report-question-modal"
            styles={{
                body: {
                    padding: 0,
                    maxHeight: '85vh',
                    overflow: 'hidden'
                }
            }}
        >
            <div className="flex flex-col lg:flex-row h-[85vh]">
                {/* Left Panel - Question Display */}
                <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto bg-gray-50">
                    <div className="p-6">
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Câu hỏi #{position || ''}
                            </h2>
                            
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
                        {audioUrl && <div className="mb-4"><AudioPlayerUI audioUrl={audioUrl} /></div>}

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
                                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
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
                                    <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200">
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
                                <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {position || ''}
                                </div>
                                {/* Question Content */}
                                {questionContent && (
                                    <div className="flex-1 text-gray-800 text-sm leading-relaxed">
                                        {questionContent}
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            {shouldShowOptions && (
                                <div className="space-y-1 ml-11">
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
                                                className="flex items-center gap-2"
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
                                                    <span className={`text-sm leading-tight ${
                                                        isCorrect
                                                            ? 'text-green-700 font-medium'
                                                            : isWrong
                                                            ? 'text-red-700 font-medium'
                                                            : 'text-gray-800'
                                                    }`}>
                                                        {optionText}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Correct Answer Display - Only show if user hasn't answered or answered incorrectly */}
                            {correctOption && (!userAnswer || userAnswer !== correctOption) && (
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
                    </div>
                </div>

                {/* Right Panel - Report Form */}
                <div className="w-full lg:w-1/2 flex flex-col bg-white">
                    {/* Report Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Báo cáo câu hỏi</h3>
                                <p className="text-xs text-gray-600">Vui lòng chọn lý do và mô tả vấn đề</p>
                            </div>
                        </div>
                    </div>

                    {/* Report Form */}
                    <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                        <div className="space-y-6">
                            {/* Report Reasons */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Lý do báo cáo <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {Object.entries(EQuestionReportReason).map(([key, value]) => {
                                        const isSelected = selectedReasons.includes(value);
                                        return (
                                            <div
                                                key={value}
                                                onClick={() => handleReasonChange(value, !isSelected)}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                                    ${isSelected
                                                        ? 'bg-red-50 border-red-300 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                <div className={`
                                                    flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                    ${isSelected
                                                        ? 'bg-red-600 border-red-600'
                                                        : 'bg-white border-gray-300'
                                                    }
                                                `}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className={`
                                                    text-sm flex-1
                                                    ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}
                                                `}>
                                                    {REASON_LABELS[value]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {selectedReasons.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Vui lòng chọn ít nhất một lý do
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Mô tả chi tiết <span className="text-gray-400">(Tùy chọn)</span>
                                </label>
                                <TextArea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải (nếu có)..."
                                    rows={6}
                                    maxLength={1000}
                                    showCount
                                    className="resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Mô tả chi tiết sẽ giúp chúng tôi xử lý báo cáo nhanh chóng và chính xác hơn.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex gap-3 justify-end">
                            <Button
                                onClick={onClose}
                                disabled={submitting}
                                className="px-6"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="primary"
                                danger
                                onClick={handleSubmit}
                                loading={submitting}
                                disabled={selectedReasons.length === 0 || submitting}
                                className="px-6"
                            >
                                Gửi báo cáo
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ReportQuestion;

