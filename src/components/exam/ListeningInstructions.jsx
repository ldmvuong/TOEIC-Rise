import { useEffect, useRef } from 'react';

/**
 * Component hiển thị hướng dẫn cho phần nghe (Part 1-4)
 */
const ListeningInstructions = ({ partNumber, onContinue, audioUrl }) => {
  const audioRef = useRef(null);

  const getInstructions = () => {
    switch (partNumber) {
      case 1:
        return {
          title: 'LISTENING TEST',
          partTitle: 'PART 1',
          generalInstructions: 'In the Listening test, you will be asked to demonstrate how well you understand spoken English. The entire Listening test will last approximately 45 minutes. There are four parts, and directions are given for each part. You must mark your answers on the separate answer sheet. Do not write your answers in your test book.',
          directions: 'Directions: For each question in this part, you will hear four statements about a picture in your test book. When you hear the statements, you must select the one statement that best describes what you see in the picture. Then find the number of the question on your answer sheet and mark your answer. The statements will not be printed in your test book and will be spoken only one time.',
          imageUrl: 'https://zenlishtoeic.vn/wp-content/uploads/2022/08/4.jpg'
        };
      case 2:
        return {
          title: 'PART 2',
          directions: 'Direction: You will hear a question or statement and three responses spoken in English. They will not be printed in your text book and will be spoken only one time. Select the best response to the question or statement and mark the letter (A), (B) or (C) on your answer sheet.'
        };
      case 3:
        return {
          title: 'PART 3',
          directions: 'Directions: You will hear some conversations between two or more people. You will be asked to answer three questions about what the speakers say in each conversation. Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. The conversations will not be printed in your test book and will be spoken only one time.'
        };
      case 4:
        return {
          title: 'PART 4',
          directions: 'Directions: You will hear some talks given by a single speaker. You will be asked to answer three questions about what the speaker says in each talk. Select the best response to each question and mark the letter (A), (B), (C), or (D) on your answer sheet. The talks will not be printed in your test book and will be spoken only one time.'
        };
      default:
        return null;
    }
  };

  const instructions = getInstructions();
  
  if (!instructions) return null;

  // Phát audio hướng dẫn cho phần nghe
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    
    let handleEnded = null;
    
    const timer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.volume = 1;
        
        // Khi audio hướng dẫn kết thúc, tự động chuyển sang question group
        handleEnded = () => {
          onContinue();
        };
        
        audioRef.current.addEventListener('ended', handleEnded);
        
        audioRef.current.play().catch(() => {
          // Silent error handling
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (audioRef.current && handleEnded) {
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [audioUrl, onContinue]);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg border-2 border-gray-300 p-6 shadow-lg my-4">
        {/* Audio player ẩn cho phần nghe */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            style={{ display: 'none' }}
          />
        )}

        <div className="mb-4">
          {/* Title - LISTENING TEST cho Part 1, PART X cho các part khác */}
          <h2 className={`${partNumber === 1 ? 'text-xl' : 'text-xl'} font-bold text-blue-700 mb-2`}>{instructions.title}</h2>
          
          {/* General instructions cho Part 1 - hiển thị sau title LISTENING TEST */}
          {instructions.generalInstructions && (
            <div className="mb-2">
              <p className="text-sm text-gray-700 leading-snug">
                {instructions.generalInstructions}
              </p>
            </div>
          )}

          {/* Part title cho Part 1 - hiển thị sau general instructions */}
          {instructions.partTitle && (
            <h3 className="text-lg font-bold text-blue-600 mb-1">{instructions.partTitle}:</h3>
          )}

          {/* Directions - hiển thị sau part title */}
          <div className="mb-3">
            <p className={`${partNumber === 1 ? 'text-sm' : 'text-sm'} text-gray-700 leading-snug`}>
              {instructions.directions}
            </p>
          </div>

          {/* Hình ảnh LISTENING TEST cho Part 1 - hiển thị sau directions */}
          {partNumber === 1 && instructions.imageUrl && (
            <div className="mt-2 flex justify-center mb-2">
              <img
                src={instructions.imageUrl}
                alt="LISTENING TEST"
                className="max-w-xs w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          )}

          {/* Đoạn text ví dụ cho Part 1 - hiển thị sau hình ảnh */}
          {partNumber === 1 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 leading-snug italic">
                Statement (C), "They're sitting at a table," is the best description of the picture, so you should select answer (C) and mark it on your answer sheet.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              // Dừng audio hướng dẫn nếu đang phát
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
              // Chuyển sang question group
              onContinue();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListeningInstructions;

