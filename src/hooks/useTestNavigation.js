import { useCallback } from 'react';
import { scrollToTop } from '../utils/scrollUtils';

/**
 * Custom hook để quản lý navigation giữa các QuestionGroup
 * @param {object} testData - Dữ liệu đề thi
 * @param {number} currentPartIndex - Index của part hiện tại
 * @param {number} currentQuestionGroupIndex - Index của question group hiện tại
 * @param {function} setCurrentPartIndex - Setter cho currentPartIndex
 * @param {function} setCurrentQuestionGroupIndex - Setter cho currentQuestionGroupIndex
 * @returns {object} - { moveToNextGroup, moveToPreviousGroup }
 */
export const useTestNavigation = (
  testData,
  currentPartIndex,
  currentQuestionGroupIndex,
  setCurrentPartIndex,
  setCurrentQuestionGroupIndex
) => {
  const moveToNextGroup = useCallback(() => {
    if (!testData) return;
    const currentPart = testData.partResponses?.[currentPartIndex];
    if (!currentPart) return;

    // Nếu còn nhóm trong part hiện tại
    if (currentQuestionGroupIndex < currentPart.questionGroups.length - 1) {
      setCurrentQuestionGroupIndex(prev => prev + 1);
    } else {
      // Chuyển sang part tiếp theo
      if (currentPartIndex < testData.partResponses.length - 1) {
        setCurrentPartIndex(prev => prev + 1);
        setCurrentQuestionGroupIndex(0);
      } else {
        // Đã hết tất cả câu hỏi
        return false; // Trả về false để caller xử lý message
      }
    }

    // Scroll về đầu QuestionGroup
    scrollToTop();
    return true;
  }, [testData, currentPartIndex, currentQuestionGroupIndex, setCurrentPartIndex, setCurrentQuestionGroupIndex]);

  const moveToPreviousGroup = useCallback(() => {
    if (!testData) return;

    if (currentQuestionGroupIndex > 0) {
      setCurrentQuestionGroupIndex(prev => prev - 1);
    } else {
      // Chuyển sang part trước đó
      if (currentPartIndex > 0) {
        const prevPart = testData.partResponses[currentPartIndex - 1];
        setCurrentPartIndex(prev => prev - 1);
        setCurrentQuestionGroupIndex(prevPart.questionGroups.length - 1);
      }
    }

    // Scroll về đầu QuestionGroup
    scrollToTop();
  }, [testData, currentPartIndex, currentQuestionGroupIndex, setCurrentPartIndex, setCurrentQuestionGroupIndex]);

  return { moveToNextGroup, moveToPreviousGroup };
};

