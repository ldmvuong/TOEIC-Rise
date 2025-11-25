/**
 * Format thời gian từ giây sang MM:SS hoặc HH:MM:SS
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {string} - Thời gian đã format (MM:SS hoặc HH:MM:SS)
 */
export const formatTime = (seconds) => {
  if (seconds <= 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Chuyển đổi giây sang phút (làm tròn)
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {number} - Thời gian tính bằng phút (đã làm tròn)
 */
export const secondsToMinutes = (seconds) => {
  if (!seconds || seconds <= 0) return 0;
  return Math.round(Number(seconds) / 60);
};

