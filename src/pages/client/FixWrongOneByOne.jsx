import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import parse from 'html-react-parser';
import PassageDisplay from '../../components/exam/PassageDisplay';
import ImageDisplay from '../../components/exam/ImageDisplay';
import DictionaryText from '../../components/shared/DictionaryText';

/**
 * Flatten partResponses -> questionGroups -> questions into one array.
 * Each item: { question, group, part }.
 * Sorted by part order then question position.
 */
function flattenQuestions(partResponses) {
  if (!partResponses?.length) return [];

  const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
  const sortedParts = [...partResponses].sort((a, b) => {
    const i = partOrder.indexOf(a.partName);
    const j = partOrder.indexOf(b.partName);
    if (i === -1) return 1;
    if (j === -1) return -1;
    return i - j;
  });

  const flat = [];
  for (const part of sortedParts) {
    for (const group of part.questionGroups || []) {
      const questions = group.questions || [];
      const sortedQ = [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      for (const question of sortedQ) {
        flat.push({ question, group, part });
      }
    }
  }
  return flat;
}

const FixWrongOneByOne = () => {
  const { userTestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const fixOneByOneData = state.fixOneByOneData;

  const flatQuestions = useMemo(() => {
    if (!fixOneByOneData?.partResponses) return [];
    return flattenQuestions(fixOneByOneData.partResponses);
  }, [fixOneByOneData]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionId: 'A' | 'B' | 'C' | 'D' }

  const current = flatQuestions[currentQuestionIndex];
  const isLast = currentQuestionIndex >= flatQuestions.length - 1;
  const currentQuestion = current?.question;
  const currentGroup = current?.group;
  const currentPart = current?.part;
  const isAnswered = currentQuestion && userAnswers[currentQuestion.id] !== undefined;

  const buildRedoResultFromFixing = () => {
    const cloned = fixOneByOneData ? JSON.parse(JSON.stringify(fixOneByOneData)) : null;
    if (!cloned?.partResponses?.length) return null;

    let total = 0;
    let correct = 0;

    for (const part of cloned.partResponses) {
      for (const group of part.questionGroups || []) {
        for (const q of group.questions || []) {
          total += 1;
          const correctOption = q.correctOption ?? q.correctAnswer ?? q.correct_option ?? null;
          const picked = userAnswers[q.id];

          if (picked !== undefined) {
            q.userAnswer = picked;
          } else if (q.userAnswer == null) {
            q.userAnswer = '';
          }

          if (q.correctOption == null && correctOption != null) {
            q.correctOption = correctOption;
          }

          if (q.userAnswer && q.correctOption && q.userAnswer === q.correctOption) {
            correct += 1;
          }
        }
      }
    }

    return {
      totalQuestions: total,
      correctAnswers: correct,
      timeSpent: 0,
      learnerTestPartsResponse: cloned,
    };
  };

  const handleSelectOption = (optionLetter) => {
    if (!currentQuestion || isAnswered) return;
    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionLetter }));
  };

  const handleNext = () => {
    if (isLast) {
      const redoResult = buildRedoResultFromFixing();
      if (!redoResult) {
        navigate(`/test-result/${userTestId}`, { replace: true });
        return;
      }
      navigate(`/redo-wrong/${userTestId}`, {
        replace: true,
        state: { redoResult },
      });
      return;
    }
    setCurrentQuestionIndex((i) => i + 1);
  };

  if (!fixOneByOneData) {
    message.error('Không có dữ liệu. Vui lòng bắt đầu từ trang kết quả bài thi.');
    navigate(`/test-result/${userTestId}`);
    return null;
  }

  if (flatQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-gray-600">Không có câu hỏi nào để sửa.</p>
        <button
          type="button"
          onClick={() => navigate(`/test-result/${userTestId}`)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Quay về kết quả
        </button>
      </div>
    );
  }

  const partNumber = currentPart ? parseInt(currentPart.partName.replace('Part ', ''), 10) : 0;
  const isPart2 = partNumber === 2;
  const maxOptions = isPart2 ? 3 : 4;
  const options = currentQuestion?.options || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Sửa lỗi từng câu</h1>
          <div className="text-sm font-medium text-gray-600">
            Câu {currentQuestionIndex + 1} / {flatQuestions.length}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Passage (của group) – hiển thị cho từng câu trong group */}
        {currentGroup?.passage && (
          <div className="mb-6">
            <div className="rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="p-5">
                <PassageDisplay passage={currentGroup.passage} />
              </div>
            </div>
          </div>
        )}

        {currentGroup?.imageUrl && (
          <div className="mb-6">
            <ImageDisplay imageUrl={currentGroup.imageUrl} />
          </div>
        )}

        {/* Card câu hỏi */}
        <div className="rounded-xl bg-white shadow-md border border-gray-200 overflow-hidden mb-6">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <div className="p-6">
            {/* Số câu + nội dung */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {currentQuestion?.position}
              </div>
              {currentQuestion?.content && (
                <DictionaryText className="text-gray-800 text-base leading-relaxed flex-1">
                  {currentQuestion.content}
                </DictionaryText>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 ml-12">
              {Array.from({ length: maxOptions }, (_, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                const optionText = options[index] != null && typeof options[index] === 'string' ? options[index] : '';
                const isCorrectOption = optionLetter === currentQuestion?.correctOption;
                const isUserChoice = userAnswers[currentQuestion?.id] === optionLetter;
                const showResult = isAnswered;

                let buttonClass =
                  'w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ';
                if (!showResult) {
                  buttonClass +=
                    'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer';
                } else {
                  if (isUserChoice && isCorrectOption) {
                    buttonClass += 'border-green-500 bg-green-50';
                  } else if (isUserChoice && !isCorrectOption) {
                    buttonClass += 'border-red-500 bg-red-50';
                  } else if (isCorrectOption) {
                    buttonClass += 'border-green-300 bg-green-50/70';
                  } else {
                    buttonClass += 'border-gray-200 bg-gray-50';
                  }
                }

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={showResult}
                    onClick={() => handleSelectOption(optionLetter)}
                    className={buttonClass}
                  >
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                        showResult
                          ? isUserChoice && isCorrectOption
                            ? 'bg-green-500 text-white'
                            : isUserChoice && !isCorrectOption
                            ? 'bg-red-500 text-white'
                            : isCorrectOption
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {optionLetter}
                    </span>
                    <DictionaryText
                      className={`flex-1 text-sm ${
                        showResult
                          ? isUserChoice && isCorrectOption
                            ? 'text-green-800 font-medium'
                            : isUserChoice && !isCorrectOption
                            ? 'text-red-800 font-medium'
                            : isCorrectOption
                            ? 'text-green-800'
                            : 'text-gray-700'
                          : 'text-gray-800'
                      }`}
                    >
                      {optionText}
                    </DictionaryText>
                  </button>
                );
              })}
            </div>

            {/* Sau khi chọn: Giải thích chi tiết */}
            {isAnswered && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-4">
                  {currentQuestion?.correctOption && (
                    <p className="text-sm font-semibold text-green-600">
                      Đáp án đúng: {currentQuestion.correctOption}
                    </p>
                  )}
                  {currentQuestion?.explanation && (
                    <details className="cursor-pointer" open>
                      <summary className="text-sm font-medium text-gray-800 mb-2">
                        Giải thích chi tiết đáp án
                      </summary>
                      <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mt-2">
                        {currentQuestion.explanation}
                      </div>
                    </details>
                  )}
                  {currentGroup?.transcript && (
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                        Transcript
                      </summary>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm leading-relaxed">
                        {parse(currentGroup.transcript)}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nút Câu tiếp theo / Hoàn thành – chỉ hiện sau khi đã trả lời */}
        {isAnswered && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {isLast ? 'Hoàn thành' : 'Câu tiếp theo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixWrongOneByOne;
