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

    // Calculate grid dimensions (6 rows x 5 columns = 30 questions per page)
    const questionsPerPage = 30;
    const totalPages = Math.ceil(questions.length / questionsPerPage);

    return (
        <div className="h-full bg-white border-l border-gray-200 flex flex-col" style={{ width: '15%', minWidth: '250px' }}>
            <div className="p-4 flex-1 overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Part {partNumber}</h2>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                    <div className="mb-3">
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((question, index) => {
                        const questionNumber = index + 1;
                        const answered = isAnswered(question.id);
                        const current = isCurrent(question.id);
                        const flagged = isFlagged(question.id);
                        const resultStatus = questionResults[question.id]; // chỉ dùng ở trang kết quả
                        
                        return (
                            <div key={question.id} className="relative">
                                <button
                                    onClick={() => onNavigateToQuestion(question.id)}
                                    className={`w-full aspect-square rounded-lg text-sm font-medium transition-colors relative ${
                                        current
                                            ? 'bg-blue-600 text-white'
                                            : resultStatus === 'correct'
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                            : resultStatus === 'wrong'
                                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                            : answered
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                                    } ${flagged ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}
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
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex justify-between">
                            <span>Tổng số câu:</span>
                            <span className="font-semibold">{questions.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Đã làm:</span>
                            <span className="font-semibold text-green-600">
                                {Object.keys(answers).length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Chưa làm:</span>
                            <span className="font-semibold text-gray-400">
                                {questions.length - Object.keys(answers).length}
                            </span>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    {onSubmitTest && (
                        <div className="mt-4">
                            <button
                                onClick={onSubmitTest}
                                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
