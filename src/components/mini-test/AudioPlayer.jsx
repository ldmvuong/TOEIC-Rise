import { useState, useEffect, useRef } from 'react';

const MiniTestAudioPlayer = ({ audioUrl, groupId, onToggle, isPlaying }) => {
    const audioRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            if (!isDragging) {
                setCurrentTime(audio.currentTime);
            }
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setCurrentTime(0);
            if (onToggle) onToggle();
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        // Set playback rate
        audio.playbackRate = playbackRate;
        audio.volume = isMuted ? 0 : volume;

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioUrl, playbackRate, isDragging, onToggle, volume, isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Pause all other audios when this one starts playing
        if (isPlaying) {
            // Find all audio elements and pause others
            const allAudios = document.querySelectorAll('audio');
            allAudios.forEach(a => {
                if (a.id !== `audio-${groupId}` && !a.paused) {
                    a.pause();
                    // Trigger onToggle for other players to update their UI
                    const event = new CustomEvent('audioPaused', { detail: { groupId: a.id.replace('audio-', '') } });
                    window.dispatchEvent(event);
                }
            });
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    }, [isPlaying, groupId]);

    // Listen for pause events from other players
    useEffect(() => {
        const handleAudioPaused = (e) => {
            if (e.detail.groupId !== groupId.toString() && isPlaying) {
                // This audio was paused by another player
                if (onToggle) onToggle();
            }
        };
        window.addEventListener('audioPaused', handleAudioPaused);
        return () => window.removeEventListener('audioPaused', handleAudioPaused);
    }, [groupId, isPlaying, onToggle]);

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, percent * duration));
        
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handlePlaybackRateChange = (rate) => {
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="mb-4">
            <audio
                ref={audioRef}
                id={`audio-${groupId}`}
                src={audioUrl}
                preload="metadata"
            />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={onToggle}
                    className="flex-shrink-0 p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                {/* Current Time */}
                <span className="text-sm text-gray-700 font-medium flex-shrink-0 w-12">
                    {formatTime(currentTime)}
                </span>

                {/* Progress Bar */}
                <div
                    className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer relative group"
                    onClick={handleSeek}
                >
                    <div
                        className="absolute top-0 left-0 h-full bg-gray-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${progress}% - 6px)` }}
                    />
                </div>

                {/* Total Duration */}
                <span className="text-sm text-gray-700 font-medium flex-shrink-0 w-12">
                    {formatTime(duration)}
                </span>

                {/* Volume Control */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleMuteToggle}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                    >
                        {isMuted || volume === 0 ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #6b7280 0%, #6b7280 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
                        }}
                    />
                </div>

                {/* Settings (Speed) Button */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Tốc độ phát"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* Speed Menu Dropdown */}
                    {showSpeedMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowSpeedMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => handlePlaybackRateChange(rate)}
                                        className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                                            playbackRate === rate ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                                        }`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MiniTestAudioPlayer;
