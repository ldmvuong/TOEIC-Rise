import { useState, useEffect, useRef } from 'react';
import { Modal, Spin, message } from 'antd';

const API_BASE_URL = 'https://dict.minhqnd.com';

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
            const params = new URLSearchParams({
                word: word.toLowerCase().trim(),
                lang : 'en',
            });
            
            const response = await fetch(
                `${API_BASE_URL}/api/v1/lookup?${params.toString()}`
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
            
            if (data.exists && data.results && data.results.length > 0) {
                setDictionaryData(data);
                
                // Get audio URL from the first result
                const firstResult = data.results[0];
                if (firstResult.audio) {
                    // Handle relative URLs
                    const audio = firstResult.audio;
                    setAudioUrl(audio.startsWith('http') ? audio : `${API_BASE_URL}${audio}`);
                }
            } else {
                setError('Word not found in dictionary');
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
                        {/* Word and Audio */}
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
                        </div>

                        {/* Results */}
                        {dictionaryData.results && dictionaryData.results.length > 0 && (
                            <div className="space-y-6">
                                {dictionaryData.results.map((result, resultIndex) => (
                                    <div key={resultIndex}>
                                        {/* Language and Pronunciations */}
                                        {result.lang_name && (
                                            <div className="mb-4">
                                                <div className="text-sm font-semibold text-blue-600 mb-2">
                                                    {result.lang_name}
                                                </div>
                                                {result.pronunciations && result.pronunciations.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {result.pronunciations.map((pron, pronIndex) => (
                                                            <span 
                                                                key={pronIndex}
                                                                className="text-gray-600 text-sm bg-gray-50 px-2 py-1 rounded"
                                                            >
                                                                {pron.ipa}
                                                                {pron.region && (
                                                                    <span className="text-gray-400 text-xs ml-1">
                                                                        ({pron.region})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Meanings grouped by part of speech */}
                                        {result.meanings && result.meanings.length > 0 && (
                                            <div className="space-y-6">
                                                {(() => {
                                                    // Group meanings by pos
                                                    const groupedByPos = result.meanings.reduce((acc, meaning) => {
                                                        const pos = meaning.pos || 'Khác';
                                                        if (!acc[pos]) {
                                                            acc[pos] = [];
                                                        }
                                                        acc[pos].push(meaning);
                                                        return acc;
                                                    }, {});

                                                    return Object.entries(groupedByPos).map(([pos, meanings]) => (
                                                        <div key={pos} className="border-l-4 border-blue-500 pl-4">
                                                            <div className="text-sm font-semibold text-blue-600 mb-3">
                                                                {pos}
                                                            </div>
                                                            <ul className="list-none space-y-3">
                                                                {meanings.map((meaning, meaningIndex) => (
                                                                    <li key={meaningIndex} className="text-gray-800">
                                                                        <div className="mb-1">
                                                                            <span className="text-gray-700">{meaning.definition}</span>
                                                                            {meaning.source && (
                                                                                <span className="text-gray-400 text-xs ml-2">
                                                                                    ({meaning.source})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {meaning.example && (
                                                                            <div className="text-gray-500 text-sm italic mt-1 pl-4 border-l-2 border-gray-200">
                                                                                "{meaning.example}"
                                                                            </div>
                                                                        )}
                                                                        {meaning.links && meaning.links.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                                {meaning.links.map((link, linkIndex) => (
                                                                                    <span
                                                                                        key={linkIndex}
                                                                                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                                                                    >
                                                                                        {link}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        )}

                                        {/* Relations (Synonyms/Antonyms) */}
                                        {result.relations && result.relations.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <div className="space-y-3">
                                                    {(() => {
                                                        // Group relations by relation_type
                                                        const groupedByType = result.relations.reduce((acc, relation) => {
                                                            const type = relation.relation_type || 'Khác';
                                                            if (!acc[type]) {
                                                                acc[type] = [];
                                                            }
                                                            acc[type].push(relation.related_word);
                                                            return acc;
                                                        }, {});

                                                        return Object.entries(groupedByType).map(([type, words]) => (
                                                            <div key={type}>
                                                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                                                    {type}:
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {words.map((word, wordIndex) => (
                                                                        <span
                                                                            key={wordIndex}
                                                                            className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 cursor-pointer"
                                                                        >
                                                                            {word}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default DictionaryModal;
