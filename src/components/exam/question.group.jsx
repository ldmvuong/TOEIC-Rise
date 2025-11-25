import Question from './question';
import QuestionGroupHeader from './QuestionGroupHeader';
import AudioPlayer from './AudioPlayer';
import ImageDisplay from './ImageDisplay';
import PassageDisplay from './PassageDisplay';
import QuestionContent from './QuestionContent';
import QuestionOptions from './QuestionOptions';

const QuestionGroup = ({ 
  questionGroup, 
  onQuestionChange, 
  partNumber,
  flaggedQuestions = [],
  onToggleFlag,
  partName = '',
  isListeningPart = false
}) => {
  const { audioUrl, imageUrl, passage, questions = [] } = questionGroup || {};

  const handleQuestionChange = (updatedQuestion, questionIndex) => {
    if (onQuestionChange) {
      onQuestionChange(updatedQuestion, questionIndex);
    }
  };

  // Xác định layout: Part 6-7 dùng 2 cột, các part khác dùng 1 cột
  const isTwoColumnLayout = partNumber >= 6 && partNumber <= 7;

  return (
    <div id={`question-group-${questionGroup?.id}`} className="question-group h-full flex flex-col">
      {/* Header với thông tin Part và số câu hỏi */}
      <div className="flex-shrink-0 mb-4">
        <QuestionGroupHeader partName={partName} questions={questions} />
      </div>

      {/* Layout 2 cột cho Part 6-7 */}
      {isTwoColumnLayout ? (
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100% - 4rem)' }}>
          {/* Cột trái: Passage, Image (cuộn riêng) - 50% */}
          <div className="w-1/2 overflow-y-auto pr-4 pb-12" style={{ maxHeight: '100%' }}>
            {/* Passage */}
            {passage && (
              <div className="mb-6">
                <PassageDisplay passage={passage} />
              </div>
            )}

            {/* Image */}
            {imageUrl && (
              <div className="mb-6">
                <ImageDisplay imageUrl={imageUrl} />
              </div>
            )}
          </div>

          {/* Cột phải: Position + Flag + Content + Options (cuộn riêng) - 50% */}
          <div className="w-1/2 overflow-y-auto pl-4 border-l border-gray-200 pb-16" style={{ maxHeight: '100%' }}>
            <div className="space-y-6">
              {questions.map((question, index) => {
                const isFlagged = flaggedQuestions.includes(question.id);
                return (
                  <div key={question.id} id={`question-${question.id}`} className="scroll-mt-4">
                    {/* Position + Flag icon + Content cùng hàng */}
                    <div className="flex items-start gap-2 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex-shrink-0">
                        {question.position}
                      </span>
                      {partNumber >= 5 && partNumber <= 7 && (
                        <button
                          onClick={() => onToggleFlag && onToggleFlag(question.id)}
                          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                            isFlagged
                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={isFlagged ? 'Bỏ đánh dấu' : 'Đánh dấu để xem lại'}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      )}
                      {/* Content của câu hỏi - nằm cùng hàng */}
                      {question.content && (
                        <div className="flex-1 text-gray-800 text-base leading-relaxed">
                          {question.content}
                        </div>
                      )}
                    </div>
                    {/* Options */}
                    <QuestionOptions
                      question={question}
                      onChange={(updatedQuestion) => handleQuestionChange(updatedQuestion, index)}
                      partNumber={partNumber}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Layout 1 cột cho Part 1-5 */
        <>
          {/* Audio Player (chỉ cho phần nghe) */}
          <AudioPlayer audioUrl={audioUrl} groupId={questionGroup?.id} />

          {/* Image (cho phần nghe - hiển thị trước options) */}
          {isListeningPart && imageUrl && (
            <div className="mb-4">
              <ImageDisplay imageUrl={imageUrl} />
            </div>
          )}

          {/* Passage (cho Part 5) */}
          {!isListeningPart && passage && (
            <div className="mb-4">
              <PassageDisplay passage={passage} />
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question, index) => {
              const isFlagged = flaggedQuestions.includes(question.id);
              return (
                <Question
                  key={question.id}
                  question={question}
                  onChange={(updatedQuestion) => handleQuestionChange(updatedQuestion, index)}
                  isFlagged={isFlagged}
                  onToggleFlag={() => onToggleFlag && onToggleFlag(question.id)}
                  partNumber={partNumber}
                  isListeningPart={isListeningPart}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default QuestionGroup;