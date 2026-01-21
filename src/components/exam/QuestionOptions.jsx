import OptionItem from './OptionItem';

/**
 * Component hiển thị các options cho một câu hỏi
 */
const QuestionOptions = ({ question, onChange, partNumber, disableDictionary = false }) => {
  const handleOptionChange = (optionIndex) => {
    const updatedQuestion = {
      ...question,
      selectedOption: optionIndex
    };
    onChange(updatedQuestion);
  };

  // Part 2 chỉ có 3 options (A, B, C), các phần khác có 4 options
  const maxOptions = partNumber === 2 ? 3 : (question.options?.length || 4);

  return (
    <div className="space-y-1.5">
      {question.options?.slice(0, maxOptions).map((option, index) => {
        const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
        const isSelected = question.selectedOption === index;

        return (
          <OptionItem
            key={index}
            option={option}
            optionIndex={index}
            optionLabel={optionLabel}
            isSelected={isSelected}
            onChange={handleOptionChange}
            disableDictionary={disableDictionary}
          />
        );
      })}
    </div>
  );
};

export default QuestionOptions;

