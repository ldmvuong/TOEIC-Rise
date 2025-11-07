import QuestionButton from './QuestionButton';

/**
 * Component hiển thị navigation grid cho các câu hỏi
 */
const NavigationGrid = ({
  parts = [],
  currentPartIndex = 0,
  currentQuestionGroupIndex = 0,
  onNavigateToQuestion = () => {},
  canNavigate = true,
  flaggedQuestions = [],
  answers = {}
}) => {
  // Kiểm tra xem một part có phải listening part (Part 1-4) không
  const isListeningPart = (partName) => {
    const partNumber = parseInt(partName.replace('Part ', ''));
    return partNumber >= 1 && partNumber <= 4;
  };

  // Tính toán số câu hỏi và vị trí cho navigation grid
  const getQuestionNumbers = () => {
    const questionNumbers = [];

    parts.forEach((part, partIdx) => {
      const partQuestions = [];
      part.questionGroups?.forEach((group) => {
        group.questions?.forEach((question) => {
          const position = question.position || question.id;
          partQuestions.push({
            number: position,
            questionId: question.id,
            partIndex: partIdx,
            groupId: group.id,
            position: position
          });
        });
      });
      questionNumbers.push({
        partName: part.partName,
        partId: part.id,
        questions: partQuestions,
        isListening: isListeningPart(part.partName)
      });
    });

    return questionNumbers;
  };

  const questionNumbers = getQuestionNumbers();

  const isQuestionFlagged = (questionId) => {
    return flaggedQuestions.includes(questionId);
  };

  const isQuestionAnswered = (questionId) => {
    return answers[questionId] !== undefined && answers[questionId] !== null;
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
        <strong>Chú ý:</strong> bạn có thể click vào số thứ tự câu hỏi trong bài để đánh dấu review
      </div>
      
      {questionNumbers.map((partData, partIdx) => {
        // Với listening parts, chỉ cho phép navigate nếu đang ở listening part đó
        const canNavigateThisPart = partData.isListening ? false : canNavigate;
        
        return (
          <div key={partData.partId} className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">{partData.partName}</div>
            <div className="grid grid-cols-5 gap-2">
              {partData.questions.map((q) => (
                <QuestionButton
                  key={q.questionId}
                  question={q}
                  isFlagged={isQuestionFlagged(q.questionId)}
                  isAnswered={isQuestionAnswered(q.questionId)}
                  canNavigate={canNavigateThisPart}
                  onClick={() => onNavigateToQuestion(partIdx, q.groupId, q.questionId)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NavigationGrid;

