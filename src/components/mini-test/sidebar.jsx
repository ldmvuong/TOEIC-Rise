const MiniTestSidebar = ({ 
    partNumber,
    questions = [],
    currentQuestionId,
    onNavigateToQuestion,
    answers = {},
    flaggedQuestions = [],
    onToggleFlag,
    selectedTags = [],
    onSubmitTest,
    questionResults = {} // { questionId: 'correct' | 'wrong' }
}) => {
    const isAnswered = (questionId) => answers[questionId] !== undefined;
    const isCurrent = (questionId) => currentQuestionId === questionId;
    const isFlagged = (questionId) => flaggedQuestions.includes(questionId);
    const isResultMode = Object.keys(questionResults).length > 0; // Check if we're in result mode

    // Calculate grid dimensions (6 rows x 5 columns = 30 questions per page)
    const questionsPerPage = 30;
    const totalPages = Math.ceil(questions.length / questionsPerPage);

    return (
        <div className="h-auto lg:h-full bg-white border-l border-gray-200 flex flex-col w-full lg:w-auto lg:flex-shrink-0" style={{ minWidth: '220px', maxWidth: '260px' }}>
            <div className="p-3 flex-1 overflow-y-auto max-h-[50vh] lg:max-h-none">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 break-words">Part {partNumber}</h2>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                    <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                            {selectedTags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 break-words"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-5 gap-1">
                    {questions.map((question, index) => {
                        const questionNumber = index + 1;
                        const answered = isAnswered(question.id);
                        const current = isCurrent(question.id);
                        const flagged = isFlagged(question.id);
                        
                        // In result mode, check if answer is correct or wrong
                        let buttonClasses = '';
                        if (current) {
                            buttonClasses = 'bg-blue-600 text-white';
                        } else if (isResultMode) {
                            // Result mode: show correct (green), wrong (red), or unanswered (gray)
                            const result = questionResults[question.id];
                            if (result === 'correct') {
                                buttonClasses = 'bg-green-100 text-green-700 border border-green-300';
                            } else if (result === 'wrong') {
                                buttonClasses = 'bg-red-100 text-red-700 border border-red-300';
                            } else {
                                buttonClasses = 'bg-gray-100 text-gray-700 border border-gray-200';
                            }
                        } else {
                            // Test mode: show answered (green) or unanswered (gray)
                            buttonClasses = answered
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200';
                        }
                        
                        return (
                            <div key={question.id} className="relative">
                                <button
                                    onClick={() => onNavigateToQuestion(question.id)}
                                    className={`w-full aspect-square rounded-md text-xs font-medium transition-colors relative scale-90 ${buttonClasses} ${flagged ? 'ring-1 ring-amber-500 ring-offset-0.5' : ''}`}
                                >
                                    {questionNumber}
                                    {flagged && (
                                        <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-amber-500 rounded-tr-lg"></div>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 space-y-1.5">
                        <div className="flex justify-between items-center gap-2">
                            <span className="whitespace-nowrap">Tổng số câu:</span>
                            <span className="font-semibold flex-shrink-0">{questions.length}</span>
                        </div>
                        {isResultMode ? (
                            <>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="whitespace-nowrap">Số câu đúng:</span>
                                    <span className="font-semibold text-green-600 flex-shrink-0">
                                        {Object.values(questionResults).filter(r => r === 'correct').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="whitespace-nowrap">Số câu sai:</span>
                                    <span className="font-semibold text-red-600 flex-shrink-0">
                                        {Object.values(questionResults).filter(r => r === 'wrong').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="whitespace-nowrap">Chưa làm:</span>
                                    <span className="font-semibold text-gray-400 flex-shrink-0">
                                        {questions.length - Object.keys(questionResults).length}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="whitespace-nowrap">Đã làm:</span>
                                    <span className="font-semibold text-green-600 flex-shrink-0">
                                        {Object.keys(answers).length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className="whitespace-nowrap">Chưa làm:</span>
                                    <span className="font-semibold text-gray-400 flex-shrink-0">
                                        {questions.length - Object.keys(answers).length}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Submit Button */}
                    {onSubmitTest && (
                        <div className="mt-3">
                            <button
                                onClick={onSubmitTest}
                                className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Nộp bài
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MiniTestSidebar;