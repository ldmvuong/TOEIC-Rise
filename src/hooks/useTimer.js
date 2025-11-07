import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';

/**
 * Custom hook để quản lý timer countdown
 * @param {number} initialTime - Thời gian ban đầu (giây)
 * @param {boolean} isActive - Timer có đang active không
 * @param {function} onTimeUp - Callback khi hết thời gian
 * @returns {object} - { timeRemaining, displayTime }
 */
export const useTimer = (initialTime = 0, isActive = true, onTimeUp = null) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [displayTime, setDisplayTime] = useState('00:00');
  const intervalRef = useRef(null);

  // Format thời gian
  useEffect(() => {
    if (timeRemaining <= 0) {
      setDisplayTime('00:00');
      return;
    }

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    if (hours > 0) {
      setDisplayTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    } else {
      setDisplayTime(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }
  }, [timeRemaining]);

  // Timer countdown
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (onTimeUp) {
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRemaining, isActive, onTimeUp]);

  // Reset timer
  const resetTimer = (newTime) => {
    setTimeRemaining(newTime);
  };

  return { timeRemaining, displayTime, resetTimer };
};

