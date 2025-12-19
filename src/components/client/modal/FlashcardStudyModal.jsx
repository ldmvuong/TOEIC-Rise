import React, { useEffect, useState } from 'react';
import { callFetchFlashcardDetail } from '../../../api/api';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import './FlashcardStudy.css';

const FlashcardStudyModal = ({ isOpen, setIsOpen, flashcardId }) => {
    const [details, setDetails] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false); // Trạng thái mặt trước/sau
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && flashcardId) {
            fetchDetail();
        } else {
            // Reset state when modal closes
            setDetails(null);
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    }, [isOpen, flashcardId]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const res = await callFetchFlashcardDetail(flashcardId);
            if (res && res.data) {
                setDetails(res.data);
                setCurrentIndex(0);
                setIsFlipped(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < (details?.items?.length || 0) - 1) {
            setIsFlipped(false); // Reset về mặt trước
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    if (!isOpen) return null;

    const currentItem = details?.items?.[currentIndex];
    const totalItems = details?.items?.length || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Header Modal */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{details?.name || 'Flashcard'}</h2>
                        <span className="text-sm text-gray-500">
                            Thẻ {currentIndex + 1} / {totalItems}
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-2 hover:bg-gray-200 rounded-full transition"
                    >
                        <XMarkIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* Body - Nơi hiển thị thẻ */}
                <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 relative overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-gray-600">Đang tải...</p>
                        </div>
                    ) : currentItem ? (
                        // KHU VỰC THẺ FLIP
                        <div 
                            className="perspective-1000 w-full max-w-xl aspect-[3/2] cursor-pointer group"
                            onClick={handleFlip}
                        >
                            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d shadow-xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}>
                                
                                {/* Mặt trước (Front) */}
                                <div className="absolute inset-0 backface-hidden bg-white rounded-2xl flex flex-col items-center justify-center p-8 border-2 border-blue-100">
                                    <span className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-4">Từ vựng</span>
                                    <h3 className="text-4xl md:text-5xl font-bold text-gray-800 text-center mb-4">
                                        {currentItem?.vocabulary || currentItem?.word || "Word"}
                                    </h3>
                                    {/* Gợi ý click */}
                                    <div className="absolute bottom-4 text-xs text-gray-400">Chạm để lật</div>
                                </div>

                                {/* Mặt sau (Back) */}
                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-50 rounded-2xl flex flex-col items-center justify-center p-8 border-2 border-blue-200 overflow-y-auto">
                                    <span className="text-sm uppercase tracking-widest text-blue-400 font-semibold mb-2">Định nghĩa</span>
                                    <p className="text-xl md:text-2xl font-medium text-blue-900 text-center mb-4">
                                        {currentItem?.definition || "Definition"}
                                    </p>
                                    
                                    {currentItem?.pronunciation && (
                                        <div className="bg-white px-3 py-1 rounded-full text-sm text-gray-600 border border-gray-200 mb-4">
                                            /{currentItem?.pronunciation}/
                                        </div>
                                    )}

                                    {currentItem?.example && (
                                        <div className="mt-4 text-center px-4">
                                            <p className="text-sm font-semibold text-gray-500 mb-2">Ví dụ:</p>
                                            <p className="text-gray-700 italic">"{currentItem?.example}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Không có dữ liệu</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-6 bg-white border-t flex justify-center items-center gap-4 sm:gap-8 flex-shrink-0">
                    <button 
                        onClick={handlePrev} 
                        disabled={currentIndex === 0}
                        className="p-3 sm:p-4 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                    >
                        <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    {/* Nút lật thẻ */}
                    <button 
                        onClick={handleFlip}
                        disabled={!currentItem}
                        className="px-4 py-2 sm:px-8 sm:py-3 bg-blue-600 text-white rounded-full text-sm sm:text-base font-semibold shadow-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {isFlipped ? "Xem từ vựng" : "Xem nghĩa"}
                    </button>

                    <button 
                        onClick={handleNext}
                        disabled={currentIndex === (totalItems - 1)}
                        className="p-3 sm:p-4 rounded-full border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                    >
                        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlashcardStudyModal;
