import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, Spin, message as antdMessage } from 'antd';
import parse from 'html-react-parser';
import AudioPlayerUI from './AudioPlayerUI';
import ImageDisplay from '../../exam/ImageDisplay';
import PassageDisplay from '../../exam/PassageDisplay';
import DictionaryText from '../../shared/DictionaryText';
import { marked } from 'marked';
import api from '../../../api/axios-customize';

marked.setOptions({
    breaks: true,
    gfm: true
});

const { TextArea } = Input;

/**
 * Modal component to display question and chat with AI
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {object} questionData - Question data from UserAnswerDetailResponse
 */
const renderPlainText = (text = '') => {
    if (!text) return null;
    const segments = text.split('\n');
    return segments.map((segment, index) => (
        <span key={`segment-${index}`}>
            {segment}
            {index < segments.length - 1 && <br />}
        </span>
    ));
};

const ChatQuestion = ({ open, onClose, questionData }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isQuestionPanelVisible, setIsQuestionPanelVisible] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
    );
    const [conversationId, setConversationId] = useState('');
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const conversationIdRef = useRef('');

    useEffect(() => {
        if (open && questionData) {
            // Reset messages when modal opens
            setMessages([]);
            setInputMessage('');
            setShowTranscript(false);
            setShowExplanation(false);
            setIsQuestionPanelVisible(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
            setConversationId('');
            conversationIdRef.current = '';
        }
    }, [open, questionData]);

    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    // Auto scroll to bottom when new message arrives
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || sending) return;

        const resolvedUserAnswerId =
            questionData?.userAnswerId ??
            questionData?.userAnswerID ??
            questionData?.userAnswer?.id ??
            questionData?.id;

        if (!resolvedUserAnswerId) {
            antdMessage.warning('Không tìm thấy userAnswerId để chat với AI.');
            return;
        }

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        // Add user message
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setSending(true);

        const assistantMessageId = `assistant-${Date.now()}`;
        const backendUrl =
            api?.defaults?.baseURL ||
            import.meta.env.VITE_BACKEND_URL ||
            window.location.origin;
        const token = localStorage.getItem('access_token');

        setMessages(prev => [
            ...prev,
            {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date()
            }
        ]);

        const formData = new FormData();
        formData.append('message', userMessage.content);
        formData.append('userAnswerId', resolvedUserAnswerId);
        if (conversationIdRef.current) {
            formData.append('conversationId', conversationIdRef.current);
        }

        let aggregatedContent = '';

        try {
            const response = await fetch(`${backendUrl}/learner/chatbot/chat-about-question`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    Accept: 'text/event-stream, application/json'
                }
            });

            if (!response.ok || !response.body) {
                throw new Error('Không nhận được phản hồi từ AI.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            const processBuffer = () => {
                const findBoundary = () => {
                    const doubleNewLine = buffer.indexOf('\n\n');
                    const doubleCarriage = buffer.indexOf('\r\n\r\n');
                    if (doubleNewLine === -1 && doubleCarriage === -1) return null;
                    if (doubleNewLine === -1) return { index: doubleCarriage, length: 4 };
                    if (doubleCarriage === -1) return { index: doubleNewLine, length: 2 };
                    return doubleNewLine < doubleCarriage
                        ? { index: doubleNewLine, length: 2 }
                        : { index: doubleCarriage, length: 4 };
                };

                let boundary;
                // eslint-disable-next-line no-cond-assign
                while ((boundary = findBoundary()) !== null) {
                    const rawEvent = buffer.slice(0, boundary.index).trim();
                    buffer = buffer.slice(boundary.index + boundary.length);

                    if (!rawEvent.startsWith('data:')) continue;
                    const payloadStr = rawEvent.replace(/^data:\s*/, '');
                    if (!payloadStr || payloadStr === '[DONE]') continue;

                    try {
                        const payload = JSON.parse(payloadStr);
                        if (payload.conversationId && !conversationIdRef.current) {
                            conversationIdRef.current = payload.conversationId;
                            setConversationId(payload.conversationId);
                        }

                        if (payload.content) {
                            aggregatedContent += payload.content;
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === assistantMessageId
                                        ? {
                                              ...msg,
                                              content: aggregatedContent,
                                              messageType: payload.messageType,
                                              timestamp: new Date()
                                          }
                                        : msg
                                )
                            );
                        }
                    } catch (err) {
                        console.error('Không parse được dữ liệu AI:', err);
                    }
                }
            };

            while (true) {
                let readResult;
                try {
                    readResult = await reader.read();
                } catch (readError) {
                    console.warn('Stream closed unexpectedly:', readError);
                    break;
                }
                const { value, done } = readResult;
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                processBuffer();
            }

            buffer += decoder.decode();
            processBuffer();
        } catch (error) {
            console.error(error);
            if (!aggregatedContent) {
                antdMessage.error(error.message || 'Không thể gửi tin nhắn tới AI.');
                setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            } else {
                console.warn('AI stream ended with warning after delivering content.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
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
            className="chat-question-modal"
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
                {isQuestionPanelVisible && (
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
                                        <DictionaryText className="text-gray-800 text-sm leading-relaxed">
                                            {parse(transcript)}
                                        </DictionaryText>
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
                                    <DictionaryText className="flex-1 text-gray-800 text-sm leading-relaxed">
                                        {parse(questionContent)}
                                    </DictionaryText>
                                )}
                            </div>

                            {/* Options */}
                            {shouldShowOptions && (
                                <div className="space-y-1 ml-0 lg:ml-11">
                                    {Array.from({ length: maxOptions }, (_, index) => {
                                        const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                                        const option = allOptions[index];
                                        const isCorrectOption = optionLetter === correctOption;
                                        const isUserAnswer = optionLetter === userAnswer && userAnswer !== '';
                                        
                                        const isCorrect = isUserAnswer && isCorrectOption;
                                        const isWrong = isUserAnswer && !isCorrectOption;
                                        
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
                                                    <DictionaryText className={`text-sm leading-tight ${
                                                        isCorrect
                                                            ? 'text-green-700 font-medium'
                                                            : isWrong
                                                            ? 'text-red-700 font-medium'
                                                            : 'text-gray-800'
                                                    }`}>
                                                        {parse(optionText)}
                                                    </DictionaryText>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Correct Answer Display */}
                            {correctOption && (
                                <div className="mt-4 ml-0 lg:ml-11">
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
                )}

                {/* Right Panel - Chat with AI */}
                <div className={`${isQuestionPanelVisible ? 'w-full lg:w-1/2' : 'w-full'} flex flex-col bg-white`}>
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Chat với AI</h3>
                                    <p className="text-xs text-gray-600">Hỏi về câu hỏi này</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsQuestionPanelVisible(prev => !prev)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 transition-colors"
                            >
                                {isQuestionPanelVisible ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'}
                                <svg
                                    className={`w-4 h-4 transition-transform ${isQuestionPanelVisible ? '' : 'rotate-180'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div 
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto p-6 space-y-4"
                        style={{ maxHeight: 'calc(85vh - 180px)' }}
                    >
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm">Bắt đầu cuộc trò chuyện với AI</p>
                                <p className="text-xs mt-1">Hỏi về câu hỏi, đáp án, hoặc giải thích</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                                            msg.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                    >
                                        <div
                                            className={
                                                msg.role === 'assistant'
                                                    ? 'text-sm leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mt-1 [&_strong]:font-semibold [&_em]:italic'
                                                    : 'text-sm leading-relaxed whitespace-pre-wrap'
                                            }
                                        >
                                            {msg.role === 'assistant'
                                                ? parse(
                                                      marked.parse(msg.content || '', {
                                                          breaks: true
                                                      })
                                                  )
                                                : renderPlainText(msg.content || '')}
                                        </div>
                                        <div
                                            className={`text-xs mt-2 ${
                                                msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                                            }`}
                                        >
                                            {msg.timestamp.toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex gap-2">
                            <TextArea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập câu hỏi của bạn..."
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                disabled={sending}
                                className="flex-1"
                            />
                            <Button
                                type="primary"
                                onClick={handleSendMessage}
                                loading={sending}
                                disabled={!inputMessage.trim() || sending}
                                className="px-6"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                }
                            >
                                Gửi
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ChatQuestion;

