import { useState, useEffect, useRef } from 'react';
import { Modal, Spin, message } from 'antd';

/**
 * Modal component to display dictionary definition for a word
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {string} word - The word to look up
 */
const DictionaryModal = ({ open, onClose, word }) => {
    const [loading, setLoading] = useState(false);
    const [dictionaryData, setDictionaryData] = useState(null);
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (open && word) {
            fetchDictionaryData();
        } else {
            // Reset state when modal closes
            setDictionaryData(null);
            setError(null);
            setAudioUrl(null);
        }
    }, [open, word]);

    const fetchDictionaryData = async () => {
        if (!word) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase().trim())}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setError('Word not found in dictionary');
                } else {
                    setError('Failed to fetch dictionary data');
                }
                return;
            }

            const data = await response.json();
            
            // API returns an array, get the first entry
            if (Array.isArray(data) && data.length > 0) {
                setDictionaryData(data[0]);
                
                // Find audio URL from phonetics array
                const phoneticsWithAudio = data[0].phonetics?.find(p => p.audio);
                if (phoneticsWithAudio?.audio) {
                    // Handle relative URLs
                    const audio = phoneticsWithAudio.audio;
                    setAudioUrl(audio.startsWith('http') ? audio : `https:${audio}`);
                }
            } else {
                setError('No dictionary data found');
            }
        } catch (err) {
            console.error('Error fetching dictionary data:', err);
            setError('Failed to fetch dictionary data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const playAudio = () => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play().catch(err => {
                console.error('Error playing audio:', err);
                message.error('Failed to play audio');
            });
        }
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
            centered
            closable={true}
            title={
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Dictionary</span>
                </div>
            }
        >
            <div className="py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Spin size="large" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-2">{error}</div>
                        <div className="text-gray-500 text-sm">Word: "{word}"</div>
                    </div>
                ) : dictionaryData ? (
                    <div>
                        {/* Word and Phonetic */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {dictionaryData.word}
                                </h2>
                                {audioUrl && (
                                    <button
                                        onClick={playAudio}
                                        className="flex-shrink-0 w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors"
                                        title="Play pronunciation"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                    </button>
                                )}
                                <audio ref={audioRef} src={audioUrl} preload="none" />
                            </div>
                            {dictionaryData.phonetic && (
                                <div className="text-gray-600 text-lg">
                                    {dictionaryData.phonetic}
                                </div>
                            )}
                        </div>

                        {/* Meanings */}
                        {dictionaryData.meanings && dictionaryData.meanings.length > 0 && (
                            <div className="space-y-6">
                                {dictionaryData.meanings.map((meaning, index) => (
                                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                                        <div className="text-sm font-semibold text-blue-600 mb-3 uppercase">
                                            {meaning.partOfSpeech}
                                        </div>
                                        <div className="space-y-3">
                                            {meaning.definitions && meaning.definitions.length > 0 && (
                                                <ul className="list-none space-y-3">
                                                    {meaning.definitions.map((def, defIndex) => (
                                                        <li key={defIndex} className="text-gray-800">
                                                            <div className="mb-1">
                                                                <span className="text-gray-700">{def.definition}</span>
                                                            </div>
                                                            {def.example && (
                                                                <div className="text-gray-500 text-sm italic mt-1 pl-4 border-l-2 border-gray-200">
                                                                    "{def.example}"
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Origin */}
                        {dictionaryData.origin && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Origin: </span>
                                    {dictionaryData.origin}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default DictionaryModal;
