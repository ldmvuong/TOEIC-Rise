import QuestionOptions from '../exam/QuestionOptions';
import DictionaryText from '../shared/DictionaryText';

const MiniTestQuestion = ({ question, onChange, isFlagged, onToggleFlag, partNumber, selectedOptionIndex }) => {
    const tags = question.tags || [];

    const displayIndex = question.index ?? question.position;
    const displayPosition = partNumber === 6 ? question.position : null;

    // Merge selectedOptionIndex vào question object để QuestionOptions có thể sử dụng
    const questionWithSelection = {
        ...question,
        selectedOption: selectedOptionIndex !== undefined ? selectedOptionIndex : question.selectedOption
    };

    const handleChange = (updatedQuestion) => {
        const questionWithIndex = {
            ...updatedQuestion,
            selectedOptionIndex: updatedQuestion.selectedOption
        };
        onChange(questionWithIndex);
    };

    return (
        <div id={`question-${question.id}`} className="mb-6 p-4 bg-white rounded-lg border border-gray-200 scroll-mt-4">
            {/* Tags ở phía trên */}
            {tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Question Header: Index + Position (2 hình tròn) + Flag */}
            <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                        {displayIndex}
                    </span>
                    {displayPosition && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-300">
                            {displayPosition}
                        </span>
                    )}
                    {onToggleFlag && (
                        <button
                            onClick={() => onToggleFlag(question.id)}
                            className={`p-1.5 rounded transition-colors ${
                                isFlagged
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={isFlagged ? 'Bỏ đánh dấu' : 'Đánh dấu để xem lại'}
                        >
                            {isFlagged ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
                {/* Question Content */}
                {question.content && (
                    <DictionaryText className="flex-1 text-gray-800 text-base leading-relaxed">
                        {question.content}
                    </DictionaryText>
                )}
            </div>

            {/* Options */}
            <QuestionOptions
                question={questionWithSelection}
                onChange={handleChange}
                partNumber={partNumber}
            />
        </div>
    );
};

export default MiniTestQuestion;
