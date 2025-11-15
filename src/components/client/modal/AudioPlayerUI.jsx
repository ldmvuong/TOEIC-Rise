import { useState, useRef, useEffect } from 'react';

/**
 * Visible audio player UI component with play/pause, progress bar, time display, and volume control
 */
const AudioPlayerUI = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Reset state when audioUrl changes
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        audio.volume = volume;

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, [audioUrl, volume]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
    };

    const handleProgressClick = (e) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * duration;
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (!audioUrl) return null;

    return (
        <div className="mb-4">
            <audio ref={audioRef} src={audioUrl} preload="metadata" key={audioUrl} />
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlayPause}
                    className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                    )}
                </button>

                {/* Progress Bar */}
                <div
                    className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative group"
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%', marginLeft: '-6px' }}
                    />
                </div>

                {/* Time Display */}
                <div className="flex-shrink-0 text-sm text-gray-600 min-w-[60px] text-right">
                    {formatTime(currentTime)}
                </div>

                {/* Volume Control */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800"
                    >
                        {volume === 0 ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    {showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Settings Icon (Placeholder) */}
                <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default AudioPlayerUI;

