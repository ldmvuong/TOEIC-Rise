import { useState } from 'react';
import useDictionary from '../../hooks/useDictionary';
import DictionaryModal from '../client/modal/DictionaryModal';

/**
 * Reusable component that wraps text content with dictionary functionality
 * @param {string} children - The text content to display
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles
 * @param {boolean} disableDictionary - If true, disables dictionary functionality
 */
const DictionaryText = ({ children, className = '', style = {}, disableDictionary = false }) => {
  const [isDictionaryModalOpen, setIsDictionaryModalOpen] = useState(false);
  const { selectedWord, iconPosition, showIcon, containerRef, handleDoubleClick, hideIcon } = useDictionary();

  const handleDictionaryIconClick = () => {
    if (selectedWord) {
      setIsDictionaryModalOpen(true);
      hideIcon();
    }
  };

  if (!children) return null;

  // If dictionary is disabled, just render children without dictionary functionality
  if (disableDictionary) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative ${className}`}
        style={{ userSelect: 'text', ...style }}
        onDoubleClick={handleDoubleClick}
      >
        {children}
        
        {/* Dictionary Icon */}
        {showIcon && (
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

      {/* Dictionary Modal */}
      <DictionaryModal
        open={isDictionaryModalOpen}
        onClose={() => setIsDictionaryModalOpen(false)}
        word={selectedWord}
      />
    </>
  );
};

export default DictionaryText;
