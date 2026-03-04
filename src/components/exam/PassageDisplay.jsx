import { useState } from 'react';
import parse from 'html-react-parser';
import useDictionary from '../../hooks/useDictionary';
import DictionaryModal from '../client/modal/DictionaryModal';
import AddToFlashcardModal from '../client/modal/AddToFlashcardModal';

/**
 * Component hiển thị passage (đoạn văn)
 */
const PassageDisplay = ({ passage, disableDictionary = false }) => {
  const [isDictionaryModalOpen, setIsDictionaryModalOpen] = useState(false);
  const [isAddToFlashcardOpen, setIsAddToFlashcardOpen] = useState(false);
  const { selectedWord, iconPosition, showIcon, containerRef, handleDoubleClick, hideIcon } = useDictionary();

  if (!passage) return null;

  const handleDictionaryIconClick = () => {
    if (selectedWord) {
      setIsDictionaryModalOpen(true);
      hideIcon();
    }
  };

  const handleAddToFlashcardClick = () => {
    if (selectedWord) {
      setIsAddToFlashcardOpen(true);
      hideIcon();
    }
  };

  // If dictionary is disabled, render without dictionary functionality
  if (disableDictionary) {
    return (
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-800 text-sm leading-relaxed">
          {parse(passage)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={containerRef}
        className="mb-6 p-4 bg-white rounded-lg border border-gray-200 relative"
        onDoubleClick={handleDoubleClick}
        style={{ userSelect: 'text' }}
      >
        <div className="text-gray-800 text-sm leading-relaxed">
          {parse(passage)}
        </div>
        
        {/* Dictionary & Add-to-Flashcard Icons */}
        {showIcon && (
          <div
            className="absolute z-10 flex gap-1"
            style={{
              top: `${iconPosition.top}px`,
              left: `${iconPosition.left}px`,
            }}
          >
            <button
              onClick={handleDictionaryIconClick}
              className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
              title="Tra cứu từ điển"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleAddToFlashcardClick}
              className="w-6 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
              title="Thêm vào flashcard"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10.5A1.5 1.5 0 003.5 17h9.879a2 2 0 001.414-.586l2.121-2.121A2 2 0 0018.5 12.88V5a2 2 0 00-2-2H4z" />
                <path d="M10 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V8a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Dictionary Modal */}
      <DictionaryModal
        open={isDictionaryModalOpen}
        onClose={() => setIsDictionaryModalOpen(false)}
        word={selectedWord}
      />

      {/* Add to Flashcard Modal */}
      <AddToFlashcardModal
        open={isAddToFlashcardOpen}
        onClose={() => setIsAddToFlashcardOpen(false)}
        word={selectedWord}
      />
    </>
  );
};

export default PassageDisplay;

