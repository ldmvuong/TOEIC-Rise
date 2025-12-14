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
    
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
    const [currentQuestionId, setCurrentQuestionId] = useState(null);
    const [activeAudios, setActiveAudios] = useState({}); // { groupId: audioElement }
    const [flaggedQuestions, setFlaggedQuestions] = useState([]); // Array of questionIds

    // Flatten all questions from all question groups
    const allQuestions = testData?.questionGroups?.reduce((acc, group) => {
        group.questions.forEach(questionRow => {
            questionRow.forEach(question => {
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
                    // Build userAnswerRequests array
                    const userAnswerRequests = allQuestions.map(question => {
                        // Get answer from state, convert from index (0,1,2,3) to letter (A,B,C,D)
                        let answerValue = '';
                        if (answers[question.id] !== undefined) {
                            const optionIndex = answers[question.id];
                            // Convert index to letter: 0 -> A, 1 -> B, 2 -> C, 3 -> D
                            answerValue = String.fromCharCode(65 + optionIndex);
                        }
                        
                        return {
                            questionId: question.id,
                            questionGroupId: question.groupId,
                            answer: answerValue
                        };
                    });

                    // Build payload
                    const payload = {
                        userAnswerRequests: userAnswerRequests
                    };

                    // Call API
                    const response = await submitMiniTest(payload);
                    
                    // If successful, navigate to result page
                    if (response && response.data) {
                        navigate('/mini-test-result', { 
                            state: { 
                                resultData: response.data,
                                testData: testData,
                                selectedTags: selectedTags
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

    // Get part number from first question's tags
    const firstTag = allQuestions[0]?.tags?.[0] || '';
    const partMatch = firstTag.match(/Part (\d+)/);
    const partNumber = partMatch ? parseInt(partMatch[1]) : 1;
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
