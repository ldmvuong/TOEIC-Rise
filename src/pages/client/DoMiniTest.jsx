import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { scrollToElement } from '../../utils/scrollUtils';
import MiniTestSidebar from '../../components/mini-test/sidebar';
import MiniTestQuestionGroup from '../../components/mini-test/questiongroup';
import { submitMiniTest } from '../../api/api';

const DoMiniTest = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const testData = location.state?.testData;
    const selectedTags = location.state?.selectedTags || [];
    const passedPartNumber = location.state?.partNumber; // part được truyền khi tạo bài test
    
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
    const [currentQuestionId, setCurrentQuestionId] = useState(null);
    const [activeAudios, setActiveAudios] = useState({}); // { groupId: audioElement }
    const [flaggedQuestions, setFlaggedQuestions] = useState([]); // Array of questionIds

    // Flatten all questions from all question groups
    // Hỗ trợ cả cấu trúc cũ (2D array) và cấu trúc mới (1D array với index/position)
    const allQuestions = testData?.questionGroups?.reduce((acc, group) => {
        if (!group?.questions) return acc;

        const questions = group.questions;

        // Cấu trúc cũ: [[q1, q2], [q3, q4]]
        if (Array.isArray(questions[0])) {
            questions.forEach((row) => {
                if (!Array.isArray(row)) return;
                row.forEach((question) => {
                    if (question?.id) {
                        acc.push({
                            ...question,
                            groupId: group.id,
                            groupAudioUrl: group.audioUrl,
                            groupImageUrl: group.imageUrl,
                            groupPassage: group.passage,
                            groupPosition: group.position
                        });
                    }
                });
            });
        } else {
            // Cấu trúc mới: [q1, q2, q3]
            questions.forEach((question) => {
                if (question?.id) {
                    acc.push({
                        ...question,
                        groupId: group.id,
                        groupAudioUrl: group.audioUrl,
                        groupImageUrl: group.imageUrl,
                        groupPassage: group.passage,
                        groupPosition: group.position
                    });
                }
            });
        }

        return acc;
    }, []) || [];

    // Group questions by questionGroup for display
    const questionGroupsMap = {};
    testData?.questionGroups?.forEach(group => {
        questionGroupsMap[group.id] = group;
    });

    useEffect(() => {
        if (testData) {
            setLoading(false);
            // Set first question as current
            if (allQuestions.length > 0) {
                setCurrentQuestionId(allQuestions[0].id);
            }
        } else {
            message.error('Không tìm thấy dữ liệu test');
            navigate('/statistics');
        }
    }, [testData]);

    // Handle question answer change
    const handleQuestionChange = (updatedQuestion, questionIndex) => {
        if (updatedQuestion?.id) {
            setAnswers(prev => ({
                ...prev,
                [updatedQuestion.id]: updatedQuestion.selectedOptionIndex
            }));
        }
    };

    // Handle navigation to question
    const handleNavigateToQuestion = (questionId) => {
        setCurrentQuestionId(questionId);
        scrollToElement(`question-${questionId}`, { behavior: 'smooth', block: 'start' });
    };

    // Handle toggle flag question
    const handleToggleFlag = (questionId) => {
        setFlaggedQuestions(prev => {
            if (prev.includes(questionId)) {
                return prev.filter(id => id !== questionId);
            } else {
                return [...prev, questionId];
            }
        });
    };

    // Handle submit test
    const handleSubmitTest = async () => {
        // Confirm before submitting
        Modal.confirm({
            title: 'Xác nhận nộp bài',
            content: 'Bạn có chắc chắn muốn nộp bài? Sau khi nộp bài, bạn không thể thay đổi câu trả lời.',
            okText: 'Nộp bài',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    // Build questionGroups payload theo đúng thứ tự questionGroups trong đề
                    // và đúng thứ tự câu hỏi bên trong mỗi group
                    const questionGroups = (testData.questionGroups || []).map(group => {
                        const rawQuestions = group.questions || [];
                        const flatQuestions = Array.isArray(rawQuestions[0]) ? rawQuestions.flat() : rawQuestions;

                        const userAnswerRequests = flatQuestions
                            .filter(q => q && q.id)
                            .map(q => {
                                let answerValue = '';
                                if (answers[q.id] !== undefined) {
                                    const optionIndex = answers[q.id];
                                    answerValue = String.fromCharCode(65 + optionIndex); // 0->A,1->B...
                                }
                                return {
                                    questionId: q.id,
                                    answer: answerValue
                                };
                            });

                        return {
                            questionGroupId: group.id,
                            userAnswerRequests
                        };
                    });

                    const payload = { questionGroups };

                    // Call API
                    const response = await submitMiniTest(payload);
                    
                    // If successful, navigate to result page
                    if (response && response.data) {
                        navigate('/mini-test-result', { 
                            state: { 
                                resultData: response.data,
                                testData: testData,
                                selectedTags: selectedTags,
                                partNumber
                            } 
                        });
                    }
                } catch (error) {
                    console.error('Error submitting mini test:', error);
                    message.error(error?.response?.data?.message || 'Không thể nộp bài. Vui lòng thử lại.');
                }
            }
        });
    };

    // Handle audio play/pause for each group
    const handleAudioToggle = (groupId, audioUrl) => {
        const audioId = `audio-${groupId}`;
        const audioElement = document.getElementById(audioId);
        
        if (!audioElement) return;

        if (activeAudios[groupId]) {
            // Pause current audio
            audioElement.pause();
            setActiveAudios(prev => {
                const newState = { ...prev };
                delete newState[groupId];
                return newState;
            });
        } else {
            // Pause all other audios
            Object.keys(activeAudios).forEach(key => {
                const otherAudio = document.getElementById(`audio-${key}`);
                if (otherAudio) otherAudio.pause();
            });
            
            // Play selected audio
            audioElement.play();
            setActiveAudios({ [groupId]: audioElement });
            
            // Handle audio end
            audioElement.onended = () => {
                setActiveAudios(prev => {
                    const newState = { ...prev };
                    delete newState[groupId];
                    return newState;
                });
            };
        }
    };

    if (loading || !testData) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-gray-500">Đang tải...</div>
            </div>
        );
    }

    // Lấy partNumber: ưu tiên giá trị truyền qua location.state (khi tạo bài test)
    // Nếu không có, fallback đọc từ tags như cũ
    let partNumber = passedPartNumber ?? 1;
    if (!passedPartNumber && allQuestions.length > 0) {
        const firstQuestionTags = allQuestions[0]?.tags || [];
        for (const tag of firstQuestionTags) {
            const match = tag.match(/Part\s+(\d+)/);
            if (match) {
                partNumber = parseInt(match[1]);
                break;
            }
        }
    }
    const isListeningPart = partNumber >= 1 && partNumber <= 4;

    return (
        <div className="h-screen flex overflow-hidden bg-gray-50">
            {/* Main Content - 85% */}
            <div className="flex-1 flex flex-col overflow-y-auto" style={{ width: '85%' }}>
                <div className="p-6 max-w-4xl mx-auto w-full">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Mini Test</h1>
                    </div>

                    {/* All Question Groups - Single Page */}
                    <div className="space-y-8">
                        {testData.questionGroups.map((group, groupIndex) => (
                            <MiniTestQuestionGroup
                                key={group.id}
                                questionGroup={group}
                                onQuestionChange={handleQuestionChange}
                                partNumber={partNumber}
                                flaggedQuestions={flaggedQuestions}
                                onToggleFlag={handleToggleFlag}
                                isListeningPart={isListeningPart}
                                showAudioControl={isListeningPart}
                                onAudioToggle={handleAudioToggle}
                                isAudioPlaying={!!activeAudios[group.id]}
                                answers={answers}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar - 15% */}
            <MiniTestSidebar
                partNumber={partNumber}
                questions={allQuestions}
                currentQuestionId={currentQuestionId}
                onNavigateToQuestion={handleNavigateToQuestion}
                answers={answers}
                flaggedQuestions={flaggedQuestions}
                onToggleFlag={handleToggleFlag}
                selectedTags={selectedTags}
                onSubmitTest={handleSubmitTest}
            />
        </div>
    );
};

export default DoMiniTest;
