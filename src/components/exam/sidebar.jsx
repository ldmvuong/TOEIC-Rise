import { formatTime } from '../../utils/timeUtils';
import Timer from './Timer';
import VolumeControl from './VolumeControl';
import NavigationGrid from './NavigationGrid';

const Sidebar = ({
  timeRemaining = 0, // thời gian còn lại tính bằng giây
  elapsedTime = 0, // thời gian làm bài tính bằng giây
  hasTimeLimit = false, // có giới hạn thời gian không
  parts = [],
  currentQuestionGroupIndex = 0,
  currentPartIndex = 0,
  onNavigateToQuestion = () => {},
  onSubmit = () => {},
  volume = 1,
  onVolumeChange = () => {},
  canNavigate = true, // Part 1-4 không cho navigate
  flaggedQuestions = [],
  answers = {} // { questionId: selectedOptionIndex } - để biết câu nào đã làm
}) => {
  const displayRemainingTime = formatTime(timeRemaining);
  const displayElapsedTime = formatTime(elapsedTime);

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Timer - luôn hiển thị */}
        <Timer 
          elapsedTime={displayElapsedTime} 
          remainingTime={hasTimeLimit ? displayRemainingTime : null} 
        />

        {/* Volume Control */}
        <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors border border-blue-700"
        >
          NỘP BÀI
        </button>

        {/* Navigation Grid - luôn hiển thị */}
        <NavigationGrid
          parts={parts}
          currentPartIndex={currentPartIndex}
          currentQuestionGroupIndex={currentQuestionGroupIndex}
          onNavigateToQuestion={onNavigateToQuestion}
          canNavigate={canNavigate}
          flaggedQuestions={flaggedQuestions}
          answers={answers}
        />
      </div>
    </div>
  );
};

export default Sidebar;