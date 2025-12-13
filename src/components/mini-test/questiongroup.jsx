import MiniTestQuestion from './question';
import ImageDisplay from '../exam/ImageDisplay';
import PassageDisplay from '../exam/PassageDisplay';
import AudioPlayer from '../exam/AudioPlayer';
import MiniTestAudioPlayer from './AudioPlayer';

const MiniTestQuestionGroup = ({
    questionGroup,
    onQuestionChange,
    partNumber,
    flaggedQuestions = [],
    onToggleFlag,
    isListeningPart = false,
    showAudioControl = false,
    onAudioToggle,
    isAudioPlaying = false,
    answers = {} // { questionId: selectedOptionIndex }
}) => {
    const { audioUrl, imageUrl, passage, questions = [] } = questionGroup || {};

    // Flatten questions array if it's 2D
    const flatQuestions = Array.isArray(questions[0]) ? questions.flat() : questions;

    const handleQuestionChange = (updatedQuestion, questionIndex) => {
        if (onQuestionChange) {
            onQuestionChange(updatedQuestion, questionIndex);
        }
    };

    return (
        <div id={`question-group-${questionGroup?.id}`} className="question-group mb-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/* Audio Player (hidden) for audio element */}
            {audioUrl && <AudioPlayer audioUrl={audioUrl} groupId={questionGroup?.id} />}

            {/* Audio Control Panel for Listening Parts */}
            {isListeningPart && audioUrl && showAudioControl && (
                <MiniTestAudioPlayer
                    audioUrl={audioUrl}
                    groupId={questionGroup.id}
                    onToggle={() => onAudioToggle && onAudioToggle(questionGroup.id, audioUrl)}
                    isPlaying={isAudioPlaying}
                />
            )}

            {/* Image (cho phần nghe - hiển thị trước questions) */}
            {isListeningPart && imageUrl && (
                <div className="mb-4">
                    <ImageDisplay imageUrl={imageUrl} />
                </div>
            )}

            {/* Passage (cho Part 5) */}
            {!isListeningPart && passage && (
                <div className="mb-4">
                    <PassageDisplay passage={passage} />
                </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
                {flatQuestions.map((question, index) => {
                    const isFlagged = flaggedQuestions.includes(question.id);
                    const selectedOptionIndex = answers[question.id];
                    return (
                        <MiniTestQuestion
                            key={question.id}
                            question={question}
                            onChange={(updatedQuestion) => handleQuestionChange(updatedQuestion, index)}
                            isFlagged={isFlagged}
                            onToggleFlag={() => onToggleFlag && onToggleFlag(question.id)}
                            partNumber={partNumber}
                            selectedOptionIndex={selectedOptionIndex}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default MiniTestQuestionGroup;
