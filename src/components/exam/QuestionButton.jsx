/**
 * Component button cho câu hỏi trong navigation grid
 */
const QuestionButton = ({ 
  question, 
  isFlagged, 
  isAnswered, 
  canNavigate, 
  onClick 
}) => {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={!canNavigate}
        className={`
          w-full aspect-square rounded border-2 text-xs font-medium transition-all relative
          ${isAnswered
            ? 'bg-blue-600 text-white border-blue-700' 
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isFlagged && !isAnswered ? 'border-orange-400 bg-orange-50' : ''}
          ${!canNavigate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={`Câu ${question.number}${isAnswered ? ' (Đã làm)' : ''}${isFlagged ? ' (Đã đánh dấu)' : ''}`}
      >
        {question.number}
        {/* Icon flag nhỏ ở góc trên bên phải */}
        {isFlagged && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
};

export default QuestionButton;

