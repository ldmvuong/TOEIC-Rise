/**
 * Component header cho QuestionGroup - hiển thị Part và số câu hỏi
 */
const QuestionGroupHeader = ({ partName, questions = [] }) => {
  // Tính toán số câu hỏi để hiển thị
  const getQuestionRange = () => {
    if (!questions || questions.length === 0) return '';
    
    const positions = questions.map(q => q.position).filter(p => p != null);
    if (positions.length === 0) return '';
    
    if (positions.length === 1) {
      return `Question ${positions[0]}`;
    }
    
    const minPosition = Math.min(...positions);
    const maxPosition = Math.max(...positions);
    
    if (minPosition === maxPosition) {
      return `Question ${minPosition}`;
    }
    
    return `Question ${minPosition}-${maxPosition}`;
  };

  if (!partName && questions.length === 0) return null;

  const questionRange = getQuestionRange();

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-base">
        {partName && (
          <span className="font-bold text-blue-700">{partName}</span>
        )}
        {partName && questionRange && (
          <span className="text-gray-400">|</span>
        )}
        {questionRange && (
          <span className="text-gray-500">{questionRange}</span>
        )}
      </div>
    </div>
  );
};

export default QuestionGroupHeader;

