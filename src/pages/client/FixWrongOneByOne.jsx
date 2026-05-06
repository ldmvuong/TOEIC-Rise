import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Drawer, Modal, message } from 'antd';
import parse from 'html-react-parser';
import PassageDisplay from '../../components/exam/PassageDisplay';
import ImageDisplay from '../../components/exam/ImageDisplay';
import DictionaryText from '../../components/shared/DictionaryText';
import AudioPlayerUI from '../../components/client/modal/AudioPlayerUI';
import { formatTime } from '../../utils/timeUtils';
import { IconCheckCircle } from '../../components/icons';

/**
 * Build steps for fixing wrong answers.
 * - Parts 1-2: step per question
 * - Parts 3-4: step per group (audio segment), show all questions in that group
 */
function buildFixSteps(partResponses) {
    if (!partResponses?.length) return [];

    const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
    const sortedParts = [...partResponses].sort((a, b) => {
        const i = partOrder.indexOf(a.partName);
        const j = partOrder.indexOf(b.partName);
        if (i === -1) return 1;
        if (j === -1) return -1;
        return i - j;
    });

    const steps = [];
    for (const part of sortedParts) {
        const partNumber = parseInt(part.partName?.replace('Part ', ''), 10);

        for (const group of part.questionGroups || []) {
            const questions = group.questions || [];
            const sortedQ = [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            if (!sortedQ.length) continue;

            // Part 3 & 4: show per group
            if (partNumber === 3 || partNumber === 4) {
                steps.push({ type: 'group', group, part });
            } else {
                // Other parts: step per question
                for (const question of sortedQ) {
                    steps.push({ type: 'question', question, group, part });
                }
            }
        }
    }

    return steps;
}

const FixWrongOneByOne = () => {
  const { userTestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const fixOneByOneData = state.fixOneByOneData;

  const fixSteps = useMemo(() => {
      if (!fixOneByOneData?.partResponses) return [];
      return buildFixSteps(fixOneByOneData.partResponses);
  }, [fixOneByOneData]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionId: 'A' | 'B' | 'C' | 'D' }
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const currentStep = fixSteps[currentStepIndex];
  const isLast = currentStepIndex >= fixSteps.length - 1;
  const currentQuestion = currentStep?.type === 'question' ? currentStep.question : null;
  const currentGroup = currentStep?.group;
  const currentPart = currentStep?.part;

  const isAnswered =
      currentStep?.type === 'question' &&
      currentQuestion &&
      userAnswers[currentQuestion.id] !== undefined;

  const isGroupAnswered =
      currentStep?.type === 'group' &&
      currentGroup?.questions?.length > 0 &&
      currentGroup.questions.every((q) => userAnswers[q.id] !== undefined);

  const canGoNext = currentStepIndex < fixSteps.length - 1;

  const stats = useMemo(() => {
    const partResponses = fixOneByOneData?.partResponses || [];
    let total = 0;
    let answered = 0;
    let correct = 0;

    for (const part of partResponses) {
      for (const group of part.questionGroups || []) {
        for (const q of group.questions || []) {
          total += 1;
          const picked = userAnswers[q.id];
          if (picked === undefined) continue;
          answered += 1;
          const correctOption = q.correctOption ?? q.correctAnswer ?? q.correct_option ?? null;
          if (picked && correctOption && picked === correctOption) {
            correct += 1;
          }
        }
      }
    }

    return { total, answered, correct };
  }, [fixOneByOneData, userAnswers]);

  const navItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < fixSteps.length; i += 1) {
      const step = fixSteps[i];
      const partName = step?.part?.partName || '';
      const group = step?.group || null;
      if (step?.type === 'question') {
        const q = step.question;
        const position = q?.position ?? null;
        const correctOption = q?.correctOption ?? q?.correctAnswer ?? q?.correct_option ?? null;
        const picked = userAnswers[q?.id];
        const status =
          picked === undefined
            ? 'UNANSWERED'
            : picked && correctOption && picked === correctOption
              ? 'CORRECT'
              : 'WRONG';
        items.push({
          key: q?.id ?? `step-${i}`,
          stepIndex: i,
          position,
          partName,
          status,
        });
      } else if (group?.questions?.length) {
        for (const q of group.questions) {
          const position = q?.position ?? null;
          const correctOption = q?.correctOption ?? q?.correctAnswer ?? q?.correct_option ?? null;
          const picked = userAnswers[q?.id];
          const status =
            picked === undefined
              ? 'UNANSWERED'
              : picked && correctOption && picked === correctOption
                ? 'CORRECT'
                : 'WRONG';
          items.push({
            key: q?.id ?? `step-${i}-q-${position ?? 'x'}`,
            stepIndex: i,
            position,
            partName,
            status,
          });
        }
      }
    }

    const withPos = items.filter((x) => x.position != null);
    withPos.sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    return withPos;
  }, [fixSteps, userAnswers]);

  const navStats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    for (const it of navItems) {
      if (it.status === 'CORRECT') correct += 1;
      else if (it.status === 'WRONG') wrong += 1;
      else unanswered += 1;
    }
    return { correct, wrong, unanswered, total: navItems.length };
  }, [navItems]);

  const currentNavPos = useMemo(() => {
    const step = fixSteps[currentStepIndex];
    if (!step) return null;
    if (step.type === 'question') return step?.question?.position ?? null;
    const qs = Array.isArray(step?.group?.questions) ? step.group.questions : [];
    const q0 = qs[0];
    return q0?.position ?? null;
  }, [fixSteps, currentStepIndex]);

  const navByPart = useMemo(() => {
    const map = new Map();
    for (const it of navItems) {
      const key = it.partName || 'Khác';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    }
    const partOrder = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7'];
    const keys = Array.from(map.keys());
    keys.sort((a, b) => {
      const ia = partOrder.indexOf(a);
      const ib = partOrder.indexOf(b);
      if (ia === -1 && ib === -1) return String(a).localeCompare(String(b), 'vi');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys.map((k) => ({ partName: k, items: map.get(k) || [] }));
  }, [navItems]);

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
      timeSpent: elapsedSeconds,
      learnerTestPartsResponse: cloned,
    };
  };

  const handleSelectOption = (questionId, optionLetter) => {
      if (!questionId) return;
      setUserAnswers((prev) => {
          if (prev[questionId] !== undefined) return prev; // already answered
          return { ...prev, [questionId]: optionLetter };
      });
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
    setCurrentStepIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setCurrentStepIndex((i) => (i > 0 ? i - 1 : 0));
  };

  const handleSubmit = () => {
    Modal.confirm({
      title: 'Xác nhận nộp bài',
      content: 'Bạn có chắc muốn nộp bài và xem kết quả làm lại câu sai?',
      okText: 'Nộp bài',
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-indigo-600 hover:bg-indigo-700' },
      onOk: () => {
        const redoResult = buildRedoResultFromFixing();
        if (!redoResult) {
          navigate(`/test-result/${userTestId}`, { replace: true });
          return;
        }
        navigate(`/redo-wrong/${userTestId}`, {
          replace: true,
          state: { redoResult },
        });
      },
    });
  };

  if (!fixOneByOneData) {
    message.error('Không có dữ liệu. Vui lòng bắt đầu từ trang kết quả bài thi.');
    navigate(`/test-result/${userTestId}`);
    return null;
  }

  if (fixSteps.length === 0) {
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

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="Danh sách câu hỏi"
        placement="right"
        width={360}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-emerald-500 bg-emerald-500/10" />
              {navStats.correct} Đúng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-rose-500 bg-rose-500/10" />
              {navStats.wrong} Sai
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-gray-300 bg-gray-100" />
              {navStats.unanswered} Chưa làm
            </span>
          </div>

          <div className="space-y-4">
            {navByPart.map((section) => (
              <div key={section.partName}>
                <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  {section.partName}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {section.items.map((it) => {
                    const isCurrent = currentNavPos != null && it.position === currentNavPos;
                    const tone =
                      it.status === 'CORRECT'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : it.status === 'WRONG'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50';
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => {
                          setCurrentStepIndex(it.stepIndex);
                          setNavOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`h-9 rounded-lg border text-xs font-semibold ${tone} ${
                          isCurrent ? 'ring-2 ring-indigo-200 border-indigo-400' : ''
                        }`}
                        title={`Câu ${it.position}`}
                      >
                        {it.position}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Header */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-gray-50/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-slate-900 font-semibold text-sm sm:text-base truncate">
                  {fixOneByOneData?.testName
                    ? `${fixOneByOneData.testName} - Làm lại câu sai`
                    : 'Làm lại câu sai'}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {formatTime(elapsedSeconds)}
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Câu {fixSteps.length ? currentStepIndex + 1 : 0}/{Math.max(fixSteps.length, 0)}
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-emerald-500 border border-emerald-600 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap">
                  <IconCheckCircle className="text-white" />
                  {stats.correct}/{Math.max(stats.total, 1)}
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    disabled={currentStepIndex <= 0}
                    onClick={handlePrev}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${
                      currentStepIndex <= 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={handleNext}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${
                      !canGoNext
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    Sau
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setNavOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs sm:text-sm font-semibold shadow-sm inline-flex items-center gap-2"
                  title="Mở danh sách câu hỏi"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M4 4h6v6H4V4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M14 4h6v6h-6V4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 14h6v6H4v-6z" stroke="currentColor" strokeWidth="2" />
                    <path d="M14 14h6v6h-6v-6z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/test-result/${userTestId}`, { replace: true })}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-slate-700 text-xs sm:text-sm font-semibold shadow-sm whitespace-nowrap"
                >
                  Quay lại
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm whitespace-nowrap"
                >
                  Nộp bài
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-4 pb-8">
        {/* Audio (Part 1-4) */}
        {partNumber >= 1 && partNumber <= 4 && currentGroup?.audioUrl && (
          <div className="mb-6">
            <AudioPlayerUI audioUrl={currentGroup.audioUrl} />
          </div>
        )}

        {/* Passage (của group) */}
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

        {/* Nội dung theo kiểu step */}
        {currentStep?.type === 'question' ? (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="p-5 sm:p-6">
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
              <div className="space-y-2.5 ml-12">
                {Array.from({ length: maxOptions }, (_, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const options = currentQuestion?.options || [];
                  const optionText =
                    options[index] != null && typeof options[index] === 'string' ? options[index] : '';

                  const isCorrectOption = optionLetter === currentQuestion?.correctOption;
                  const isUserChoice = userAnswers[currentQuestion?.id] === optionLetter;
                  const showResult = isAnswered;

                  let buttonClass =
                    'w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all bg-white ';
                  if (!showResult) {
                    buttonClass +=
                      'border-gray-200 hover:border-indigo-300 hover:shadow-sm hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200';
                  } else {
                    if (isUserChoice && isCorrectOption) {
                      buttonClass += 'border-emerald-400 bg-emerald-50 shadow-sm';
                    } else if (isUserChoice && !isCorrectOption) {
                      buttonClass += 'border-rose-400 bg-rose-50 shadow-sm';
                    } else if (isCorrectOption) {
                      buttonClass += 'border-emerald-200 bg-emerald-50/60';
                    } else {
                      buttonClass += 'border-gray-200 bg-white';
                    }
                  }

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={showResult}
                      onClick={() => handleSelectOption(currentQuestion.id, optionLetter)}
                      className={buttonClass}
                    >
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                          showResult
                            ? isUserChoice && isCorrectOption
                              ? 'bg-emerald-600 text-white'
                              : isUserChoice && !isCorrectOption
                              ? 'bg-rose-600 text-white'
                              : isCorrectOption
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <DictionaryText
                        className={`flex-1 text-sm ${
                          showResult
                            ? isUserChoice && isCorrectOption
                              ? 'text-emerald-800 font-semibold'
                              : isUserChoice && !isCorrectOption
                              ? 'text-rose-800 font-semibold'
                              : isCorrectOption
                              ? 'text-emerald-800'
                              : 'text-gray-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {optionText}
                      </DictionaryText>
                    </button>
                  );
                })}
              </div>

              {/* Sau khi chọn */}
              {isAnswered && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    {currentQuestion?.correctOption && (
                      <p className="text-sm font-semibold text-green-600">
                        Đáp án đúng: {currentQuestion.correctOption}
                      </p>
                    )}
                    {currentQuestion?.explanation && (
                      <details className="cursor-pointer">
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
        ) : (
          <div className="space-y-6 mb-6">
            {currentGroup?.questions?.map((question) => {
              const questionOptions = question?.options || [];
              const showResult = userAnswers[question.id] !== undefined;

              return (
                <div key={question.id} className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {question.position}
                      </div>
                      {question.content && (
                        <DictionaryText className="text-gray-800 text-base leading-relaxed flex-1">
                          {question.content}
                        </DictionaryText>
                      )}
                    </div>

                    <div className="space-y-2.5 ml-12">
                      {Array.from({ length: maxOptions }, (_, index) => {
                        const optionLetter = String.fromCharCode(65 + index);
                        const optionText =
                          questionOptions[index] != null && typeof questionOptions[index] === 'string'
                            ? questionOptions[index]
                            : '';

                        const isCorrectOption = optionLetter === question?.correctOption;
                        const isUserChoice = userAnswers[question?.id] === optionLetter;

                        let buttonClass =
                          'w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all bg-white ';

                        if (!showResult) {
                          buttonClass +=
                            'border-gray-200 hover:border-indigo-300 hover:shadow-sm hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200';
                        } else {
                          if (isUserChoice && isCorrectOption) {
                            buttonClass += 'border-emerald-400 bg-emerald-50 shadow-sm';
                          } else if (isUserChoice && !isCorrectOption) {
                            buttonClass += 'border-rose-400 bg-rose-50 shadow-sm';
                          } else if (isCorrectOption) {
                            buttonClass += 'border-emerald-200 bg-emerald-50/60';
                          } else {
                            buttonClass += 'border-gray-200 bg-white';
                          }
                        }

                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={showResult}
                            onClick={() => handleSelectOption(question.id, optionLetter)}
                            className={buttonClass}
                          >
                            <span
                              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                showResult
                                  ? isUserChoice && isCorrectOption
                                    ? 'bg-emerald-600 text-white'
                                    : isUserChoice && !isCorrectOption
                                    ? 'bg-rose-600 text-white'
                                    : isCorrectOption
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {optionLetter}
                            </span>
                            <DictionaryText
                              className={`flex-1 text-sm ${
                                showResult
                                  ? isUserChoice && isCorrectOption
                                    ? 'text-emerald-800 font-semibold'
                                    : isUserChoice && !isCorrectOption
                                    ? 'text-rose-800 font-semibold'
                                    : isCorrectOption
                                    ? 'text-emerald-800'
                                    : 'text-gray-700'
                                  : 'text-slate-800'
                              }`}
                            >
                              {optionText}
                            </DictionaryText>
                          </button>
                        );
                      })}
                    </div>

                    {showResult && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="space-y-4">
                          {question?.correctOption && (
                            <p className="text-sm font-semibold text-green-600">
                              Đáp án đúng: {question.correctOption}
                            </p>
                          )}
                          {question?.explanation && (
                            <details className="cursor-pointer">
                              <summary className="text-sm font-medium text-gray-800 mb-2">
                                Giải thích chi tiết đáp án
                              </summary>
                              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mt-2">
                                {question.explanation}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {currentGroup?.transcript && isGroupAnswered && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    Transcript
                  </summary>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm leading-relaxed">
                    {parse(currentGroup.transcript)}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Nút Tiếp theo / Hoàn thành */}
        {canGoNext && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {isLast ? 'Hoàn thành' : currentStep?.type === 'group' ? 'Group tiếp theo' : 'Câu tiếp theo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixWrongOneByOne;
