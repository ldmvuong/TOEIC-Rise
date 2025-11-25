/**
 * Component nút điều hướng Trước/Sau
 */
const NavigationButtons = ({
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="px-4 py-2 bg-white border border-gray-300 rounded-full min-w-[110px] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ← Trước
      </button>
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="px-4 py-2 bg-white border border-gray-300 rounded-full min-w-[110px] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Sau →
      </button>
    </div>
  );
};

export default NavigationButtons;

