import { useEffect, useRef } from 'react';

/**
 * Custom hook để quản lý audio tự động phát cho Part 1-4
 * @param {object} currentGroup - QuestionGroup hiện tại
 * @param {number} volume - Volume (0-1)
 * @param {function} onEnded - Callback khi audio kết thúc
 */
export const useAudio = (currentGroup, volume = 1, onEnded = null) => {
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Effect để setup audio khi group thay đổi
  useEffect(() => {
    if (!currentGroup?.audioUrl) return;

    let audioElement = null;
    let cleanup = null;

    const timer = setTimeout(() => {
      audioElement = document.getElementById(`audio-${currentGroup.id}`);
      if (!audioElement) return;

      audioRef.current = audioElement;
      audioElement.volume = volume;

      const playAudio = () => {
        // Chỉ reset về đầu khi bắt đầu phát audio mới
        if (!isPlayingRef.current) {
          audioElement.currentTime = 0;
          isPlayingRef.current = true;
        }
        audioElement.play().catch(() => {
          // Silent error handling
        });
      };

      const handleEnded = () => {
        isPlayingRef.current = false;
        if (onEnded) {
          onEnded();
        }
      };

      audioElement.addEventListener('ended', handleEnded);
      playAudio();

      cleanup = () => {
        if (audioElement) {
          audioElement.removeEventListener('ended', handleEnded);
          isPlayingRef.current = false;
        }
      };
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanup) {
        cleanup();
      }
      isPlayingRef.current = false;
    };
  }, [currentGroup?.id, currentGroup?.audioUrl, onEnded]);

  // Cập nhật volume riêng biệt - không reset audio
  useEffect(() => {
    if (audioRef.current) {
      // Chỉ cập nhật volume, không reset currentTime
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return audioRef;
};

