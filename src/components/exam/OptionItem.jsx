import DictionaryText from '../shared/DictionaryText';

/**
 * Component hiển thị một option (A, B, C, D) cho câu hỏi
 */
const OptionItem = ({ option, optionIndex, optionLabel, isSelected, onChange, disableDictionary = false }) => {
  // Vẫn hiển thị option ngay cả khi nội dung là null (Part 1, Part 2)
  const optionText = option || '';

  return (
    <label
      className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-50'
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      <input
        type="radio"
        checked={isSelected}
        onChange={() => onChange(optionIndex)}
        className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700">{optionLabel}.</span>
      {optionText && (
        <DictionaryText className="text-sm text-gray-800" disableDictionary={disableDictionary}>
          {optionText}
        </DictionaryText>
      )}
    </label>
  );
};

export default OptionItem;

