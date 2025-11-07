import QuestionContent from './QuestionContent';
import QuestionOptions from './QuestionOptions';

const Question = ({ question, onChange, isFlagged, onToggleFlag, partNumber, isListeningPart = false }) => {
  return (
    <div id={`question-${question.id}`} className="mb-6 p-4 bg-white rounded-lg border border-gray-200 scroll-mt-4">
      <QuestionContent
        question={question}
        isFlagged={isFlagged}
        onToggleFlag={onToggleFlag}
        partNumber={partNumber}
      />
      <QuestionOptions
        question={question}
        onChange={onChange}
        partNumber={partNumber}
      />
    </div>
  );
};

export default Question;

