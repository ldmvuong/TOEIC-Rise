import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTestExam, submitTestExam } from '../../api/api';
import QuestionGroup from '../../components/exam/question.group';
import Sidebar from '../../components/exam/sidebar';
import NavigationButtons from '../../components/exam/NavigationButtons';
import PartInstructions from '../../components/exam/PartInstructions';
import { useTestNavigation } from '../../hooks/useTestNavigation';
import { useAudio } from '../../hooks/useAudio';
import { scrollToElement } from '../../utils/scrollUtils';
import { message, Modal } from 'antd';

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
    const [testResult, setTestResult] = useState(null); // Kết quả bài làm
    const [isTestSubmitted, setIsTestSubmitted] = useState(false); // Đánh dấu đã nộp bài
    
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
    
    // Hàm dừng tất cả audio
    const stopAllAudio = useCallback(() => {
        // Tìm tất cả các audio elements trong DOM và dừng chúng
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }, []);

    // Hàm nộp bài - được tách ra để tái sử dụng
    const submitTest = useCallback(async (successMessage = 'Đã nộp bài thành công!') => {
        if (!testData || !testId || isTestSubmitted) {
            if (isTestSubmitted) {
                message.info('Bài thi đã được nộp rồi!');
            } else {
                message.error('Không có dữ liệu đề thi');
            }
            return;
        }

        // Dừng tất cả audio khi nộp bài
        stopAllAudio();

        try {
            // Thu thập tất cả câu hỏi từ tất cả các part
            const allAnswers = [];
            
            testData.partResponses.forEach(part => {
                part.questionGroups.forEach(group => {
                    group.questions.forEach(question => {
                        // Lấy câu trả lời từ state, convert từ index (0,1,2,3) sang chữ cái (A,B,C,D)
                        let answerValue = '';
                        if (answers[question.id] !== undefined) {
                            const optionIndex = answers[question.id];
                            // Convert index sang chữ cái: 0 -> A, 1 -> B, 2 -> C, 3 -> D
                            answerValue = String.fromCharCode(65 + optionIndex);
                        }
                        
                        allAnswers.push({
                            questionId: question.id,
                            questionGroupId: group.id,
                            answer: answerValue
                        });
                    });
                });
            });

            // Xây dựng mảng parts - null nếu là full test, ngược lại là mảng các part name
            const partsArray = isFullTest 
                ? null 
                : testData.partResponses.map(part => part.partName);

            // Xây dựng payload
            const payload = {
                testId: parseInt(testId),
                timeSpent: elapsedTime,
                parts: partsArray,
                answers: allAnswers
            };

            // Gọi API
            const response = await submitTestExam(payload);
            
            // Nếu thành công (status 200), lưu kết quả và hiển thị popup
            if (response && response.data) {
                // Dừng timer
                setIsTestSubmitted(true);
                setTimeRemaining(0);
                
                // Lưu kết quả
                setTestResult(response.data);
            
            }
        } catch (error) {
            console.error('Error submitting test:', error);
            message.error(error?.response?.data?.message || error?.message || 'Không thể nộp bài. Vui lòng thử lại.');
        }
    }, [testData, testId, answers, isFullTest, elapsedTime, isTestSubmitted, stopAllAudio]);
    
    // Nộp bài
    const handleSubmit = () => {
        submitTest();
    };
    
    // Timer countdown - đếm ngược thời gian còn lại (nếu có giới hạn)
    useEffect(() => {
        if (!hasTimeLimit || timeRemaining <= 0 || isTestSubmitted) {
            return;
        }
        
        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1 || isTestSubmitted) {
                    // Hết thời gian - tự động nộp bài
                    clearInterval(interval);
                    if (!isTestSubmitted) {
                        setTimeout(() => {
                            submitTest('Hết thời gian! Đã tự động nộp bài.');
                        }, 100);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => {
            clearInterval(interval);
        };
    }, [timeRemaining, hasTimeLimit, submitTest, isTestSubmitted]);
    
    // Đếm thời gian làm bài (elapsed time) - luôn chạy
    useEffect(() => {
        if (!startTime || isTestSubmitted) {
            return;
        }
        
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            setElapsedTime(elapsed);
        }, 1000);
        
        return () => {
            clearInterval(interval);
        };
    }, [startTime, isTestSubmitted]);
    
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
    
    // Đóng popup kết quả và navigate về trang kết quả bài thi
    const handleCloseResultModal = () => {
        if (testResult && testResult.userTestId) {
            navigate(`/test-result/${testResult.userTestId}`);
        } else {
            // Fallback nếu không có userTestId
            setTestResult(null);
            if (testId) {
                navigate(`/online-tests/${testId}`);
            } else {
                navigate('/online-tests');
            }
        }
    };

    // Navigate đến trang kết quả chi tiết
    const handleViewDetailedResult = () => {
        if (testResult && testResult.userTestId) {
            navigate(`/test-result/${testResult.userTestId}`);
        } else {
            message.error('Không tìm thấy ID bài thi');
        }
    };
    
    // Format thời gian từ giây sang phút:giây
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                            <div className={`flex-1 ${partNumber >= 6 && partNumber <= 7 ? 'min-h-0 overflow-hidden p-6' : `overflow-y-auto p-6 ${partNumber >= 5 && partNumber <= 7 ? 'pb-32' : ''}`}`}>
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
                                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4">
                                        <div className="pointer-events-auto bg-white/95 border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
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
            
            {/* Modal hiển thị kết quả bài làm */}
            {testResult && (
                <Modal
                    title="Kết quả bài làm"
                    open={!!testResult}
                    onOk={handleViewDetailedResult}
                    onCancel={handleCloseResultModal}
                    okText="Xem chi tiết"
                    cancelText="Đóng"
                    width={600}
                    centered
                >
                    <div className="py-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-gray-700 font-medium">Tổng số câu hỏi:</span>
                                <span className="text-lg font-semibold text-blue-600">{testResult.totalQuestions}</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                <span className="text-gray-700 font-medium">Số câu đúng:</span>
                                <span className="text-lg font-semibold text-green-600">{testResult.correctAnswers}</span>
                            </div>
                            
                            {testResult.score ? (
                                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <span className="text-gray-700 font-medium">Điểm số:</span>
                                    <span className="text-2xl font-bold text-purple-600">{testResult.score}</span>
                                </div>
                            ) : null}
                            
                            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <span className="text-gray-700 font-medium">Thời gian làm bài:</span>
                                <span className="text-lg font-semibold text-orange-600">{formatTime(testResult.timeSpent)}</span>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-800 mb-2">
                                        {testResult.totalQuestions > 0 
                                            ? `${Math.round((testResult.correctAnswers / testResult.totalQuestions) * 100)}%`
                                            : '0%'
                                        }
                                    </div>
                                    <div className="text-sm text-gray-600">Tỷ lệ đúng</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DoTest;