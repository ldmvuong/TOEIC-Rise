/**
 * Component audio player - ẩn đi, chỉ dùng để phát audio tự động
 */
const AudioPlayer = ({ audioUrl, groupId }) => {
  if (!audioUrl) return null;

  return (
    <audio
      id={`audio-${groupId}`}
      src={audioUrl}
      preload="auto"
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;

