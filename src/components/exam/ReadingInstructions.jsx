/**
 * Component hiển thị hướng dẫn cho phần đọc (Part 5-7)
 */
const ReadingInstructions = ({ partNumber, onContinue }) => {
  const getInstructions = () => {
    switch (partNumber) {
      case 5:
        return {
          title: 'PART 5',
          directions: 'Directions: A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence. Then mark the letter (A), (B), (C), or (D) on your answer sheet.'
        };
      case 6:
        return {
          title: 'PART 6',
          directions: 'Directions: Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each question are given below the text. Select the best answer to complete the text. Then mark the letter (A), (B), (C), or (D) on your answer sheet.'
        };
      case 7:
        return {
          title: 'PART 7',
          directions: 'Directions: In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question and mark the letter (A), (B), (C), or (D) on your answer sheet.'
        };
      default:
        return null;
    }
  };

  const instructions = getInstructions();
  
  if (!instructions) return null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg border-2 border-gray-300 p-8 shadow-lg my-6">
        <div className="mb-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-blue-700 mb-3">{instructions.title}</h2>

          {/* Directions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {instructions.directions}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-8">
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingInstructions;

