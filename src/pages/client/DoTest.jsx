import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTestExam } from '../../api/api';
import QuestionGroup from '../../components/exam/question.group';
import Sidebar from '../../components/exam/sidebar';
import NavigationButtons from '../../components/exam/NavigationButtons';
import PartInstructions from '../../components/exam/PartInstructions';
import { useTestNavigation } from '../../hooks/useTestNavigation';
import { useAudio } from '../../hooks/useAudio';
import { scrollToElement } from '../../utils/scrollUtils';
import { message } from 'antd';

const DoTest = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Lấy testId và các params từ location state (nếu có) hoặc fallback về query params
    const state = location.state || {};
    const searchParams = new URLSearchParams(location.search);
    
    const testId = state.testId || searchParams.get('testId');
    const mode = state.mode || searchParams.get('mode') || 'practice';
    const partIds = state.parts || (searchParams.get('parts') ? searchParams.get('parts').split(',').map(id => parseInt(id.trim())) : [1, 2, 3, 4, 5, 6, 7]);
    const timeLimit = state.timeLimit || searchParams.get('timeLimit');
    
    // State
    const [loading, setLoading] = useState(true);
    const [testData, setTestData] = useState(null);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [currentQuestionGroupIndex, setCurrentQuestionGroupIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOptionIndex }
    const [flaggedQuestions, setFlaggedQuestions] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(0); // giây - thời gian còn lại
    const [elapsedTime, setElapsedTime] = useState(0); // giây - thời gian làm bài
    const [volume, setVolume] = useState(1);
    const [showInstructions, setShowInstructions] = useState(false); // Hiển thị hướng dẫn
    const [viewedParts, setViewedParts] = useState([]); // Track các part đã xem hướng dẫn (dùng array thay vì Set)
    const [startTime, setStartTime] = useState(null); // Thời điểm bắt đầu làm bài
    
    const isFullTest = mode === 'full';
    const hasTimeLimit = isFullTest || (timeLimit && timeLimit > 0);
    
    // Xác định part hiện tại có phải phần nghe (1-4) không
    const isListeningPart = () => {
        if (!testData?.partResponses?.[currentPartIndex]) return false;
        const partName = testData.partResponses[currentPartIndex].partName;
        const partNumber = parseInt(partName.replace('Part ', ''));
        return partNumber >= 1 && partNumber <= 4;
    };
    
    const canNavigate = !isListeningPart();
    
    // Sử dụng custom hook cho navigation
    const { moveToNextGroup: moveToNextGroupHook, moveToPreviousGroup: moveToPreviousGroupHook } = useTestNavigation(
        testData,
        currentPartIndex,
        currentQuestionGroupIndex,
        setCurrentPartIndex,
        setCurrentQuestionGroupIndex
    );
    
    // Di chuyển đến nhóm câu hỏi tiếp theo - với message handling
    const moveToNextGroup = useCallback(() => {
        const result = moveToNextGroupHook();
        if (result === false) {
            message.info('Bạn đã hoàn thành tất cả câu hỏi!');
        }
    }, [moveToNextGroupHook]);
    
    // Di chuyển đến nhóm câu hỏi trước đó - không cho phép quay lại listening parts
    const moveToPreviousGroup = useCallback(() => {
        if (!testData) return;
        
        const currentPart = testData.partResponses?.[currentPartIndex];
        if (!currentPart) return;
        
        // Kiểm tra xem part hiện tại có phải reading part (Part 5-7) không
        const currentPartName = currentPart.partName;
        const currentPartNumber = parseInt(currentPartName.replace('Part ', ''));
        const isCurrentReading = currentPartNumber >= 5 && currentPartNumber <= 7;
        
        // Nếu đang ở reading part và đang ở question group đầu tiên
        if (isCurrentReading && currentQuestionGroupIndex === 0) {
            // Kiểm tra part trước đó có phải listening part không
            if (currentPartIndex > 0) {
                const prevPart = testData.partResponses[currentPartIndex - 1];
                if (prevPart) {
                    const prevPartName = prevPart.partName;
                    const prevPartNumber = parseInt(prevPartName.replace('Part ', ''));
                    const isPrevListening = prevPartNumber >= 1 && prevPartNumber <= 4;
                    
                    // Không cho phép quay lại listening parts
                    if (isPrevListening) {
                        return;
                    }
                }
            }
        }
        
        // Gọi hook navigation
        moveToPreviousGroupHook();
    }, [testData, currentPartIndex, currentQuestionGroupIndex, moveToPreviousGroupHook]);
    
    // Gọi API lấy đề thi - chỉ gọi khi có testId và partIds
    useEffect(() => {
        const fetchTest = async () => {
            if (!testId) {
                message.error('Thiếu thông tin đề thi');
                navigate('/online-tests');
                return;
            }
            
            if (!partIds || partIds.length === 0) {
                message.error('Vui lòng chọn ít nhất một phần');
                navigate(-1);
                return;
            }
            
            setLoading(true);
            try {
                // Gọi API - chỉ truyền testId và partIds, KHÔNG truyền mode
                const res = await getTestExam(testId, partIds);
                
                if (res && res.data) {
                    setTestData(res.data);
                    
                    // Khởi tạo timer cho Full Test (120 phút = 7200 giây)
                    // mode chỉ dùng cho frontend logic, không gửi lên API
                    if (isFullTest) {
                        setTimeRemaining(120 * 60); // 120 phút
                    } else if (timeLimit) {
                        setTimeRemaining(parseInt(timeLimit) * 60);
                    }
                    
                    // Bắt đầu đếm thời gian làm bài
                    setStartTime(Date.now());
                } else {
                    message.error('Dữ liệu đề thi không hợp lệ');
                }
            } catch (error) {
                message.error(error?.message || 'Không thể tải đề thi');
            } finally {
                setLoading(false);
            }
        };
        
        fetchTest();
    }, [testId, partIds.join(','), timeLimit, mode, navigate]);
    
    // Nộp bài
    const handleSubmit = () => {
        // TODO: Gọi API nộp bài
        message.success('Đã nộp bài thành công!');
        if (testId) {
            navigate(`/online-tests/${testId}`);
        } else {
            navigate('/online-tests');
        }
    };
    
    // Timer countdown - đếm ngược thời gian còn lại (nếu có giới hạn)
    useEffect(() => {
        if (!hasTimeLimit || timeRemaining <= 0) {
            return;
        }
        
        const timerInterval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Hết thời gian - tự động nộp bài
                    clearInterval(timerInterval);
                    setTimeout(() => {
                        // TODO: Gọi API nộp bài
                        message.success('Hết thời gian! Đã tự động nộp bài.');
                        navigate(`/online-tests/${testId}`);
                    }, 100);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => {
            clearInterval(timerInterval);
        };
    }, [timeRemaining, hasTimeLimit, testId, navigate]);
    
    // Đếm thời gian làm bài (elapsed time) - luôn chạy
    useEffect(() => {
        if (!startTime) return;
        
        const elapsedInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            setElapsedTime(elapsed);
        }, 1000);
        
        return () => {
            clearInterval(elapsedInterval);
        };
    }, [startTime]);
    
    // Xử lý audio tự động cho Part 1-4
    // Chỉ phát audio khi không đang hiển thị instructions
    const currentPartForAudio = testData?.partResponses?.[currentPartIndex];
    const currentGroupForAudio = currentPartForAudio?.questionGroups?.[currentQuestionGroupIndex];
    const shouldPlayAudio = testData && isListeningPart() && currentGroupForAudio?.audioUrl && !showInstructions;
    
    useAudio(
        shouldPlayAudio ? currentGroupForAudio : null,
        volume,
        moveToNextGroup
    );
    
    // Tính toán partNumber trước khi dùng trong useEffect
    const currentPart = testData?.partResponses?.[currentPartIndex];
    const partNumber = currentPart ? parseInt(currentPart.partName.replace('Part ', '')) : 0;
    
    // Kiểm tra xem có cần hiển thị hướng dẫn không (cho tất cả các part)
    // Phải đặt useEffect trước các early returns để tuân thủ quy tắc hooks
    useEffect(() => {
        if (!testData || loading || partNumber === 0) return;
        
        // Hiển thị hướng dẫn cho tất cả các part (1-7) khi vào lần đầu
        const shouldShowInstructions = 
            partNumber >= 1 && 
            partNumber <= 7 && 
            !viewedParts.includes(partNumber) &&
            currentQuestionGroupIndex === 0;
        
        if (shouldShowInstructions) {
            setShowInstructions(true);
        } else {
            setShowInstructions(false);
        }
    }, [testData, partNumber, currentQuestionGroupIndex, viewedParts, loading]);
    
    // Xử lý thay đổi câu trả lời
    const handleQuestionChange = (updatedQuestion, questionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [updatedQuestion.id]: updatedQuestion.selectedOption
        }));
    };
    
    // Toggle flag câu hỏi
    const handleToggleFlag = (questionId) => {
        setFlaggedQuestions(prev => {
            if (prev.includes(questionId)) {
                return prev.filter(id => id !== questionId);
            } else {
                return [...prev, questionId];
            }
        });
    };
    
    // Navigate đến câu hỏi cụ thể và scroll đến câu đó
    const handleNavigateToQuestion = (partIndex, groupId, questionId) => {
        const part = testData?.partResponses?.[partIndex];
        if (!part) return;
        
        // Kiểm tra xem part này có phải listening part (Part 1-4) không
        const partName = part.partName;
        const partNumber = parseInt(partName.replace('Part ', ''));
        const isPartListening = partNumber >= 1 && partNumber <= 4;
        
        // Không cho phép navigate đến listening parts
        if (isPartListening) {
            return;
        }
        
        // Chỉ cho phép navigate nếu canNavigate = true
        if (!canNavigate) return;
        
        const groupIndex = part.questionGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        
        setCurrentPartIndex(partIndex);
        setCurrentQuestionGroupIndex(groupIndex);
        
        // Scroll đến câu hỏi sau khi component đã render
        scrollToElement(`question-${questionId}`, { behavior: 'smooth', block: 'center' });
    };
    
    // Xử lý khi người dùng ấn OK để tiếp tục
    const handleContinueFromInstructions = () => {
        setShowInstructions(false);
        setViewedParts(prev => {
            if (!prev.includes(partNumber)) {
                return [...prev, partNumber];
            }
            return prev;
        });
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải đề thi...</p>
                </div>
            </div>
        );
    }
    
    if (!testData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-600">Không tìm thấy đề thi</div>
            </div>
        );
    }
    
    const currentGroup = currentPart?.questionGroups?.[currentQuestionGroupIndex];
    
    // Cập nhật answers cho currentGroup
    const updatedGroup = currentGroup ? {
        ...currentGroup,
        questions: currentGroup.questions.map(q => ({
            ...q,
            selectedOption: answers[q.id] !== undefined ? answers[q.id] : q.selectedOption
        }))
    } : null;
    
    // Hiển thị hướng dẫn nếu cần (cho tất cả các part 1-7)
    if (showInstructions && partNumber >= 1 && partNumber <= 7) {
        return (
            <div className="h-screen flex overflow-hidden bg-gray-50">
                {/* Main Content - 85% */}
                <div className="flex-1 flex flex-col overflow-hidden" style={{ width: '85%' }}>
                    <PartInstructions 
                        partNumber={partNumber} 
                        onContinue={handleContinueFromInstructions}
                        isListeningPart={isListeningPart()}
                    />
                </div>
                
                {/* Sidebar - 15% */}
                <div style={{ width: '15%', minWidth: '250px' }}>
                    <Sidebar
                        timeRemaining={timeRemaining}
                        elapsedTime={elapsedTime}
                        hasTimeLimit={hasTimeLimit}
                        parts={testData.partResponses}
                        currentQuestionGroupIndex={currentQuestionGroupIndex}
                        currentPartIndex={currentPartIndex}
                        onNavigateToQuestion={handleNavigateToQuestion}
                        onSubmit={handleSubmit}
                        volume={volume}
                        onVolumeChange={setVolume}
                        canNavigate={canNavigate}
                        flaggedQuestions={flaggedQuestions}
                        answers={answers}
                    />
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-screen flex overflow-hidden bg-gray-50">
            {/* Main Content - 85% */}
            <div className="flex-1 flex flex-col" style={{ width: '85%' }}>
                <div className={`flex-1 flex flex-col relative ${partNumber >= 6 && partNumber <= 7 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {updatedGroup && (
                        <>
                            {/* Question Group Container - thêm padding-bottom cho Part 5-7 để không bị che bởi fixed buttons */}
                            <div className={`flex-1 ${partNumber >= 6 && partNumber <= 7 ? 'min-h-0 overflow-hidden p-6' : `overflow-y-auto p-6 ${partNumber >= 5 && partNumber <= 7 ? 'pb-20' : ''}`}`}>
                                <div className={partNumber >= 6 && partNumber <= 7 ? 'h-full' : 'max-w-4xl mx-auto w-full'}>
                                    <QuestionGroup
                                        questionGroup={updatedGroup}
                                        onQuestionChange={handleQuestionChange}
                                        partNumber={partNumber}
                                        flaggedQuestions={flaggedQuestions}
                                        onToggleFlag={handleToggleFlag}
                                        partName={currentPart?.partName || ''}
                                        isListeningPart={isListeningPart()}
                                    />
                                </div>
                            </div>
                            
                            {/* Navigation buttons cho Part 5-7 - fixed ở cuối màn hình viewport */}
                            {canNavigate && partNumber >= 5 && partNumber <= 7 && (() => {
                                // Kiểm tra có thể quay lại không
                                let canGoPrevious = !(currentPartIndex === 0 && currentQuestionGroupIndex === 0);
                                
                                // Nếu đang ở question group đầu tiên
                                if (currentQuestionGroupIndex === 0) {
                                    // Kiểm tra part trước đó có phải listening part không
                                    if (currentPartIndex > 0) {
                                        const prevPart = testData.partResponses[currentPartIndex - 1];
                                        if (prevPart) {
                                            const prevPartName = prevPart.partName;
                                            const prevPartNumber = parseInt(prevPartName.replace('Part ', ''));
                                            const isPrevListening = prevPartNumber >= 1 && prevPartNumber <= 4;
                                            
                                            // Không cho phép quay lại listening parts
                                            if (isPrevListening) {
                                                canGoPrevious = false;
                                            }
                                        }
                                    }
                                }
                                
                                return (
                                    <div className="fixed bottom-0 bg-white border-t border-gray-200 shadow-lg z-50 py-3 px-6" style={{ left: 0, right: '15%', width: 'auto' }}>
                                        <div className={partNumber >= 6 && partNumber <= 7 ? 'w-full' : 'max-w-4xl mx-auto'}>
                                            <NavigationButtons
                                                onPrevious={moveToPreviousGroup}
                                                onNext={moveToNextGroup}
                                                canGoPrevious={canGoPrevious}
                                                canGoNext={!(
                                                    currentPartIndex === testData.partResponses.length - 1 &&
                                                    currentQuestionGroupIndex === currentPart.questionGroups.length - 1
                                                )}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>
            
            {/* Sidebar - 15% */}
            <div style={{ width: '15%', minWidth: '250px' }}>
                <Sidebar
                    timeRemaining={timeRemaining}
                    elapsedTime={elapsedTime}
                    hasTimeLimit={hasTimeLimit}
                    parts={testData.partResponses}
                    currentQuestionGroupIndex={currentQuestionGroupIndex}
                    currentPartIndex={currentPartIndex}
                    onNavigateToQuestion={handleNavigateToQuestion}
                    onSubmit={handleSubmit}
                    volume={volume}
                    onVolumeChange={setVolume}
                    canNavigate={canNavigate}
                    flaggedQuestions={flaggedQuestions}
                    answers={answers}
                />
            </div>
        </div>
    );
};

export default DoTest;