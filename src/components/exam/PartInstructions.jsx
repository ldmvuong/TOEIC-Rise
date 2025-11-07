import ListeningInstructions from './ListeningInstructions';
import ReadingInstructions from './ReadingInstructions';

/**
 * Component hiển thị hướng dẫn cho từng part (Part 1-7)
 * Tách riêng Listening và Reading instructions
 */
const PartInstructions = ({ partNumber, onContinue, isListeningPart = false }) => {
  // Lấy audio URL cho phần nghe
  const getAudioUrl = () => {
    switch (partNumber) {
      case 1:
        return 'https://zenlishtoeic.vn/wp-content/uploads/2022/08/DIRECTION-PART-1.mp3';
      case 2:
        return 'https://zenlishtoeic.vn/wp-content/uploads/2022/08/DIRECTION-PART-2.mp3';
      case 3:
        return 'https://zenlishtoeic.vn/wp-content/uploads/2022/08/DIRECTION-PART-3.mp3';
      case 4:
        return 'https://zenlishtoeic.vn/wp-content/uploads/2022/08/DIRECTION-PART-4.mp3';
      default:
        return null;
    }
  };

  // Hiển thị Listening Instructions cho Part 1-4
  if (isListeningPart && partNumber >= 1 && partNumber <= 4) {
    return (
      <ListeningInstructions
        partNumber={partNumber}
        onContinue={onContinue}
        audioUrl={getAudioUrl()}
      />
    );
  }

  // Hiển thị Reading Instructions cho Part 5-7
  if (!isListeningPart && partNumber >= 5 && partNumber <= 7) {
    return (
      <ReadingInstructions
        partNumber={partNumber}
        onContinue={onContinue}
      />
    );
  }

  return null;
};

export default PartInstructions;

