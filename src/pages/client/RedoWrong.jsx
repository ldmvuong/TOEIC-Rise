import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import parse from 'html-react-parser';
import PassageDisplay from '../../components/exam/PassageDisplay';
import ImageDisplay from '../../components/exam/ImageDisplay';
import { formatTime } from '../../utils/timeUtils';
import DictionaryText from '../../components/shared/DictionaryText';
import AudioPlayerUI from '../../components/client/modal/AudioPlayerUI';

const RedoWrong = () => {
  const { userTestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [redoResult, setRedoResult] = useState(state.redoResult || null);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);

  useEffect(() => {
    if (!redoResult) {
      message.error('Không có dữ liệu làm lại câu sai.');
      navigate('/online-tests');
    }
  }, [redoResult, navigate]);

  if (!redoResult) {
    return null;
  }

  const { totalQuestions, correctAnswers, timeSpent, learnerTestPartsResponse } = redoResult;
  const testData = learnerTestPartsResponse;

  if (!testData?.partResponses || testData.partResponses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Không có dữ liệu bài làm lại</div>
      </div>
    );
  }

  const selectedPart = testData.partResponses[selectedPartIndex];
  const partNumber = selectedPart ? parseInt(selectedPart.partName.replace('Part ', '')) : null;

  const scrollToQuestion = (position) => {
    setTimeout(() => {
      const element = document.getElementById(`redo-question-${position}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  const getQuestionRangeText = (questions) => {
    if (!questions || questions.length === 0) return '';
    const positions = questions.map((q) => q.position).filter((p) => p != null);
    if (positions.length === 0) return '';
    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);
    if (minPos === maxPos) return `Câu ${minPos}`;
    return `Câu ${minPos}-${maxPos}`;
  };

  const renderOptions = (question) => {
    const options = question.options || [];
    const isPart2 = partNumber === 2;
    const maxOptions = isPart2 ? 3 : 4;

    return (
      <div className="space-y-1 ml-11">
        {Array.from({ length: maxOptions }, (_, index) => {
          const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
          const option = options[index];
          const optionText = option != null && typeof option === 'string' ? option : '';
          const isCorrectOption = optionLetter === question.correctOption;
          const isUserAnswer = optionLetter === question.userAnswer && question.userAnswer !== '';
          const isCorrect = isUserAnswer && isCorrectOption;
          const isWrong = isUserAnswer && !isCorrectOption;

          return (
            <div key={optionLetter} className="flex items-center gap-2">
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCorrect
                    ? 'bg-green-500 text-white'
                    : isWrong
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {optionLetter}
              </div>
              {optionText && (
                <DictionaryText
                  className={`text-sm leading-tight ${
                    isCorrect
                      ? 'text-green-700 font-medium'
                      : isWrong
                      ? 'text-red-700 font-medium'
                      : 'text-gray-800'
                  }`}
                >
                  {optionText}
                </DictionaryText>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderQuestionGroup = (group, groupIndex) => {
    const isPart6Or7 = partNumber === 6 || partNumber === 7;
    const questionRangeText = getQuestionRangeText(group.questions);
    const groupKey = group?.id ?? `group-${groupIndex}`;

    if (isPart6Or7) {
      return (
        <div key={groupKey} className="mb-8">
          {questionRangeText && (
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-700">{questionRangeText}</span>
            </div>
          )}
          <div className="relative rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"></div>
            <div className="p-5 pt-6">
              <div className="flex gap-4">
                <div className="w-[55%] overflow-y-auto pr-4" style={{ maxHeight: '70vh' }}>
                  {group.passage && (
                    <div className="mb-4">
                      <PassageDisplay passage={group.passage} />
                    </div>
                  )}
                  {group.imageUrl && (
                    <div className="mb-4">
                      <ImageDisplay imageUrl={group.imageUrl} />
                    </div>
                  )}
                  {group.transcript && (
                    <div className="mb-4 mt-4 pt-4 border-t border-gray-200">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                          Hiện Transcript
                        </summary>
                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-gray-800 text-sm leading-relaxed">
                            {parse(group.transcript)}
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

            <div className="w-[45%] overflow-y-auto pl-4" style={{ maxHeight: '70vh' }}>
              {group.questions?.map((question, questionIndex) => {
                const showCorrectLine =
                  question.correctOption &&
                  (!question.userAnswer || question.userAnswer !== question.correctOption);
                const questionKey = question?.id ?? `${groupKey}-${question?.position ?? questionIndex}`;

                return (
                  <div
                    key={questionKey}
                    id={`redo-question-${question.position}`}
                    className="mb-6 pb-6 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                        {question.position}
                      </div>
                      {question.content && (
                        <DictionaryText className="text-sm text-gray-800">
                          {question.content}
                        </DictionaryText>
                      )}
                    </div>
                    {renderOptions(question)}
                    {showCorrectLine && (
                      <div className="mt-3 ml-11">
                        <p className="text-sm font-semibold text-green-600">
                          Đáp án đúng: {question.correctOption}
                        </p>
                      </div>
                    )}
                    {question.explanation && (
                      <div className="mt-4 ml-11">
                        <details className="cursor-pointer">
                          <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            Giải thích chi tiết đáp án
                          </summary>
                          <div className="mt-2">
                            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                              {question.explanation}
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={groupKey} className="mb-8">
        {questionRangeText && (
          <div className="mb-2">
            <span className="text-sm font-semibold text-gray-700">{questionRangeText}</span>
          </div>
        )}
        <div className="relative rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"></div>
          <div className="p-5 pt-6">
            {(partNumber >= 1 && partNumber <= 4) && group.audioUrl && (
              <div className="mb-4">
                <AudioPlayerUI audioUrl={group.audioUrl} />
              </div>
            )}
            {group.imageUrl && (
              <div className="mb-4">
                <ImageDisplay imageUrl={group.imageUrl} />
              </div>
            )}
            {group.passage && (
              <div className="mb-4">
                <PassageDisplay passage={group.passage} />
              </div>
            )}
            <div className="space-y-6">
              {group.questions?.map((question, questionIndex) => {
                const showCorrectLine =
                  question.correctOption &&
                  (!question.userAnswer || question.userAnswer !== question.correctOption);
                const questionKey = question?.id ?? `${groupKey}-${question?.position ?? questionIndex}`;

                return (
                  <div
                    key={questionKey}
                    id={`redo-question-${question.position}`}
                    className="mb-6 pb-6 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                        {question.position}
                      </div>
                      {question.content && (
                        <DictionaryText className="text-sm text-gray-800">
                          {question.content}
                        </DictionaryText>
                      )}
                    </div>
                    {renderOptions(question)}
                    {showCorrectLine && (
                      <div className="mt-3 ml-11">
                        <p className="text-sm font-semibold text-green-600">
                          Đáp án đúng: {question.correctOption}
                        </p>
                      </div>
                    )}
                    {question.explanation && (
                      <div className="mt-4 ml-11">
                        <details className="cursor-pointer">
                          <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            Giải thích chi tiết đáp án
                          </summary>
                          <div className="mt-2">
                            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                              {question.explanation}
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {group.transcript && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Hiện Transcript
                  </summary>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-gray-800 text-sm leading-relaxed">
                      {parse(group.transcript)}
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Kết quả làm lại câu sai: {testData.testName || ''}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Mã bài thi: {userTestId}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="flex-1 overflow-y-auto" style={{ width: '85%' }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-sm text-gray-600">Tổng số câu</div>
                <div className="mt-2 text-2xl font-bold text-blue-700">{totalQuestions}</div>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-sm text-gray-600">Số câu đúng</div>
                <div className="mt-2 text-2xl font-bold text-green-700">
                  {correctAnswers} ({totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}
                  %)
                </div>
              </div>
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="text-sm text-gray-600">Thời gian làm lại</div>
                <div className="mt-2 text-2xl font-bold text-orange-700">
                  {formatTime(timeSpent || 0)}
                </div>
              </div>
            </div>

            <div className="mb-6 flex gap-2 border-b border-gray-200">
              {testData.partResponses.map((part, index) => (
                <button
                  key={part.id}
                  onClick={() => setSelectedPartIndex(index)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    selectedPartIndex === index
                      ? 'bg-blue-600 text-white rounded-t-lg'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  {part.partName}
                </button>
              ))}
            </div>

            {selectedPart && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">{selectedPart.partName}</h2>
                {selectedPart.questionGroups?.map((group, groupIndex) => renderQuestionGroup(group, groupIndex))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-l border-gray-200 overflow-y-auto" style={{ width: '15%' }}>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Danh sách câu hỏi</h3>
            {testData.partResponses.map((part, partIdx) => (
              <div key={part.id} className="mb-6">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  {part.partName}
                </h4>
                <div className="grid grid-cols-5 gap-1">
                  {part.questionGroups?.flatMap((group) =>
                    group.questions?.map((question, questionIndex) => {
                      const isCorrect =
                        question.userAnswer &&
                        question.correctOption &&
                        question.userAnswer === question.correctOption;
                      const isWrong =
                        question.userAnswer &&
                        question.correctOption &&
                        question.userAnswer !== question.correctOption;

                      const status = isCorrect ? 'correct' : isWrong ? 'incorrect' : 'unanswered';
                      const questionKey = question?.id ?? `${part?.id ?? partIdx}-${question?.position ?? questionIndex}`;

                      return (
                        <button
                          key={questionKey}
                          onClick={() => {
                            setSelectedPartIndex(partIdx);
                            scrollToQuestion(question.position);
                          }}
                          className={`w-8 h-8 rounded-sm border-2 flex items-center justify-center text-xs font-semibold transition-colors ${
                            status === 'correct'
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : status === 'incorrect'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={`Câu ${question.position}`}
                        >
                          {question.position}
                        </button>
                      );
                    }) || []
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedoWrong;

