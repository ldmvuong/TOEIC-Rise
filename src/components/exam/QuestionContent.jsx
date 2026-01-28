import { useState } from 'react';
import useDictionary from '../../hooks/useDictionary';
import DictionaryModal from '../client/modal/DictionaryModal';

/**
 * Component hiển thị phần nội dung câu hỏi (số thứ tự, flag, content)
 */
const QuestionContent = ({ question, isFlagged, onToggleFlag, partNumber, showContent = true, disableDictionary = false }) => {
  const [isDictionaryModalOpen, setIsDictionaryModalOpen] = useState(false);
  const { selectedWord, iconPosition, showIcon, containerRef, handleDoubleClick, hideIcon } = useDictionary();
  const canFlag = partNumber >= 5 && partNumber <= 7;

  const handleDictionaryIconClick = () => {
    if (selectedWord) {
      setIsDictionaryModalOpen(true);
      hideIcon();
    }
  };

  return (
    <>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
            {question.position}
          </span>
          {canFlag && (
            <button
              onClick={() => onToggleFlag && onToggleFlag()}
              className={`p-1.5 rounded transition-colors ${
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
        </div>
        {showContent && question.content && (
          <div 
            ref={disableDictionary ? null : containerRef}
            className="flex-1 text-gray-800 text-base leading-relaxed relative"
            onDoubleClick={disableDictionary ? undefined : handleDoubleClick}
            style={{ userSelect: 'text' }}
          >
            {question.content}
            
            {/* Dictionary Icon */}
            {!disableDictionary && showIcon && (
              <button
                onClick={handleDictionaryIconClick}
                className="absolute z-10 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
                style={{
                  top: `${iconPosition.top}px`,
                  left: `${iconPosition.left}px`,
                }}
                title="Look up word in dictionary"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dictionary Modal */}
      {!disableDictionary && (
        <DictionaryModal
          open={isDictionaryModalOpen}
          onClose={() => setIsDictionaryModalOpen(false)}
          word={selectedWord}
        />
      )}
    </>
  );
};

export default QuestionContent;

