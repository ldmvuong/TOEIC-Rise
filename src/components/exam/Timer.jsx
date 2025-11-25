/**
 * Component hiển thị timer - thời gian làm bài và thời gian còn lại
 */
const Timer = ({ elapsedTime, remainingTime, showElapsedTime = true }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
      {/* Thời gian làm bài - chỉ hiển thị khi không giới hạn thời gian */}
      {showElapsedTime && (
        <div>
          <div className="text-xs text-gray-600 mb-1">Thời gian làm bài:</div>
          <div className="text-2xl font-bold text-gray-900">{elapsedTime}</div>
        </div>
      )}
      
      {/* Thời gian còn lại - chỉ hiển thị khi có giới hạn */}
      {remainingTime !== null && (
        <div>
          <div className="text-xs text-gray-600 mb-1">Thời gian còn lại:</div>
          <div className="text-2xl font-bold text-blue-600">{remainingTime}</div>
        </div>
      )}
    </div>
  );
};

export default Timer;

